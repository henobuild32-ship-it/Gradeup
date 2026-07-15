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

    return NextResponse.json({ success: true, count: results.length }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
