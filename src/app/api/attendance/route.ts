import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const date = searchParams.get('date');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (studentId) {
      where.studentId = studentId;
    }

    if (date) {
      where.date = date;
    }

    const attendance = await db.attendance.findMany({
      where,
      include: {
        student: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ attendance });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolId, studentId, teacherId, date, status, reason } = body;

    if (!schoolId || !studentId || !teacherId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, studentId, teacherId, date' },
        { status: 400 }
      );
    }

    const existing = await db.attendance.findUnique({
      where: {
        studentId_date: {
          studentId,
          date,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Attendance already recorded for this student on this date' },
        { status: 409 }
      );
    }

    const attendance = await db.attendance.create({
      data: {
        schoolId,
        studentId,
        teacherId,
        date,
        status: status || 'absent',
        reason: reason || '',
      },
      include: {
        student: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
