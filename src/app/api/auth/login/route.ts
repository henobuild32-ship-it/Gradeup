import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, schoolName, password, role } = body;

    if (!fullName || !schoolName || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName, schoolName, password, role' },
        { status: 400 }
      );
    }

    const school = await db.school.findFirst({ where: { name: schoolName } });
    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const user = await db.user.findFirst({
      where: {
        fullName,
        schoolId: school.id,
        password,
        role,
      },
      include: {
        school: true,
        classEnrollments: {
          include: {
            class: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please check your name, school, password, and role.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        schoolId: user.schoolId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        photoUrl: user.photoUrl,
        parentId: user.parentId,
        school: {
          id: school.id,
          name: school.name,
          email: school.email,
          currency: school.currency,
        },
        classEnrollments: user.classEnrollments.map((e) => ({
          id: e.id,
          userId: e.userId,
          classId: e.classId,
          class: e.class,
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
