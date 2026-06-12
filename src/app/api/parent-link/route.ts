import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { parentCode, parentUserId } = await request.json();

    if (!parentCode || !parentUserId) {
      return NextResponse.json(
        { error: 'Code parent et identifiant parent requis.' },
        { status: 400 }
      );
    }

    const cleanCode = (parentCode as string).trim().toUpperCase();

    const parentUser = await db.user.findUnique({ where: { id: parentUserId } });
    if (!parentUser || parentUser.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Compte parent invalide.' },
        { status: 404 }
      );
    }

    const student = await db.user.findUnique({ where: { parentCode: cleanCode } });
    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Code de parrainage invalide. Vérifiez le code fourni par votre enfant.' },
        { status: 404 }
      );
    }

    if (student.schoolId !== parentUser.schoolId) {
      return NextResponse.json(
        { error: 'Cet enfant n\'appartient pas à la même école.' },
        { status: 400 }
      );
    }

    const updated = await db.user.update({
      where: { id: student.id },
      data: { parentId: parentUserId },
      include: {
        classEnrollments: {
          include: { class: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      student: {
        id: updated.id,
        fullName: updated.fullName,
        photoUrl: updated.photoUrl,
        classEnrollments: updated.classEnrollments,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
