import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/push';

// Send a test push to the logged-in user's own devices — powers the
// "Send a test notification" button on the notification settings screens.
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await sendPushToUser(session.user.id, {
      title: 'GIVOO 🎁',
      body: 'Push notifications are working. You are all set!',
      url: '/dashboard',
      tag: 'test',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/push/test:', error);
    return NextResponse.json({ error: 'Failed to send test' }, { status: 500 });
  }
}
