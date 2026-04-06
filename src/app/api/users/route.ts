import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function generateParentCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'P-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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

    let parentCodeVal = await generateParentCode();
    while (await db.user.findUnique({ where: { parentCode: parentCodeVal } })) {
      parentCodeVal = generateParentCode();
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
        parentCode: parentCodeVal,
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

// PATCH: Toggle user active status or update user info
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, active, fullName, email } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId requis.' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (active !== undefined) updateData.active = active;
    if (fullName) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        school: true,
        classEnrollments: { include: { class: true } },
        children: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Remove a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId requis.' }, { status: 400 });
    }

    // Check if user has children (parent)
    const children = await db.user.findMany({ where: { parentId: userId } });
    if (children.length > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un utilisateur lié à d\'autres comptes.' },
        { status: 400 }
      );
    }

    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
