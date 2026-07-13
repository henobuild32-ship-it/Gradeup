/**
 * grade-sync.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Core synchronisation: whenever a teacher saves / updates / deletes a grade,
 * we call `syncStudentReport(...)` to recompute and upsert the corresponding
 * ReportCard for that student + trimester.
 *
 * The generated ReportCard is tagged with status = "auto_draft" so the
 * admin / titulaire can see it is pre-filled and only needs validation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db } from '@/lib/db';

export interface SyncResult {
  reportCardId: string;
  studentId: string;
  trimester: string;
  averageGrade: number;
  totalPointsObtained: number;
  totalPointsPossible: number;
  overallPercentage: number;
  courseCount: number;
}

/**
 * Recomputes and upserts the ReportCard for a given student + trimester.
 * Safe to call from both POST /api/grades and PUT /api/grades/[id].
 */
export async function syncStudentReport(
  schoolId: string,
  studentId: string,
  trimester: string
): Promise<SyncResult | null> {
  try {
    // ── 1. Fetch all grades for this student in this trimester/semester ──────────
    const grades = await db.grade.findMany({
      where: {
        schoolId,
        studentId,
        trimester: {
          in: trimester === '1'
            ? ['1', 'P1', 'P2', 'EX1']
            : trimester === '2'
            ? ['2', 'P3', 'P4', 'EX2']
            : [trimester]
        }
      },
      include: {
        course: {
          select: { id: true, name: true, maxScore: true, coefficient: true, classId: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (grades.length === 0) return null;

    // ── 2. Find the student's class ─────────────────────────────────────────
    const classId = grades[0]?.course?.classId;
    if (!classId) return null;

    // ── 3. Fetch student info ───────────────────────────────────────────────
    const student = await db.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        gender: true,
        birthDate: true,
        cardId: true,
        schoolId: true,
      },
    });
    if (!student) return null;

    // ── 4. Fetch school info ────────────────────────────────────────────────
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { name: true, province: true, city: true, commune: true, schoolCode: true },
    });

    // Group grades by course to support period-based calculations
    const courseGradesMap: Record<string, {
      course: any;
      p1?: number;
      p2?: number;
      ex1?: number;
      p3?: number;
      p4?: number;
      ex2?: number;
      otherScores: number[];
    }> = {};

    for (const g of grades) {
      if (!courseGradesMap[g.courseId]) {
        courseGradesMap[g.courseId] = {
          course: g.course,
          otherScores: [],
        };
      }
      const item = courseGradesMap[g.courseId];
      if (g.trimester === 'P1') item.p1 = g.score;
      else if (g.trimester === 'P2') item.p2 = g.score;
      else if (g.trimester === 'EX1') item.ex1 = g.score;
      else if (g.trimester === 'P3') item.p3 = g.score;
      else if (g.trimester === 'P4') item.p4 = g.score;
      else if (g.trimester === 'EX2') item.ex2 = g.score;
      else item.otherScores.push(g.score);
    }

    // ── 5. Compute totals using coefficient-weighted averages ───────────────
    let weightedSum = 0;
    let totalCoefficients = 0;
    let totalPointsObtained = 0;
    let totalPointsPossible = 0;

    const serializedGrades = Object.keys(courseGradesMap).map((courseId) => {
      const item = courseGradesMap[courseId];
      const coeff = item.course?.coefficient ?? 1;

      let scoreSum = 0;
      let maxScoreSum = 0;

      if (trimester === '1') {
        if (item.p1 !== undefined) { scoreSum += item.p1; maxScoreSum += 20; }
        if (item.p2 !== undefined) { scoreSum += item.p2; maxScoreSum += 20; }
        if (item.ex1 !== undefined) { scoreSum += item.ex1; maxScoreSum += 20; }
      } else {
        if (item.p3 !== undefined) { scoreSum += item.p3; maxScoreSum += 20; }
        if (item.p4 !== undefined) { scoreSum += item.p4; maxScoreSum += 20; }
        if (item.ex2 !== undefined) { scoreSum += item.ex2; maxScoreSum += 20; }
      }

      if (maxScoreSum === 0 && item.otherScores.length > 0) {
        scoreSum = item.otherScores.reduce((a, b) => a + b, 0);
        maxScoreSum = item.otherScores.length * 20;
      }

      const normalizedScore = maxScoreSum > 0 ? (scoreSum / maxScoreSum) * 20 : 0;
      const weightedScore = normalizedScore * coeff;

      weightedSum += weightedScore;
      totalCoefficients += coeff;
      totalPointsObtained += scoreSum;
      totalPointsPossible += maxScoreSum || 20;

      return {
        courseId,
        courseName: item.course?.name ?? 'Inconnu',
        coefficient: coeff,
        score: scoreSum,
        maxScore: maxScoreSum || 20,
        normalizedScore: Math.round(normalizedScore * 100) / 100,
        weightedScore: Math.round(weightedScore * 100) / 100,
        comment: '',
        updatedAt: new Date(),
      };
    });

    const averageGrade =
      totalCoefficients > 0
        ? Math.round((weightedSum / totalCoefficients) * 100) / 100
        : 0;

    const overallPercentage =
      totalPointsPossible > 0
        ? Math.round((totalPointsObtained / totalPointsPossible) * 10000) / 100
        : 0;

    // ── 6. Build mention ────────────────────────────────────────────────────
    const mention = getMention(averageGrade);

    // ── 7. Build bulletin rawRows ───────────────────────────────────────────
    const rawRows = Object.keys(courseGradesMap).map((courseId) => {
      const item = courseGradesMap[courseId];
      const coeff = item.course?.coefficient ?? 1;
      const maxTJ = Math.round((20 * coeff) * 0.25);
      const maxExam = 20 * coeff;

      return {
        id: courseId,
        name: item.course?.name ?? 'Inconnu',
        maxTJ1: maxTJ,
        maxTJ2: maxTJ,
        maxExam1: maxExam,
        maxTJ3: maxTJ,
        maxTJ4: maxTJ,
        maxExam2: maxExam,
        tj1: item.p1 !== undefined ? String(item.p1) : '',
        tj2: item.p2 !== undefined ? String(item.p2) : '',
        exam1: item.ex1 !== undefined ? String(item.ex1) : '',
        tj3: item.p3 !== undefined ? String(item.p3) : '',
        tj4: item.p4 !== undefined ? String(item.p4) : '',
        exam2: item.ex2 !== undefined ? String(item.ex2) : '',
        repechagePercent: '',
        repechageSign: '',
      };
    });

    // ── 8. Build full gradesData payload ────────────────────────────────────
    const gradesData = {
      autoSynced: true,
      lastSyncedAt: new Date().toISOString(),
      serializedGrades,
      rawRows,
      metadata: {
        schoolName: school?.name ?? '',
        province: school?.province ?? 'KINSHASA',
        city: school?.city ?? 'KINSHASA',
        commune: school?.commune ?? 'GOMBE',
        schoolCode: school?.schoolCode ?? '00000000',
        studentName: student.fullName ?? '',
        studentGender: student.gender ?? 'M',
        studentBirthDate: student.birthDate ?? '',
        permanentNumber: student.cardId ?? '',
        academicYear: '2025-2026',
        trimesterText:
          trimester === '1' ? '1er TRIMESTRE'
          : trimester === '2' ? '2e TRIMESTRE'
          : '3e TRIMESTRE',
        totalPointsObtained,
        totalPointsPossible,
        overallPercentage,
        placeInClass: '',
        effectif: '',
        conduite: 'A',
        application: 'A',
        decisionText: overallPercentage >= 50 ? 'PASSE' : 'DOUBLE',
      },
    };

    // ── 9. Upsert the ReportCard ────────────────────────────────────────────
    // Try to find an existing auto_draft or draft report for this student+trimester
    const existing = await db.reportCard.findFirst({
      where: {
        schoolId,
        studentId,
        trimester,
        status: { in: ['auto_draft', 'draft'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let reportCard;

    if (existing) {
      // Update existing draft with latest computed data
      reportCard = await db.reportCard.update({
        where: { id: existing.id },
        data: {
          classId,
          averageGrade,
          totalPointsObtained,
          totalPointsPossible,
          overallPercentage,
          mention,
          gradesData,
          studentName: student.fullName ?? '',
          studentGender: student.gender ?? 'M',
          studentBirthDate: student.birthDate ?? '',
          status: 'auto_draft',
        },
      });
    } else {
      // Create a new auto_draft report card
      const reportNumber = `AUTO-${schoolId.slice(0, 4).toUpperCase()}-${studentId.slice(0, 4).toUpperCase()}-T${trimester}-${Date.now()}`;

      reportCard = await db.reportCard.create({
        data: {
          reportNumber,
          schoolId,
          classId,
          studentId,
          trimester,
          academicYear: '2025-2026',
          studentName: student.fullName ?? '',
          studentGender: student.gender ?? 'M',
          studentBirthDate: student.birthDate ?? '',
          permanentNumber: student.cardId ?? '',
          totalPointsObtained,
          totalPointsPossible,
          overallPercentage,
          averageGrade,
          classRank: 0,
          mention,
          status: 'auto_draft',
          gradesData,
        },
      });
    }

    return {
      reportCardId: reportCard.id,
      studentId,
      trimester,
      averageGrade,
      totalPointsObtained,
      totalPointsPossible,
      overallPercentage,
      courseCount: grades.length,
    };
  } catch (err) {
    console.error('[grade-sync] syncStudentReport error:', err);
    return null;
  }
}

function getMention(avg: number): string {
  if (avg >= 16) return 'Félicitations';
  if (avg >= 14) return "Tableau d'honneur";
  if (avg >= 12) return 'Encouragements';
  if (avg >= 10) return 'Passable';
  return 'Insuffisant';
}
