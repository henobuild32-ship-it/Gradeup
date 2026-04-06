import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const schoolClass = await db.schoolClass.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true,
            courses: true,
          },
        },
        enrollments: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!schoolClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json({ class: schoolClass });
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
    const { name, level, fees } = body;

    const existing = await db.schoolClass.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const schoolClass = await db.schoolClass.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(level !== undefined && { level }),
        ...(fees !== undefined && { fees }),
      },
      include: {
        _count: {
          select: {
            enrollments: true,
            courses: true,
          },
        },
      },
    });

    return NextResponse.json({ class: schoolClass });
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

    const existing = await db.schoolClass.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    await db.enrolledClass.deleteMany({ where: { classId: id } });
    await db.schoolClass.delete({ where: { id } });

    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
