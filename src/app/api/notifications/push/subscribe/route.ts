import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription } = body;

    if (!userId || !subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId, subscription' },
        { status: 400 }
      );
    }

    const { endpoint, keys } = subscription;
    const p256dh = keys?.p256dh || '';
    const auth = keys?.auth || '';

    // upsert subscription based on the unique endpoint string
    const pushSub = await db.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh,
        auth,
      },
      create: {
        userId,
        endpoint,
        p256dh,
        auth,
      },
    });

    return NextResponse.json({ success: true, subscription: pushSub });
  } catch (error: any) {
    console.error('[PushSubscribeAPI] Error storing browser push subscription:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
