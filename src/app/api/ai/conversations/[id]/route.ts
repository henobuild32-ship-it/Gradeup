import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET    /api/ai/conversations/[id]?userId=xxx  – récupère une conversation avec ses messages
// DELETE /api/ai/conversations/[id]             – supprime une conversation

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId requis' }, { status: 400 });
  }

  const conversation = await db.aiConversation.findFirst({
    where: { id, userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      documents: { select: { id: true, name: true, mimeType: true, size: true, summary: true, createdAt: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId requis' }, { status: 400 });
  }

  const conversation = await db.aiConversation.findFirst({
    where: { id, userId },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
  }

  await db.aiConversation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
