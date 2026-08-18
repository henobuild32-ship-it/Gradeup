import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';
import { syncStudentReport } from '@/lib/grade-sync';
import {
  QUICK_EVALUATION_TITLE,
  isPeriodKey,
  recomputeStudentPeriodGrade,
  upsertCahierMark,
} from '@/lib/grade-service';

export const runtime = 'nodejs';

// PATCH /api/note-modifications/:id { action: "APPROVED" | "REJECTED", comment? }
// L'admin approuve ou rejette une demande de modification de note.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateRequest(req);
    const body = await req.json();
    const { action, comment } = body;

    if (auth.role !== 'ADMIN' && auth.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Seuls le directeur et les enseignants peuvent traiter les demandes.' }, { status: 403 });
    }
    if (action !== 'APPROVED' && action !== 'REJECTED') {
      return NextResponse.json({ error: 'action doit être APPROVED ou REJECTED.' }, { status: 400 });
    }

    const existing = await db.noteModification.findUnique({ where: { id } });
    if (!existing || existing.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Demande introuvable dans cette école.' }, { status: 404 });
    }
    if (existing.requestStatus !== 'PENDING') {
      return NextResponse.json({ error: 'Cette demande a déjà été traitée.' }, { status: 409 });
    }

    let periodGradeTouch: { schoolId: string; courseId: string; studentId: string; trimester: string } | null = null;

    const updated = await db.$transaction(async (tx) => {
      // Status
      const mod = await tx.noteModification.update({
        where: { id },
        data: { requestStatus: action === 'APPROVED' ? 'APPROVED' : 'REJECTED' },
      });

      if (action === 'APPROVED') {
        const grade = await tx.grade.findUnique({ where: { id: existing.noteId } });
        if (!grade || grade.deletedAt) {
          throw new Error('La note associée n’existe plus.');
        }

        const newScore = existing.newValue ?? existing.oldValue;
        const newMax = existing.newMax ?? existing.oldMax;

        if (isPeriodKey(grade.trimester)) {
          // Note de période (P1..EX2) : la source unique est le cahier — on met
          // à jour la cotation "Saisie rapide" (ou la note directement si la
          // colonne n'existe pas), puis la note dérivée est recalculée après la
          // transaction pour rester cohérente avec les autres cotations.
          const course = await tx.course.findUnique({
            where: { id: grade.courseId },
            select: { classId: true, teacherId: true },
          });
          const teacherId = course?.teacherId ?? grade.teacherId;
          if (course?.classId) {
            const quick = await tx.cahierEvaluation.findFirst({
              where: {
                schoolId: existing.schoolId,
                classId: course.classId,
                courseId: grade.courseId,
                teacherId,
                trimester: grade.trimester,
                title: QUICK_EVALUATION_TITLE,
                deletedAt: null,
              },
            });
            if (quick) {
              await tx.cahierMark.upsert({
                where: { evaluationId_studentId: { evaluationId: quick.id, studentId: grade.studentId } },
                update: { score: newScore },
                create: { evaluationId: quick.id, studentId: grade.studentId, score: newScore },
              });
              periodGradeTouch = {
                schoolId: existing.schoolId,
                courseId: grade.courseId,
                studentId: grade.studentId,
                trimester: grade.trimester,
              };
            } else {
              await tx.grade.update({
                where: { id: grade.id },
                data: { score: newScore, maxScore: newMax },
              });
            }
          } else {
            await tx.grade.update({
              where: { id: grade.id },
              data: { score: newScore, maxScore: newMax },
            });
          }
        } else {
          // Note trimestrielle classique (T1/T2/T3 sur la période '1'/'2'/'3')
          await tx.grade.update({
            where: { id: existing.noteId },
            data: { score: existing.newValue, maxScore: existing.newMax },
          });
        }

        // Trace dans l'historique
        await tx.gradeHistory.create({
          data: {
            gradeId: existing.noteId,
            schoolId: existing.schoolId,
            oldScore: existing.oldValue,
            newScore: existing.newValue,
            modifiedBy: auth.userId,
            reason: `Demande de modification validée : ${existing.reason}${comment ? ` (${comment})` : ''}`,
          },
        });
      }

      return mod;
    });

    // Recalcule la note de période et le bulletin après une correction validée.
    if (periodGradeTouch) {
      const { schoolId, courseId, studentId, trimester } = periodGradeTouch;
      await recomputeStudentPeriodGrade({ schoolId, courseId, studentId, period: trimester });
    } else if (action === 'APPROVED') {
      const trimester = (await db.grade.findUnique({
        where: { id: existing.noteId },
        select: { trimester: true },
      }))?.trimester;
      if (trimester) void syncStudentReport(existing.schoolId, existing.studentId, trimester);
    }

    return NextResponse.json({ noteModification: updated });
  } catch (error: unknown) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[PATCH /api/note-modifications/:id]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur serveur' }, { status: 500 });
  }
}