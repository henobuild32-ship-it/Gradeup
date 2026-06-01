import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    const reportCards = await db.reportCard.findMany({
      where: schoolId ? { schoolId } : undefined,
    });

    return NextResponse.json({ reportCards });
  } catch (error) {
    console.error('Error fetching report cards:', error);
    return NextResponse.json({ error: 'Failed to fetch report cards' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reportCard = await db.reportCard.create({
      data: {
        reportNumber: body.reportNumber,
        schoolId: body.schoolId,
        classId: body.classId,
        studentId: body.studentId,
        trimester: body.trimester,
        academicYear: body.academicYear,
        studentName: body.studentName,
        studentGender: body.studentGender,
        studentBirthDate: body.studentBirthDate,
        studentPhotoUrl: body.studentPhotoUrl,
        permanentNumber: body.permanentNumber,
        totalPointsObtained: body.totalPointsObtained,
        totalPointsPossible: body.totalPointsPossible,
        overallPercentage: body.overallPercentage,
        averageGrade: body.averageGrade,
        classRank: body.classRank,
        mention: body.mention,
        gradesData: body.gradesData,
      }
    });
    return NextResponse.json({ reportCard });
  } catch (error) {
    console.error('Error creating report card:', error);
    return NextResponse.json({ error: 'Failed to create report card' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.reportCard.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting report card:', error);
    return NextResponse.json({ error: 'Failed to delete report card' }, { status: 500 });
  }
}