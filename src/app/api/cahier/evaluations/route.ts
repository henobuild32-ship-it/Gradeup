import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';
import {
  recomputeStudentPeriodGrade,
  recomputeEvaluationGrades,
} from '@/lib/grade-service';

/**
 * GET /api/cahier/evaluations
 * Query params: schoolId, classId, courseId, period (optional)
 * Returns all students, evaluations, and marks for a class + course.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
    const auth = authenticateRequest(request);
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
    authenticateRequest(request);
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

const { schoolId, courseId, trimester } = evaluation;

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

    // ── Sync with Grade model + bulletins (single source of truth) ──
    for (const studentId of studentIds) {
      await recomputeStudentPeriodGrade({ schoolId, courseId, studentId, period: trimester });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/cahier/evaluations
 * Body: { evaluationId, title?, maxScore?, date? }
 * Edits the metadata of an evaluation column (title, max score, date) and
 * recomputes the affected grades + bulletins in real time.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    const body = await request.json();
    const { evaluationId, title, maxScore, date } = body;

    if (!evaluationId) {
      return NextResponse.json(
        { error: 'Missing required field: evaluationId' },
        { status: 400 }
      );
    }

    const evaluation = await db.cahierEvaluation.findUnique({
      where: { id: evaluationId },
    });
    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    // Only the course teacher or an admin may edit the evaluation.
    if (auth.role !== 'ADMIN') {
      const course = await db.course.findUnique({
        where: { id: evaluation.courseId },
        select: { teacherId: true },
      });
      if (!course || course.teacherId !== auth.userId) {
        return NextResponse.json(
          { error: 'Vous n\'êtes pas autorisé à modifier cette évaluation' },
          { status: 403 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (typeof title === 'string' && title.trim()) data.title = title.trim();
    if (maxScore !== undefined && maxScore !== '') {
      const parsed = parseFloat(maxScore);
      if (isNaN(parsed) || parsed <= 0) {
        return NextResponse.json({ error: 'Note maximale invalide' }, { status: 400 });
      }
      data.maxScore = parsed;
    }
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) data.date = parsedDate;
    }

    const updated = await db.cahierEvaluation.update({
      where: { id: evaluationId },
      data,
    });

    // Recompute grades & bulletins since maxScore / period may have changed.
    await recomputeEvaluationGrades(updated);

    return NextResponse.json({ evaluation: updated });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
    authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const evaluationId = searchParams.get('evaluationId');

    if (!evaluationId) {
      return NextResponse.json({ error: 'evaluationId is required' }, { status: 400 });
    }

    const evaluation = await db.cahierEvaluation.findUnique({
      where: { id: evaluationId },
    });
    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    await db.cahierEvaluation.delete({
      where: { id: evaluationId },
    });

    // Recompute grades & bulletins so deleted marks are reflected instantly.
    await recomputeEvaluationGrades(evaluation);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
