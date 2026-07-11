import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/grades/[id]/history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const grade = await db.grade.findUnique({ where: { id } });
    if (!grade) {
      return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });
    }

    const history = await db.gradeHistory.findMany({
      where: { gradeId: id },
      include: {
        modifier: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ history });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
