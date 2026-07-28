import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Route de diagnostic - accessible uniquement avec la clé secrète
// GET /api/admin/db-health?secret=<JWT_SECRET>
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.JWT_SECRET) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    // Compter les écoles et leurs statuts
    const schools = await db.school.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        inviteCode: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
        _count: { select: { users: true } },
      },
    });

    const now = new Date();
    const expiredByDate = schools.filter(
      s => s.subscriptionExpiry && new Date(s.subscriptionExpiry) < now && s.subscriptionStatus === 'active'
    );

    return NextResponse.json({
      totalSchools: schools.length,
      schools: schools.map(s => ({
        ...s,
        isExpiredByDate: s.subscriptionExpiry ? new Date(s.subscriptionExpiry) < now : false,
      })),
      expiredByDateCount: expiredByDate.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/db-health - Remet tous les abonnements à active
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.secret !== process.env.JWT_SECRET) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);

    // Réactiver tous les abonnements non-suspendus
    const result = await db.school.updateMany({
      where: {
        subscriptionStatus: { not: 'suspended' },
      },
      data: {
        subscriptionStatus: 'active',
        subscriptionExpiry: twoYearsFromNow,
      },
    });

    // Réactiver tous les comptes désactivés par accident
    const usersResult = await db.user.updateMany({
      where: { active: false },
      data: { active: true },
    });

    return NextResponse.json({
      success: true,
      schoolsFixed: result.count,
      usersReactivated: usersResult.count,
      newExpiry: twoYearsFromNow.toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
