import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { setAuthCookies, serializeUser } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/password';

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
      const normalizedSchoolEmail = email.trim().toLowerCase();
      school = await db.school.findFirst({
        where: { email: { equals: normalizedSchoolEmail, mode: 'insensitive' } },
      });
      if (!school) {
        return NextResponse.json(
          { error: 'Aucune école trouvée avec cet email.' },
          { status: 404 }
        );
      }

      // Vérifier le mot de passe de l'école
      if (!(await verifyPassword(password, school.password))) {
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
      if (!inviteCode || !password || (!email && !fullName)) {
        return NextResponse.json(
          { error: 'Veuillez remplir le code école, le mot de passe et au moins votre email ou votre nom complet.' },
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

      // Chercher un utilisateur par email si fourni
      if (email) {
        const normalizedEmail = email.trim().toLowerCase();
        const candidate = await db.user.findFirst({
          where: { schoolId: school.id, email: { equals: normalizedEmail, mode: 'insensitive' } },
          include: {
            school: true,
            classEnrollments: { include: { class: true } },
            children: true,
          },
        });
        if (candidate && (await verifyPassword(password, candidate.password))) {
          user = candidate;
        }
      }

      // Si l'email n'a pas permis de trouver l'utilisateur, on tente avec le nom complet
      if (!user && fullName) {
        const allUsers = await db.user.findMany({
          where: {
            schoolId: school.id,
          },
          include: {
            school: true,
            classEnrollments: { include: { class: true } },
            children: true,
          },
        });

        const normalizedInput = fullName.trim().toLowerCase();
        const candidates = allUsers.filter(
          (u) => u.fullName.trim().toLowerCase() === normalizedInput
        );

        for (const candidate of candidates) {
          if (await verifyPassword(password, candidate.password)) {
            user = candidate;
            break;
          }
        }
      }

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

    // Vérifier le statut d'abonnement de l'école (sauf pour l'admin, qui doit pouvoir se connecter)
    if (user.role !== 'ADMIN') {
      const status = school.subscriptionStatus;
      const expiry = school.subscriptionExpiry;
      if (status === 'suspended') {
        return NextResponse.json(
          { error: 'L\'accès à cet établissement est actuellement suspendu. Contactez votre administrateur.' },
          { status: 403 }
        );
      }
      if (status === 'expired' || (expiry && new Date(expiry) < new Date())) {
        return NextResponse.json(
          { error: 'L\'abonnement de cet établissement a expiré. Contactez votre administrateur.' },
          { status: 403 }
        );
      }
    }

    const response = NextResponse.json({
      user: serializeUser(user, user.school || school),
    });
    setAuthCookies(response, user, user.school || school);
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
