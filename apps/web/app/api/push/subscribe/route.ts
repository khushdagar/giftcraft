import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// Save (or refresh) the current browser's push subscription for the logged-in
// user. Idempotent on the endpoint — re-subscribing updates keys/ownership.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const endpoint: string | undefined = body?.endpoint;
    const p256dh: string | undefined = body?.keys?.p256dh;
    const authKey: string | undefined = body?.keys?.auth;

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh,
        auth: authKey,
        userId: session.user.id,
        userAgent: req.headers.get('user-agent') || null,
      },
      update: {
        p256dh,
        auth: authKey,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/push/subscribe:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
