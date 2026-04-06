import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function generateParentCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'P-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST: Generate or regenerate parent code for a student
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId requis.' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Élève non trouvé.' }, { status: 404 });
    }

    let code = generateParentCode();
    while (await db.user.findUnique({ where: { parentCode: code } })) {
      code = generateParentCode();
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { parentCode: code },
    });

    return NextResponse.json({ parentCode: updated.parentCode });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
