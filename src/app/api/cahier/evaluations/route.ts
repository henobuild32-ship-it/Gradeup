import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/cahier/evaluations
 * Query params: schoolId, classId, courseId, period (optional)
 * Returns all students, evaluations, and marks for a class + course.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const courseId = searchParams.get('courseId');
    const period = searchParams.get('period'); // "P1" | "P2" | "EX1" | "P3" | "P4" | "EX2" (optional)

    if (!schoolId || !classId || !courseId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: schoolId, classId, courseId' },
        { status: 400 }
      );
    }

    // 1. Fetch all students enrolled in the class
    const enrollments = await db.enrolledClass.findMany({
      where: { classId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            postName: true,
            gender: true,
          },
        },
      },
    });

    const students = enrollments
      .map((e) => e.user)
      .filter((u) => u !== null);

    // 2. Fetch all evaluations for this course (optionally filtered by period)
    const evaluationWhere: Record<string, unknown> = { schoolId, classId, courseId };
    if (period) {
      evaluationWhere.trimester = period;
    }

    const evaluations = await db.cahierEvaluation.findMany({
      where: evaluationWhere,
      include: {
        marks: true,
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({
      students,
      evaluations,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/cahier/evaluations
 * Body: { schoolId, classId, courseId, title, maxScore, period, date }
 * Creates a new evaluation column in the cahier.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolId, classId, courseId, title, maxScore, period, date, teacherId } = body;

    if (!schoolId || !classId || !courseId || !title || !period || !teacherId) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, classId, courseId, title, period, teacherId' },
        { status: 400 }
      );
    }

    const evaluation = await db.cahierEvaluation.create({
      data: {
        schoolId,
        classId,
        courseId,
        title,
        maxScore: maxScore ? parseFloat(maxScore) : 20,
        trimester: period,
        teacherId,
        date: date ? new Date(date) : new Date(),
      },
    });

    // Fetch all students in class to initialize empty marks for them
    const enrollments = await db.enrolledClass.findMany({
      where: { classId },
      select: { userId: true },
    });

    if (enrollments.length > 0) {
      await db.cahierMark.createMany({
        data: enrollments.map((e) => ({
          evaluationId: evaluation.id,
          studentId: e.userId,
          score: 0,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ evaluation }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT /api/cahier/evaluations
 * Body: { evaluationId, marks: { [studentId]: score } }
 * Updates the marks for a specific evaluation column, and recalculates the average period Grade.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { evaluationId, marks } = body;

    if (!evaluationId || !marks) {
      return NextResponse.json(
        { error: 'Missing required fields: evaluationId, marks' },
        { status: 400 }
      );
    }

    const evaluation = await db.cahierEvaluation.findUnique({
      where: { id: evaluationId },
    });

    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    const { schoolId, courseId, trimester, maxScore: evalMaxScore } = evaluation;

    // Fetch the teacher ID of the course to associate with the generated Grade records
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });

    const teacherId = course?.teacherId ?? '';

    // Update or create marks in transaction
    const studentIds = Object.keys(marks);
    await db.$transaction(
      studentIds.map((studentId) =>
        db.cahierMark.upsert({
          where: {
            evaluationId_studentId: {
              evaluationId,
              studentId,
            },
          },
          update: {
            score: parseFloat(marks[studentId]) || 0,
          },
          create: {
            evaluationId,
            studentId,
            score: parseFloat(marks[studentId]) || 0,
          },
        })
      )
    );

    // ── Synchronize with Grade model ──
    // For each student, recompute the overall score for this course & period (P1, P2, etc.)
    // In RDC, all evaluations (interrogations, TPs) in a period are averaged to form the period grade.
    // If the period is an Exam ("EX1", "EX2"), it's typically a single exam evaluation or an average.
    for (const studentId of studentIds) {
      // Get all evaluations in this period for the student & course
      const studentMarks = await db.cahierMark.findMany({
        where: {
          studentId,
          evaluation: {
            courseId,
            trimester,
          },
        },
        include: {
          evaluation: true,
        },
      });

      if (studentMarks.length > 0) {
        // Average normalized score out of 20
        let totalNormalizedScore = 0;
        let count = 0;

        for (const m of studentMarks) {
          const max = m.evaluation.maxScore > 0 ? m.evaluation.maxScore : 20;
          const normalized = (m.score / max) * 20;
          totalNormalizedScore += normalized;
          count++;
        }

        const averagePeriodScore = count > 0 ? totalNormalizedScore / count : 0;

        // Upsert standard Grade record
        // We use trimester = period (e.g. "P1", "P2", "EX1", etc.) so the existing bulletin sync processes it
        const existingGrade = await db.grade.findFirst({
          where: {
            schoolId,
            courseId,
            studentId,
trimester: trimester,
          },
        });

        if (existingGrade) {
          await db.grade.update({
            where: { id: existingGrade.id },
            data: {
              score: Math.round(averagePeriodScore * 10) / 10,
              maxScore: 20,
              teacherId,
            },
          });
        } else {
          await db.grade.create({
            data: {
              schoolId,
              courseId,
              studentId,
              teacherId,
              score: Math.round(averagePeriodScore * 10) / 10,
              maxScore: 20,
trimester: trimester,
              comment: `Moyenne automatique - ${trimester}`,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/cahier/evaluations
 * Body: { evaluationId }
 * Deletes an evaluation column from the cahier.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluationId = searchParams.get('evaluationId');

    if (!evaluationId) {
      return NextResponse.json({ error: 'evaluationId is required' }, { status: 400 });
    }

    await db.cahierEvaluation.delete({
      where: { id: evaluationId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
