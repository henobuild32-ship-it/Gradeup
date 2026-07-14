import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';
import { syncStudentReport } from '@/lib/grade-sync';

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');
    const trimester = searchParams.get('trimester');
    const teacherId = searchParams.get('teacherId');

    if (!schoolId || schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'schoolId invalide' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (studentId) {
      if (auth.role === 'PARENT') {
        const student = await db.user.findUnique({
          where: { id: studentId },
          select: { parentId: true, schoolId: true },
        });
        if (!student || student.parentId !== auth.userId || student.schoolId !== schoolId) {
          return NextResponse.json({ error: 'Vous ne pouvez consulter que les notes de vos enfants' }, { status: 403 });
        }
      }
      where.studentId = studentId;
    }
    if (courseId) where.courseId = courseId;
    if (trimester) where.trimester = trimester;
    if (teacherId) where.teacherId = teacherId;

    const grades = await db.grade.findMany({
      where,
      include: {
        course: { select: { id: true, name: true } },
        student: { select: { id: true, fullName: true, role: true } },
        teacher: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ grades });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (auth.role === 'PARENT') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId, courseId, studentId, teacherId, score, maxScore, trimester, comment } = body;

    if (!schoolId || !courseId || !studentId || !teacherId || score === undefined) {
      return NextResponse.json(
        { error: 'Champs requis manquants: schoolId, courseId, studentId, teacherId, score' },
        { status: 400 }
      );
    }

    const grade = await db.grade.create({
      data: {
        schoolId,
        courseId,
        studentId,
        teacherId,
        score: parseFloat(score),
        maxScore: maxScore ? parseFloat(maxScore) : 20,
        trimester: trimester || '1',
        comment: comment || '',
      },
      include: {
        course: { select: { id: true, name: true } },
        student: { select: { id: true, fullName: true, role: true } },
        teacher: { select: { id: true, fullName: true, role: true } },
      },
    });

    syncStudentReport(schoolId, studentId, trimester || '1').catch((err) => {
      console.error('[grade-sync] background sync error after POST /api/grades:', err);
    });

    return NextResponse.json({ grade }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
