import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';

const ALLOWED = new Set(['WEEK', 'MONTH', 'SEMESTER', 'TRIMESTER', 'YEAR']);

export async function GET(req: NextRequest) {
  try {
    const auth = authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const schoolYearId = searchParams.get('schoolYearId');
    if (!schoolYearId) return NextResponse.json({ error: 'schoolYearId requis' }, { status: 400 });
    const closures = await db.academicClosure.findMany({ where: { schoolId: auth.schoolId, schoolYearId }, orderBy: { closedAt: 'desc' } });
    return NextResponse.json({ closures });
  } catch (error: unknown) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = authenticateRequest(req);
    if (auth.role !== 'ADMIN') return NextResponse.json({ error: 'Action réservée aux administrateurs.' }, { status: 403 });
    const { schoolYearId, scope, key } = await req.json();
    if (!schoolYearId || !ALLOWED.has(scope) || !key) return NextResponse.json({ error: 'schoolYearId, scope et key sont requis.' }, { status: 400 });
    const closure = await db.academicClosure.upsert({
      where: { schoolId_schoolYearId_scope_key: { schoolId: auth.schoolId, schoolYearId, scope, key } },
      update: { closedById: auth.userId, closedAt: new Date() },
      create: { schoolId: auth.schoolId, schoolYearId, scope, key, closedById: auth.userId },
    });
    return NextResponse.json({ closure });
  } catch (error: unknown) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
