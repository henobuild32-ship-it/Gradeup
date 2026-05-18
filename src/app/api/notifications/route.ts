import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifyUser } from '@/services/notifications/notificationEngine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const targetRole = searchParams.get('targetRole');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (targetRole) {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
