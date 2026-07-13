import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/schedules?schoolId=...&classId=...&dayOfWeek=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const dayOfWeek = searchParams.get('dayOfWeek');
    const courseId = searchParams.get('courseId');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId requis' }, { status: 400 });
    }

    const where: any = { schoolId };
    if (courseId) where.courseId = courseId;
    if (dayOfWeek) where.dayOfWeek = parseInt(dayOfWeek);

    // If classId provided, filter by courses belonging to that class
    if (classId) {
      where.course = { classId };
    }

    const schedules = await db.courseSchedule.findMany({
      where,
      include: {
        course: {
          include: {
            teacher: { select: { id: true, fullName: true } },
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('[GET /api/schedules]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/schedules
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, schoolId, dayOfWeek, startTime, endTime, room, periodStart, periodEnd, exceptions } = body;

    if (!courseId || !schoolId || !dayOfWeek || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'courseId, schoolId, dayOfWeek, startTime et endTime sont requis' },
        { status: 400 }
      );
    }

    // Check that course belongs to the school
    const course = await db.course.findFirst({
      where: { id: courseId, schoolId },
    });

    if (!course) {
      return NextResponse.json({ error: 'Cours introuvable' }, { status: 404 });
    }

    const schedule = await db.courseSchedule.create({
      data: {
        courseId,
        schoolId,
        dayOfWeek: parseInt(String(dayOfWeek)),
        startTime,
        endTime,
        room: room || '',
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        exceptions: exceptions || '[]',
      },
      include: {
        course: {
          include: {
            teacher: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('[POST /api/schedules]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/schedules
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, courseId, dayOfWeek, startTime, endTime, room, periodStart, periodEnd, exceptions } = body;

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 });
    }

    const updated = await db.courseSchedule.update({
      where: { id },
      data: {
        ...(courseId !== undefined && { courseId }),
        ...(dayOfWeek !== undefined && { dayOfWeek: parseInt(String(dayOfWeek)) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(room !== undefined && { room: room || '' }),
        ...(periodStart !== undefined && { periodStart: periodStart ? new Date(periodStart) : null }),
        ...(periodEnd !== undefined && { periodEnd: periodEnd ? new Date(periodEnd) : null }),
        ...(exceptions !== undefined && { exceptions: exceptions || '[]' }),
      },
      include: {
        course: {
          include: {
            teacher: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PUT /api/schedules]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/schedules?id=...
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 });
    }

    await db.courseSchedule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/schedules]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
