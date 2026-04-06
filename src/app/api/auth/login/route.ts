import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode, fullName, password } = body;

    if (!inviteCode || !fullName || !password) {
      return NextResponse.json(
        { error: 'Veuillez remplir tous les champs.' },
        { status: 400 }
      );
    }

    // Find school by invite code
    const school = await db.school.findUnique({ where: { inviteCode } });
    if (!school) {
      return NextResponse.json(
        { error: 'Code école invalide.' },
        { status: 404 }
      );
    }

    // Find user in this school by name and password (role auto-detected)
    const user = await db.user.findFirst({
      where: {
        fullName,
        schoolId: school.id,
        password,
      },
      include: {
        school: true,
        classEnrollments: {
          include: {
            class: true,
          },
        },
        children: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Identifiants incorrects. Vérifiez votre nom et mot de passe.' },
        { status: 401 }
      );
    }

    // Check if user account is active
    if (!user.active) {
      return NextResponse.json(
        { error: 'Votre compte a été désactivé. Contactez l\'administrateur.' },
        { status: 403 }
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
        parentCode: user.parentCode,
        active: user.active,
        school: {
          id: school.id,
          name: school.name,
          email: school.email,
          currency: school.currency,
          inviteCode: school.inviteCode,
        },
        classEnrollments: user.classEnrollments.map((e) => ({
          id: e.id,
          userId: e.userId,
          classId: e.classId,
          class: e.class,
        })),
        children: user.children.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          role: c.role,
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
