import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const course = await db.courseWithPoints.update({
      where: { id },
      data: body
    });
    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error updating course with points:', error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.courseWithPoints.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course with points:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}