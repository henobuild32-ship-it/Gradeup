import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/presence/aujourdhui?schoolId=xxx&userId=yyy
// Returns today's presence for a specific user or all users in a school
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const userId = searchParams.get('userId');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId requis' }, { status: 400 });
    }

    // Start of today (UTC midnight)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);

    if (userId) {
      // Single user check
      const presence = await db.presence.findFirst({
        where: {
          schoolId,
          userId,
          date: { gte: today, lt: tomorrow },
        },
        include: {
          user: { select: { fullName: true, role: true, photoUrl: true } },
        },
      });

      return NextResponse.json({ presence });
    }

    // All users today (for admin dashboard)
    const presences = await db.presence.findMany({
      where: {
        schoolId,
        date: { gte: today, lt: tomorrow },
      },
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
      orderBy: { heureArrivee: 'asc' },
    });

    // Get total students and teachers for rate calculation
    const [totalStudents, totalTeachers] = await Promise.all([
      db.user.count({ where: { schoolId, role: 'STUDENT', active: true } }),
      db.user.count({ where: { schoolId, role: 'TEACHER', active: true } }),
    ]);

    const presents = presences.filter((p) => p.statut === 'PRESENT').length;
    const retards = presences.filter((p) => p.statut === 'RETARD').length;
    const justifies = presences.filter((p) => p.statut === 'JUSTIFIE').length;
    const total = totalStudents + totalTeachers;
    const absents = Math.max(0, total - presences.length);
    const tauxPresence = total > 0 ? Math.round(((presents + retards + justifies) / total) * 100) : 0;

    return NextResponse.json({
      presences,
      stats: {
        total,
        totalStudents,
        totalTeachers,
        presents,
        retards,
        justifies,
        absents,
        tauxPresence,
        date: today.toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    console.error('[PRESENCE/AUJOURDHUI]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
