import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const courseId = searchParams.get('courseId');
    const teacherId = searchParams.get('teacherId');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (courseId) {
      where.courseId = courseId;
    }

    if (teacherId) {
      where.teacherId = teacherId;
    }

    const homework = await db.homework.findMany({
      where,
      include: {
        course: {
          select: { id: true, name: true },
        },
        teacher: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ homework });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolId, courseId, teacherId, title, description, dueDate } = body;

    if (!schoolId || !courseId || !teacherId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, courseId, teacherId, title' },
        { status: 400 }
      );
    }

    const homework = await db.homework.create({
      data: {
        schoolId,
        courseId,
        teacherId,
        title,
        description: description || '',
        dueDate: dueDate || '',
      },
      include: {
        course: {
          select: { id: true, name: true },
        },
        teacher: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return NextResponse.json({ homework }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
