import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const role = searchParams.get('role');
    const classId = searchParams.get('classId');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (role) {
      where.role = role;
    }

    if (classId) {
      where.classEnrollments = {
        some: { classId },
      };
    }

    const users = await db.user.findMany({
      where,
      include: {
        school: true,
        classEnrollments: {
          include: { class: true },
        },
        children: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolId, fullName, email, password, role, photoUrl, parentId, classId } = body;

    if (!schoolId || !fullName || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, fullName, password, role' },
        { status: 400 }
      );
    }

    const existing = await db.user.findFirst({
      where: { schoolId, fullName, role },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A user with name "${fullName}" and role "${role}" already exists in this school` },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        schoolId,
        fullName,
        email: email || '',
        password,
        role,
        photoUrl: photoUrl || '',
        parentId: parentId || null,
      },
      include: {
        school: true,
        classEnrollments: {
          include: { class: true },
        },
      },
    });

    if (classId && role === 'STUDENT') {
      await db.enrolledClass.create({
        data: {
          userId: user.id,
          classId,
        },
      });
    }

    const userWithEnrollments = await db.user.findUnique({
      where: { id: user.id },
      include: {
        school: true,
        classEnrollments: {
          include: { class: true },
        },
      },
    });

    return NextResponse.json({ user: userWithEnrollments }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
