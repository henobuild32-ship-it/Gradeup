import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

// GET /api/admin/fix-subscription - Remet les abonnements à "active" pour l'école de l'admin connecté
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const school = await db.school.findUnique({ where: { id: sessionUser.schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'École introuvable.' }, { status: 404 });
    }

    // Mettre à jour l'abonnement à active avec une expiration dans 2 ans
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);

    const updated = await db.school.update({
      where: { id: school.id },
      data: {
        subscriptionStatus: 'active',
        subscriptionExpiry: twoYearsFromNow,
      },
    });

    return NextResponse.json({
      success: true,
      school: { id: updated.id, name: updated.name, subscriptionStatus: updated.subscriptionStatus, subscriptionExpiry: updated.subscriptionExpiry },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Vérifie le statut de l'abonnement de toutes les écoles (admin système)
export async function GET(request: NextRequest) {
  try {
    const schools = await db.school.findMany({
      select: { id: true, name: true, subscriptionStatus: true, subscriptionExpiry: true, inviteCode: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ schools });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
