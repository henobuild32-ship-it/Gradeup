import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { score, maxScore, trimester, comment } = body;

    const existing = await db.grade.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Grade not found' }, { status: 404 });
    }

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

    return NextResponse.json({ grade });
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

    const existing = await db.grade.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Grade not found' }, { status: 404 });
    }

    await db.grade.delete({ where: { id } });

    return NextResponse.json({ message: 'Grade deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
