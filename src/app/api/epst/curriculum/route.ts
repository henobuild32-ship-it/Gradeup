import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/epst/curriculum?section=...&option=...&level=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const option = searchParams.get('option');
    const level = searchParams.get('level');

    if (!section || !level) {
      return NextResponse.json({ error: 'section et level sont requis' }, { status: 400 });
    }

    const curriculum = await db.ePSTCurriculum.findMany({
      where: {
        section,
        option: option || '',
        level,
      },
    });

    return NextResponse.json(curriculum);
  } catch (error) {
    console.error('[GET /api/epst/curriculum]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
