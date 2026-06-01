import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId || schoolId === 'undefined' || schoolId === 'null') {
      return NextResponse.json({
        totalGenerated: 0,
        globalGenerated: 0,
        maxLimit: 1000000,
        remaining: 1000000,
        percentageUsed: 0,
        bySchool: {},
        byClass: {},
        byYear: {}
      });
    }

    const totalGenerated = await db.reportCard.count({
      where: { schoolId }
    });

    // Récupérer le compteur pour l'année en cours
    const currentYear = new Date().getFullYear();
    const counter = await db.reportCounter.findUnique({
      where: { year: currentYear }
    });

    const maxLimit = counter?.maxLimit ?? 1000000;
    const globalGenerated = counter?.currentCount ?? 0;
    const remaining = Math.max(0, maxLimit - globalGenerated);
    const percentageUsed = maxLimit > 0 ? (globalGenerated / maxLimit) * 100 : 0;

    // Stats par année scolaire
    const reportCards = await db.reportCard.findMany({
      where: { schoolId },
      select: { academicYear: true }
    });

    const byYear: Record<string, number> = {};
    for (const rc of reportCards) {
      byYear[rc.academicYear] = (byYear[rc.academicYear] || 0) + 1;
    }

    return NextResponse.json({
      totalGenerated,
      globalGenerated,
      maxLimit,
      remaining,
      percentageUsed,
      bySchool: { [schoolId]: totalGenerated },
      byClass: {},
      byYear
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    return NextResponse.json({ error: 'Failed to fetch report stats' }, { status: 500 });
  }
}

