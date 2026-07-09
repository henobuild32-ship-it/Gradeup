import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const studentId = searchParams.get('studentId');

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;

    const reportCards = await db.reportCard.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, photoUrl: true } },
        class: { select: { id: true, name: true, level: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reportCards });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportNumber, schoolId, classId, studentId, teacherId, trimester, academicYear,
      studentName, studentGender, studentBirthDate, totalPointsObtained, totalPointsPossible,
      overallPercentage, averageGrade, classRank, mention, gradesData } = body;

    const reportCard = await db.reportCard.create({
      data: {
        reportNumber,
        schoolId,
        classId,
        studentId,
        teacherId: teacherId || null,
        trimester,
        academicYear: academicYear || '2025-2026',
        studentName,
        studentGender,
        studentBirthDate,
        totalPointsObtained,
        totalPointsPossible,
        overallPercentage,
        averageGrade,
        classRank,
        mention,
        status: 'draft',
        gradesData,
      },
    });
    return NextResponse.json({ reportCard });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, teacherId, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { ...data };
    if (status) updateData.status = status;

    const reportCard = await db.reportCard.update({
      where: { id },
      data: updateData,
    });

    if (status === 'pending_admin' && teacherId) {
      const report = await db.reportCard.findUnique({
        where: { id },
        select: { schoolId: true, student: { select: { id: true } } },
      });
      if (report) {
        await db.notification.create({
          data: {
            schoolId: report.schoolId,
            title: 'Bulletin transmis par un professeur',
            message: `Un bulletin a été créé et transmis pour validation.`,
            type: 'report',
            senderId: teacherId,
          },
        });
      }
    }

    return NextResponse.json({ reportCard });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await db.reportCard.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}