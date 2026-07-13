import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// GET    /api/ai/memory?userId=xxx            – liste les souvenirs de l'utilisateur
// POST   /api/ai/memory                        – crée un souvenir
// DELETE /api/ai/memory?id=xxx&userId=xxx      – supprime un souvenir

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });

  const memories = await db.aiMemory.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ memories });
}

export async function POST(request: NextRequest) {
  try {
    const { userId, schoolId, content, category } = await request.json();
    if (!userId || !content?.trim()) {
      return NextResponse.json({ error: 'userId et content requis' }, { status: 400 });
    }
    const memory = await db.aiMemory.create({
      data: {
        userId,
        schoolId: schoolId || '',
        content: content.trim(),
        category: category || 'fact',
      },
    });
    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    console.error('Error creating memory:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const userId = searchParams.get('userId');
  if (!id || !userId) return NextResponse.json({ error: 'id et userId requis' }, { status: 400 });

  await db.aiMemory.deleteMany({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
