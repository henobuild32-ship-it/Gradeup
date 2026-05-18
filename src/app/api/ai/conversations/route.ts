import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET  /api/ai/conversations?userId=xxx  – liste toutes les conversations
// POST /api/ai/conversations              – crée une nouvelle conversation

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId requis' }, { status: 400 });
  }

  const conversations = await db.aiConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, role: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId requis' }, { status: 400 });
  }

  const conversation = await db.aiConversation.create({
    data: { userId, title: 'Nouvelle conversation', salutationDone: false },
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
