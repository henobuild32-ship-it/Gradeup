import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const classes = await db.schoolClass.findMany({
      where: { schoolId },
      include: {
        _count: { select: { enrollments: true } },
      },
      orderBy: { name: 'asc' },
    });

    if (classId) {
      const whereEnroll: Record<string, unknown> = { classId };
      if (teacherId) {
        const courses = await db.course.findMany({
          where: { schoolId, teacherId },
          select: { classId: true },
        });
        const teacherClassIds = [...new Set(courses.map((c) => c.classId))];
        if (!teacherClassIds.includes(classId)) {
          return NextResponse.json({ students: [], analysis: null });
        }
      }

      const enrolledStudents = await db.enrolledClass.findMany({
        where: { classId },
        include: {
          user: {
            include: {
              gradesStudent: {
                include: { course: { select: { name: true } } },
              },
              attendanceStudent: true,
            },
          },
        },
      });

      const allDetailedGrades = await db.detailedGrade.findMany({
        where: {
          studentId: { in: enrolledStudents.map((e) => e.userId) },
          schoolId,
        },
        include: { course: { select: { name: true, maxScore: true } } },
      });

      const students = enrolledStudents.map((enrolled) => {
        const student = enrolled.student;
        const grades = allDetailedGrades.filter((g) => g.studentId === student.id);
        const subjectAverages = new Map<string, { total: number; count: number; maxScore: number }>();
        grades.forEach((g) => {
          const name = g.course.name;
          const existing = subjectAverages.get(name) || { total: 0, count: 0, maxScore: g.course.maxScore };
          existing.total += g.total;
          existing.count += 1;
          if (g.course.maxScore > existing.maxScore) existing.maxScore = g.course.maxScore;
          subjectAverages.set(name, existing);
        });

        const subjectResults: { name: string; average: number; maxScore: number }[] = [];
        let totalScore = 0;
        let totalMax = 0;
        subjectAverages.forEach((val, name) => {
          const avg = val.count > 0 ? val.total / val.count : 0;
          totalScore += avg;
          totalMax += val.maxScore;
          subjectResults.push({ name, average: avg, maxScore: val.maxScore });
        });

        const overallAverage = totalMax > 0 ? (totalScore / subjectResults.length) * 20 : 0;

        const absences = student.attendanceStudent.filter((a) => a.status === 'absent');
        const justifiedAbsences = absences.filter((a) => a.reason && a.reason.length > 0);
        const unjustifiedAbsences = absences.filter((a) => !a.reason || a.reason.length === 0);

        let autoDecision: string;
        if (overallAverage >= 10 && unjustifiedAbsences.length <= 10) {
          autoDecision = 'passage';
        } else if (overallAverage < 9) {
          autoDecision = 'redoublement';
        } else {
          autoDecision = 'deliberation';
        }

        return {
          studentId: student.id,
          fullName: student.fullName,
          matricule: student.matricule,
          overallAverage: Math.round(overallAverage * 100) / 100,
          subjectResults,
          totalAbsences: absences.length,
          justifiedAbsences: justifiedAbsences.length,
          unjustifiedAbsences: unjustifiedAbsences.length,
          autoDecision,
          hasReportCard: false,
        };
      });

      return NextResponse.json({
        analysis: { classId, studentCount: students.length },
        students,
      });
    }

    const classAnalysis = await Promise.all(
      classes.map(async (cls) => {
        const enrollments = await db.enrolledClass.findMany({
          where: { classId: cls.id },
          include: { student: { select: { id: true } } },
        });
        const studentIds = enrollments.map((e) => e.student.id);

        const allGrades = await db.detailedGrade.findMany({
          where: { schoolId, studentId: { in: studentIds } },
        });

        let passages = 0;
        let redoublements = 0;
        let finsCursus = 0;
        let enAttente = 0;

        studentIds.forEach((sid) => {
          const sg = allGrades.filter((g) => g.studentId === sid);
          if (sg.length === 0) {
            enAttente++;
            return;
          }
          const avg = sg.reduce((s, g) => s + g.total, 0) / sg.length;
          const avg20 = (avg / 20) * 20;
          if (avg20 >= 10) passages++;
          else if (avg20 < 9) redoublements++;
          else enAttente++;
        });

        return {
          classId: cls.id,
          className: cls.name,
          totalStudents: studentIds.length,
          passages,
          redoublements,
          finsCursus,
          enAttente,
        };
      })
    );

    return NextResponse.json({
      classes: classAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, schoolId, adminId, classId, decisions, newAcademicYear } = body;

    if (!action || !schoolId || !adminId) {
      return NextResponse.json({ error: 'Missing fields: action, schoolId, adminId' }, { status: 400 });
    }

    if (action === 'lock-year') {
      await db.notification.create({
        data: {
          schoolId,
          title: 'Année scolaire verrouillée',
          message: `L'année scolaire a été verrouillée par l'administration.`,
          type: 'academic',
          senderId: adminId,
        },
      });
      return NextResponse.json({ success: true, message: 'Année verrouillée' });
    }

    if (action === 'generate-classes' && decisions && newAcademicYear && classId) {
      const currentClass = await db.schoolClass.findUnique({ where: { id: classId } });
      if (!currentClass) {
        return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 });
      }

      for (const decision of decisions) {
        if (decision.status === 'passage') {
          const nextLevel = getNextLevel(currentClass.level, currentClass.name);
          if (nextLevel) {
            let nextClass = await db.schoolClass.findFirst({
              where: { schoolId, name: nextLevel.name, level: nextLevel.level },
            });
            if (!nextClass) {
              nextClass = await db.schoolClass.create({
                data: { schoolId, name: nextLevel.name, level: nextLevel.level, fees: currentClass.fees },
              });
            }
            const existingEnroll = await db.enrolledClass.findUnique({
              where: { userId_classId: { userId: decision.studentId, classId: nextClass.id } },
            });
            if (!existingEnroll) {
              await db.enrolledClass.create({
                data: { userId: decision.studentId, classId: nextClass.id },
              });
            }
          }
        } else if (decision.status === 'redoublement') {
          const existingEnroll = await db.enrolledClass.findUnique({
            where: { userId_classId: { userId: decision.studentId, classId } },
          });
          if (!existingEnroll) {
            await db.enrolledClass.create({
              data: { userId: decision.studentId, classId },
            });
          }
        }
      }

      await db.notification.create({
        data: {
          schoolId,
          title: 'Classes générées pour la nouvelle année',
          message: `Les classes pour l'année ${newAcademicYear} ont été créées.`,
          type: 'academic',
          senderId: adminId,
        },
      });

      return NextResponse.json({ success: true, message: 'Classes générées avec succès' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getNextLevel(level: string, name: string): { name: string; level: string } | null {
  const levels = ['Maternelle', 'Primaire', 'Secondaire'];
  const currentIdx = levels.indexOf(level);
  if (currentIdx === -1 || currentIdx >= levels.length - 1) return null;
  if (level === 'Primaire') {
    const currentNum = parseInt(name.replace(/[^0-9]/g, '')) || 1;
    const nextNum = currentNum + 1;
    if (nextNum > 6) return { name: '1ère', level: 'Secondaire' };
    return { name: `${nextNum}ème`, level: 'Primaire' };
  }
  if (level === 'Secondaire') {
    const currentNum = parseInt(name.replace(/[^0-9]/g, '')) || 1;
    const nextNum = currentNum + 1;
    if (nextNum > 6) return null;
    const names: Record<number, string> = { 1: '7ème', 2: '8ème', 3: '1ère', 4: '2ème', 5: '3ème', 6: '4ème' };
    return { name: names[nextNum] || `${nextNum}ème`, level: 'Secondaire' };
  }
  return { name: '1ère', level: 'Primaire' };
}