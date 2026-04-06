import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, schoolName, email, password } = body;

    if (!fullName || !schoolName || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName, schoolName, email, password' },
        { status: 400 }
      );
    }

    const existingSchool = await db.school.findUnique({ where: { email } });
    if (existingSchool) {
      return NextResponse.json(
        { error: 'A school with this email already exists' },
        { status: 409 }
      );
    }

    const school = await db.school.create({
      data: {
        name: schoolName,
        email,
        password,
      },
    });

    const user = await db.user.create({
      data: {
        schoolId: school.id,
        fullName,
        email,
        password,
        role: 'ADMIN',
      },
      include: {
        school: true,
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          school: {
            id: school.id,
            name: school.name,
            email: school.email,
            currency: school.currency,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
