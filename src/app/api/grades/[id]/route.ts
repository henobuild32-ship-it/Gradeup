import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';
import { syncStudentReport } from '@/lib/grade-sync';
import { assertYearOpen } from '@/lib/year-status';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    authenticateRequest(request);
    const { id } = await params;

    const grade = await db.grade.findUnique({
      where: { id },
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

    if (!grade) {
      return NextResponse.json({ error: 'Grade not found' }, { status: 404 });
    }

    return NextResponse.json({ grade });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticateRequest(request);
    const { id } = await params;
    const body = await request.json();
    const { score, maxScore, trimester, comment, reason } = body;
    const modifiedBy = (auth as { fullName?: string; userId: string }).fullName || auth.userId;

    const existing = await db.grade.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Grade not found' }, { status: 404 });
    }

    try {
      await assertYearOpen(existing.schoolId);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }

    const newScore = score !== undefined ? parseFloat(score) : existing.score;
    const newMax = maxScore !== undefined ? parseFloat(maxScore) : existing.maxScore;
    if (isNaN(newScore) || newScore < 0 || newScore > newMax) {
      return NextResponse.json(
        { error: `La note doit être comprise entre 0 et ${newMax}` },
        { status: 400 }
      );
    }

    const updatedTrimester = trimester !== undefined ? trimester : existing.trimester;

    const grade = await db.grade.update({
      where: { id },
      data: {
        ...(score !== undefined && { score: parseFloat(score) }),
        ...(maxScore !== undefined && { maxScore: parseFloat(maxScore) }),
        ...(trimester !== undefined && { trimester }),
        ...(comment !== undefined && { comment }),
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

    // Create audit history entry if score actually changed
    if (score !== undefined && parseFloat(score) !== existing.score && modifiedBy) {
      await db.gradeHistory.create({
        data: {
          gradeId: id,
          schoolId: existing.schoolId,
          oldScore: existing.score,
          newScore: parseFloat(score),
          modifiedBy,
          reason: reason || '',
        },
      });
    }

    // ── Auto-sync: recompute and update the student's report card ───────────
    syncStudentReport(existing.schoolId, existing.studentId, updatedTrimester).catch(() => {});

    return NextResponse.json({ grade });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticateRequest(request);
    const { id } = await params;

    const existing = await db.grade.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Grade not found' }, { status: 404 });
    }

    await db.grade.delete({ where: { id } });

    // ── Auto-sync after deletion: recompute bulletin without the deleted grade
    syncStudentReport(existing.schoolId, existing.studentId, existing.trimester).catch(() => {});

    return NextResponse.json({ message: 'Grade deleted successfully' });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
