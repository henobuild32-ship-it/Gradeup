import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE /api/user/data?userId=xxx
// Supprime toutes les conversations, messages et documents IA de l'utilisateur.

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId requis' }, { status: 400 });
  }

  // La suppression en cascade (AiMessage, AiDocument) est gérée par Prisma (onDelete: Cascade)
  await db.aiConversation.deleteMany({ where: { userId } });

  return NextResponse.json({
    success: true,
    message: 'Toutes vos conversations et données Gradie ont été supprimées.',
  });
}
