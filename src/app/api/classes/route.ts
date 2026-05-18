import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifyUser } from '@/services/notifications/notificationEngine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const classes = await db.schoolClass.findMany({
      where: { schoolId },
      include: {
        _count: {
          select: {
            enrollments: true,
            courses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ classes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolId, name, level, fees } = body;

    if (!schoolId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, name' },
        { status: 400 }
      );
    }

    const existing = await db.schoolClass.findFirst({
      where: { schoolId, name },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A class with name "${name}" already exists in this school` },
        { status: 409 }
      );
    }

    const schoolClass = await db.schoolClass.create({
      data: {
        schoolId,
        name,
        level: level || 'Primaire',
        fees: fees || 0,
      },
      include: {
        _count: {
          select: {
            enrollments: true,
            courses: true,
          },
        },
      },
    });

    // Broad broadcast to everyone in the school when a new class is added
    await notifyUser({
      schoolId,
      title: 'Nouvelle Classe Créée 🏫',
      message: `La classe "${name}" (${level || 'Primaire'}) a été officiellement ajoutée à l'établissement.`,
      type: 'CLASS',
      priority: 'NORMAL',
      targetRole: 'ALL',
      metadata: { classId: schoolClass.id, className: name, level },
    });

    return NextResponse.json({ class: schoolClass }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
