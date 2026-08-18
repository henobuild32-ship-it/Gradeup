import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';

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
        // Applique la nouvelle note
        await tx.grade.update({
          where: { id: existing.noteId },
          data: { score: existing.newValue, maxScore: existing.newMax },
        });
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

    return NextResponse.json({ noteModification: updated });
  } catch (error: unknown) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[PATCH /api/note-modifications/:id]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur serveur' }, { status: 500 });
  }
}