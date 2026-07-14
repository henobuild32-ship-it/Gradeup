import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';
import { notifyUser } from '@/services/notifications/notificationEngine';

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const targetRole = searchParams.get('targetRole');

    if (!schoolId || schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'schoolId invalide' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (targetRole) {
      // Parent can only see PARENT-targeted notifications
      if (auth.role === 'PARENT' && targetRole !== 'PARENT') {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
      }
      where.targetRole = targetRole;
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Elegant backward-compatibility fallback
    // Student, parent, and dashboard views expect a flat array, while admin view expects { notifications }
    if (targetRole === 'STUDENT' || targetRole === 'PARENT') {
      return NextResponse.json(notifications);
    }

    return NextResponse.json({ notifications });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (auth.role === 'PARENT') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }
    const body = await request.json();
    const { schoolId, senderId, targetRole, targetClassId, message, title, type, priority, metadata } = body;

    if (!schoolId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, message' },
        { status: 400 }
      );
    }

    // Call centralized creator which persists to database and fires real-time engine
    const notification = await notifyUser({
      schoolId,
      senderId: senderId || '',
      targetRole: targetRole || 'ALL',
      targetClassId: targetClassId || '',
      message,
      title: title || 'GradeUp',
      type: type || 'INFO',
      priority: priority || 'NORMAL',
      metadata: metadata || {},
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
