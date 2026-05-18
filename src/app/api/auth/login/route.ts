import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode, fullName, password, email, isAdminLogin } = body;

    let user;
    let school;

    // ====== ADMIN LOGIN : par email de l'école + mot de passe ======
    if (isAdminLogin) {
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Veuillez remplir votre email et mot de passe.' },
          { status: 400 }
        );
      }

      // Chercher l'école par son email
      school = await db.school.findUnique({ where: { email } });
      if (!school) {
        return NextResponse.json(
          { error: 'Aucune école trouvée avec cet email.' },
          { status: 404 }
        );
      }

      // Vérifier le mot de passe de l'école
      if (school.password !== password) {
        return NextResponse.json(
          { error: 'Mot de passe incorrect.' },
          { status: 401 }
        );
      }

      // Trouver l'admin de cette école
      user = await db.user.findFirst({
        where: {
          schoolId: school.id,
          role: 'ADMIN',
        },
        include: {
          school: true,
          classEnrollments: { include: { class: true } },
          children: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Compte administrateur introuvable pour cette école.' },
          { status: 404 }
        );
      }

    // ====== USER LOGIN : par code école + nom + mot de passe ======
    } else {
      if (!inviteCode || !fullName || !password) {
        return NextResponse.json(
          { error: 'Veuillez remplir tous les champs.' },
          { status: 400 }
        );
      }

      // Trouver l'école par code d'invitation
      school = await db.school.findUnique({ where: { inviteCode: inviteCode.trim().toUpperCase() } });
      if (!school) {
        return NextResponse.json(
          { error: 'Code école invalide. Vérifiez le code fourni par votre administrateur.' },
          { status: 404 }
        );
      }

      // Trouver l'utilisateur : nom et mot de passe (insensible à la casse pour le nom)
      const allUsers = await db.user.findMany({
        where: {
          schoolId: school.id,
          password,
        },
        include: {
          school: true,
          classEnrollments: { include: { class: true } },
          children: true,
        },
      });

      // Comparer le nom complet de façon insensible à la casse (trim + lowercase)
      const normalizedInput = fullName.trim().toLowerCase();
      user = allUsers.find(
        (u) => u.fullName.trim().toLowerCase() === normalizedInput
      ) || null;

      if (!user) {
        return NextResponse.json(
          { error: 'Nom ou mot de passe incorrect.' },
          { status: 401 }
        );
      }
    }

    // Vérifier que le compte est actif
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
