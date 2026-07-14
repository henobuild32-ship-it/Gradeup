import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const schoolId = searchParams.get('schoolId');

    if (!teacherId || !schoolId) {
      return NextResponse.json({ error: 'teacherId et schoolId requis' }, { status: 400 });
    }

    const transmissions = await db.cotationTransmission.findMany({
      where: {
        teacherId,
        schoolId,
      },
      include: {
        evaluation: {
          include: {
            class: { select: { id: true, name: true } },
            course: { select: { id: true, name: true } },
          },
        },
        class: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        titulaire: { select: { id: true, fullName: true, photoUrl: true } },
      },
      orderBy: { sentAt: 'desc' },
    });

    return NextResponse.json({ transmissions });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('[GET /api/cahier/transmissions/sent]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}