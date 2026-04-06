import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lesson = await db.lesson.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, name: true, classId: true },
        },
        teacher: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    return NextResponse.json({ lesson });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, fileUrl, fileName } = body;

    const existing = await db.lesson.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const lesson = await db.lesson.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(fileName !== undefined && { fileName }),
      },
      include: {
        course: {
          select: { id: true, name: true, classId: true },
        },
        teacher: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return NextResponse.json({ lesson });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.lesson.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    await db.lesson.delete({ where: { id } });

    return NextResponse.json({ message: 'Lesson deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
