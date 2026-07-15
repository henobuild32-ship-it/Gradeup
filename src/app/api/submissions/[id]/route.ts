import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticateRequest(request);
    const { id } = await params;
    const body = await request.json();
    const { score, maxScore } = body;

    const existing = await db.submission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Soumission introuvable' }, { status: 404 });
    }

    const submission = await db.submission.update({
      where: { id },
      data: {
        score: score !== undefined ? parseFloat(score) : null,
        maxScore: maxScore !== undefined ? parseFloat(maxScore) : null,
        gradedAt: new Date(),
        gradedBy: auth.userId,
        status: 'graded',
      },
      include: {
        student: { select: { id: true, fullName: true, photoUrl: true } },
      },
    });

    return NextResponse.json({ submission });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
