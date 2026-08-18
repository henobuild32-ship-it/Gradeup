import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';
import { syncStudentReport } from '@/lib/grade-sync';
import { assertYearOpen } from '@/lib/year-status';
import { resolveClassCoefficients } from '@/lib/coefficient-resolver';

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
      } else if (auth.role === 'STUDENT' && studentId !== auth.userId) {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
      }
      where.studentId = studentId;
    } else if (auth.role === 'STUDENT') {
      where.studentId = auth.userId;
    }
    if (courseId) where.courseId = courseId;
    if (teacherId) where.teacherId = teacherId;
    if (trimester) {
      // A trimester includes its monthly periods (P1/P2/EX1, P3/P4/EX2), so a
      // student sees ALL their points for the selected trimester.
      where.trimester =
        trimester === '1'
          ? { in: ['1', 'P1', 'P2', 'EX1'] }
          : trimester === '2'
          ? { in: ['2', 'P3', 'P4', 'EX2'] }
          : trimester;
    }

    const grades = await db.grade.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, classId: true, coefficient: true } },
        student: { select: { id: true, fullName: true, role: true } },
        teacher: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: [{ courseId: 'asc' }, { createdAt: 'asc' }],
    });

    // Coefficients effectifs par classe (table Coefficient prioritaire)
    const byClass = new Map<string, Record<string, number>>();
    const coursesForClass = new Map<string, { id: string; coefficient: number }[]>();
    for (const g of grades) {
      const cid = g.course.classId || '';
      if (!cid) continue;
      if (!coursesForClass.has(cid)) coursesForClass.set(cid, []);
      coursesForClass.get(cid)!.push({ id: g.courseId, coefficient: g.course.coefficient });
    }
    for (const [cid, list] of coursesForClass) {
      const { byCourse } = await resolveClassCoefficients(schoolId, cid, list);
      byClass.set(cid, byCourse);
    }

    const enriched = grades.map((g) => ({
      ...g,
      effectiveCoefficient: (byClass.get(g.course.classId || '') || {})[g.courseId] ?? g.course.coefficient ?? 1,
    }));

    return NextResponse.json({ grades: enriched });
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

    try {
      await assertYearOpen(schoolId);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }

    const parsedScore = parseFloat(score);
    const parsedMax = maxScore ? parseFloat(maxScore) : 20;
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > parsedMax) {
      return NextResponse.json(
        { error: `La note doit être comprise entre 0 et ${parsedMax}` },
        { status: 400 }
      );
    }

    const grade = await db.grade.create({
      data: {
        schoolId,
        courseId,
        studentId,
        teacherId,
        score: parsedScore,
        maxScore: parsedMax,
        trimester: trimester || '1',
        comment: comment || '',
      },
      include: {
        course: { select: { id: true, name: true } },
        student: { select: { id: true, fullName: true, parentId: true } },
        teacher: { select: { id: true, fullName: true, role: true } },
      },
    });

    syncStudentReport(schoolId, studentId, trimester || '1').catch(() => {});

    // Trigger real-time and push notifications for student & parent
    try {
      const { notifyUser } = await import('@/services/notifications/notificationEngine');
      const courseName = grade.course?.name || 'Matière';
      const scoreStr = `${grade.score}/${grade.maxScore}`;

      // Notify Student
      notifyUser({
        schoolId,
        userId: studentId,
        senderId: teacherId,
        title: `📊 Nouvelle note : ${courseName}`,
        message: `Note obtenue : ${scoreStr} (Trimestre ${grade.trimester})${grade.comment ? ' — ' + grade.comment : ''}`,
        type: 'GRADE',
        priority: 'HIGH',
        metadata: { gradeId: grade.id, courseId },
      }).catch((e) => console.error('[Grade] Student notification error:', e));

      // Notify Parent
      if (grade.student?.parentId) {
        notifyUser({
          schoolId,
          userId: grade.student.parentId,
          senderId: teacherId,
          title: `📊 Note pour ${grade.student.fullName} (${courseName})`,
          message: `Note : ${scoreStr} (Trimestre ${grade.trimester})`,
          type: 'GRADE',
          priority: 'HIGH',
          metadata: { gradeId: grade.id, courseId },
        }).catch((e) => console.error('[Grade] Parent notification error:', e));
      }
    } catch (e) { console.error('[Grade] Notification setup error:', e); }

    return NextResponse.json({ grade }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
