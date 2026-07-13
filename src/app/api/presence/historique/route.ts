import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/presence/historique?schoolId=xxx&userId=yyy&days=30&role=STUDENT&classId=yyy
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const daysStr = searchParams.get('days') || '30';
    const days = Math.min(parseInt(daysStr, 10) || 30, 90);

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId requis' }, { status: 400 });
    }

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const where: Record<string, unknown> = {
      schoolId,
      date: { gte: since },
    };
    if (userId) where.userId = userId;
    if (role) where.user = { role };

    const presences = await db.presence.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            role: true,
            photoUrl: true,
            classEnrollments: {
              select: { class: { select: { name: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Build daily aggregation for charts
    const dailyMap = new Map<string, { present: number; retard: number; justifie: number; absent: number }>();
    presences.forEach((p) => {
      const key = p.date.toISOString().split('T')[0];
      if (!dailyMap.has(key)) dailyMap.set(key, { present: 0, retard: 0, justifie: 0, absent: 0 });
      const d = dailyMap.get(key)!;
      if (p.statut === 'PRESENT') d.present++;
      else if (p.statut === 'RETARD') d.retard++;
      else if (p.statut === 'JUSTIFIE') d.justifie++;
    });
    const chartData = Array.from(dailyMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ presences, chartData, total: presences.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    console.error('[PRESENCE/HISTORIQUE]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/presence/historique — admin validates a justification
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { presenceId, adminId, statut } = body;

    if (!presenceId || !adminId) {
      return NextResponse.json({ error: 'presenceId et adminId requis' }, { status: 400 });
    }

    const updated = await db.presence.update({
      where: { id: presenceId },
      data: {
        statut: statut || 'JUSTIFIE',
        validePar: adminId,
      },
    });

    return NextResponse.json({ presence: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
