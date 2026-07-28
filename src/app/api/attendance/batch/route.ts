import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (auth.role === 'PARENT') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId, courseId, teacherId, date, records } = body;

    if (!schoolId || !teacherId || !date || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Champs requis manquants: schoolId, teacherId, date, records' },
        { status: 400 }
      );
    }

    const attCourseId = courseId || '';
    const results = await db.$transaction(
      records.map((record: { studentId: string; status: string; reason?: string }) =>
        db.attendance.upsert({
          where: {
            studentId_date_courseId: {
              studentId: record.studentId,
              date,
              courseId: attCourseId,
            },
          },
          update: {
            status: record.status || 'absent',
            reason: record.reason || '',
            teacherId,
          },
          create: {
            schoolId,
            studentId: record.studentId,
            teacherId,
            courseId: attCourseId,
            date,
            status: record.status || 'absent',
            reason: record.reason || '',
          },
        })
      )
    );

    // Trigger background notifications for absent or late students
    (async () => {
      try {
        const { notifyUser } = await import('@/services/notifications/notificationEngine');
        const absentOrLateRecords = records.filter(
          (r: any) => r.status === 'absent' || r.status === 'late'
        );

        if (absentOrLateRecords.length === 0) return;

        const studentIds = absentOrLateRecords.map((r: any) => r.studentId);
        const students = await db.user.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, fullName: true, parentId: true },
        });
        const studentMap = new Map(students.map((s) => [s.id, s]));

        for (const record of absentOrLateRecords) {
          const student = studentMap.get(record.studentId);
          const label = record.status === 'absent' ? 'Absence' : 'Retard';

          // Student
          notifyUser({
            schoolId,
            userId: record.studentId,
            senderId: teacherId,
            title: `⚠️ Notification : ${label}`,
            message: `Vous avez été marqué(e) ${record.status} le ${date}.`,
            type: 'ATTENDANCE',
            priority: 'HIGH',
            metadata: { date },
          }).catch(() => {});

          // Parent
          if (student?.parentId) {
            notifyUser({
              schoolId,
              userId: student.parentId,
              senderId: teacherId,
              title: `⚠️ ${label} de ${student.fullName}`,
              message: `${student.fullName} a été marqué(e) ${record.status} le ${date}.`,
              type: 'ATTENDANCE',
              priority: 'HIGH',
              metadata: { date },
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.error('[AttendanceBatch] Notification error:', e);
      }
    })();

    return NextResponse.json({ success: true, count: results.length }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
