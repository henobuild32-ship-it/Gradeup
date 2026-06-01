import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, schoolId } = body;

    if (!year) {
      return NextResponse.json({ error: 'year is required' }, { status: 400 });
    }

    // Obtenir ou créer le compteur pour l'année
    let counter = await db.reportCounter.findUnique({
      where: { year }
    });

    if (!counter) {
      counter = await db.reportCounter.create({
        data: {
          year,
          currentCount: 0,
          maxLimit: 1000000
        }
      });
    }

    // Vérifier si on peut encore générer
    const canGenerate = counter.currentCount < counter.maxLimit;

    if (!canGenerate) {
      return NextResponse.json({
        canGenerate: false,
        counter: counter.currentCount,
        message: 'Limite annuelle de 1.000.000 bulletins atteinte'
      });
    }

    // Incrémenter le compteur
    const updatedCounter = await db.reportCounter.update({
      where: { id: counter.id },
      data: { currentCount: { increment: 1 } }
    });

    return NextResponse.json({
      canGenerate: true,
      counter: updatedCounter.currentCount
    });
  } catch (error) {
    console.error('Error with report counter:', error);
    return NextResponse.json({ error: 'Failed to process report counter' }, { status: 500 });
  }
}
