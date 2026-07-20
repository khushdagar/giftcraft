import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// Remove the current browser's push subscription for the logged-in user.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const endpoint: string | undefined = body?.endpoint;

    if (endpoint) {
      // Scope the delete to the owner so a user can't remove another's row.
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: session.user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/push/unsubscribe:', error);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}
