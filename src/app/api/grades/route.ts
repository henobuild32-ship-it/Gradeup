import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');
    const trimester = searchParams.get('trimester');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (studentId) {
      where.studentId = studentId;
    }

    if (courseId) {
      where.courseId = courseId;
    }

    if (trimester) {
      where.trimester = trimester;
    }

    const grades = await db.grade.findMany({
      where,
      include: {
        course: {
          select: { id: true, name: true },
        },
        student: {
          select: { id: true, fullName: true, role: true },
        },
        teacher: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ grades });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolId, courseId, studentId, teacherId, score, maxScore, trimester, comment } = body;

    if (!schoolId || !courseId || !studentId || !teacherId || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, courseId, studentId, teacherId, score' },
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
        course: {
          select: { id: true, name: true },
        },
        student: {
          select: { id: true, fullName: true, role: true },
        },
        teacher: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return NextResponse.json({ grade }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
