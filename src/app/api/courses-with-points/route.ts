import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const schoolId = searchParams.get('schoolId');
    
        const courses = await db.courseWithPoints.findMany({
      where: { classId: classId || undefined, schoolId: schoolId || undefined },
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Error fetching courses with points:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const course = await db.courseWithPoints.create({ data: body });
    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error creating course with points:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}