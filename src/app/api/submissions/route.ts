import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const homeworkId = searchParams.get('homeworkId');
    const schoolId = searchParams.get('schoolId');

    if (!homeworkId || !schoolId) {
      return NextResponse.json({ error: 'homeworkId et schoolId requis' }, { status: 400 });
    }

    const submissions = await db.submission.findMany({
      where: { homeworkId, schoolId },
      include: {
        student: { select: { id: true, fullName: true, photoUrl: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return NextResponse.json({ submissions });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
