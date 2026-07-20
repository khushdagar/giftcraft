import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { markAdminNotificationsRead } from '@/lib/admin-notifications';

/**
 * POST /api/admin/notifications/read
 * Body: { keys: string[] }
 * Marks the given notification keys as read/cleared for the current admin, so
 * they stop appearing in the top-bar bell. Used by both "mark all read" and the
 * per-item click in the notification dropdown.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const keys: string[] = Array.isArray(body?.keys) ? body.keys : [];

    await markAdminNotificationsRead(session.user.id, keys);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications read' },
      { status: 500 }
    );
  }
}
