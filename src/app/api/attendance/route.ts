import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const date = searchParams.get('date');
    const courseId = searchParams.get('courseId');

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
          return NextResponse.json({ error: 'Vous ne pouvez consulter que les absences de vos enfants' }, { status: 403 });
        }
      } else if (auth.role === 'STUDENT' && studentId !== auth.userId) {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
      }
      where.studentId = studentId;
    } else if (auth.role === 'STUDENT') {
      where.studentId = auth.userId;
    }
    if (date) where.date = date;
    if (courseId) where.courseId = courseId;

    const attendance = await db.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ attendance });
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
    const { schoolId, studentId, teacherId, courseId, date, status, reason } = body;

    if (!schoolId || !studentId || !teacherId || !date) {
      return NextResponse.json(
        { error: 'Champs requis manquants: schoolId, studentId, teacherId, date' },
        { status: 400 }
      );
    }

    const attCourseId = courseId || '';
    const existing = await db.attendance.findUnique({
      where: { studentId_date_courseId: { studentId, date, courseId: attCourseId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Présence déjà enregistrée pour cet étudiant à cette date' },
        { status: 409 }
      );
    }

    const attendance = await db.attendance.create({
      data: {
        schoolId,
        studentId,
        teacherId,
        courseId: attCourseId,
        date,
        status: status || 'absent',
        reason: reason || '',
      },
      include: {
        student: { select: { id: true, fullName: true, role: true } },
      },
    });

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
