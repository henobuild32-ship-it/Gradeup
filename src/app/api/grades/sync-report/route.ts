/**
 * POST /api/grades/sync-report
 * ─────────────────────────────────────────────────────────────────────────────
 * Manually trigger a bulk sync of all ReportCards for a given class + trimester
 * (or a single student if studentId is provided).
 *
 * Body: { schoolId, classId, trimester, studentId? }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncStudentReport, type SyncResult } from '@/lib/grade-sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolId, classId, trimester, studentId } = body;

    if (!schoolId || !trimester) {
      return NextResponse.json(
        { error: 'schoolId and trimester are required' },
        { status: 400 }
      );
    }

    // Determine which students to sync
    let studentIds: string[] = [];

    if (studentId) {
      // Single student
      studentIds = [studentId];
    } else if (classId) {
      // All students enrolled in a class
      const enrollments = await db.enrolledClass.findMany({
        where: { classId },
        select: { userId: true },
      });
      studentIds = enrollments.map((e) => e.userId);
    } else {
      // All students in the school that have grades for this trimester
      const grades = await db.grade.findMany({
        where: { schoolId, trimester },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      studentIds = grades.map((g) => g.studentId);
    }

    if (studentIds.length === 0) {
      return NextResponse.json({ message: 'No students found to sync', synced: 0 });
    }

    // Run all syncs in parallel (up to 20 at a time to avoid DB overload)
    const results: PromiseSettledResult<SyncResult | null>[] = [];
    const chunkSize = 20;

    for (let i = 0; i < studentIds.length; i += chunkSize) {
      const chunk = studentIds.slice(i, i + chunkSize);
      const chunkResults = await Promise.allSettled(
        chunk.map((sid) => syncStudentReport(schoolId, sid, trimester))
      );
      results.push(...chunkResults);
    }

    const succeeded = results.filter(
      (r): r is PromiseFulfilledResult<SyncResult | null> =>
        r.status === 'fulfilled' && r.value !== null
    ).length;
    const failed = results.length - succeeded;

    return NextResponse.json({
      message: `Synchronisation terminée : ${succeeded} bulletins mis à jour, ${failed} échecs.`,
      synced: succeeded,
      failed,
      total: studentIds.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/grades/sync-report?schoolId=...&studentId=...&trimester=...
 * Returns the current auto-synced report card for a student, if one exists.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const trimester = searchParams.get('trimester');
    const classId = searchParams.get('classId');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      schoolId,
      status: { in: ['auto_draft', 'draft', 'pending_admin', 'validated'] },
    };

    if (studentId) where.studentId = studentId;
    if (trimester) where.trimester = trimester;
    if (classId) where.classId = classId;

    const reportCards = await db.reportCard.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, photoUrl: true, gender: true } },
        class: { select: { id: true, name: true, level: true } },
      },
      orderBy: [{ trimester: 'asc' }, { studentName: 'asc' }],
    });

    return NextResponse.json({ reportCards });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
