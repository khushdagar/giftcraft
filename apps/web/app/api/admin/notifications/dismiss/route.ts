import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dismissAdminNotifications } from '@/lib/admin-notifications';

/**
 * POST /api/admin/notifications/dismiss
 * Body: { keys: string[] }
 * Clears the given notification keys for the current admin — removes them from
 * the top-bar bell entirely. Used by the per-item clear button and "Clear all".
 * Distinct from /read, which only marks a notification seen (it stays visible).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const keys: string[] = Array.isArray(body?.keys) ? body.keys : [];

    await dismissAdminNotifications(session.user.id, keys);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return NextResponse.json(
      { error: 'Failed to clear notifications' },
      { status: 500 }
    );
  }
}
