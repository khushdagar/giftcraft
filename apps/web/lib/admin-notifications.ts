import { prisma } from '@/lib/prisma';

/**
 * Mark one or more admin notification keys as *read* for a given admin. Read
 * notifications drop out of the unread badge count but stay visible in the bell
 * — they're only removed once explicitly cleared (see dismissAdminNotifications).
 * Keys are the synthetic notification ids used by /api/admin/notifications
 * (e.g. "order-<id>", "revision-<id>", "dispute-<id>"). Idempotent, and never
 * un-dismisses an already-cleared notification.
 */
export async function markAdminNotificationsRead(userId: string, keys: string[]) {
  const unique = Array.from(new Set(keys.filter(Boolean)));
  if (unique.length === 0) return;

  await prisma.$transaction(
    unique.map((key) =>
      prisma.adminNotificationRead.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key },
        // Read is idempotent and must not resurrect a cleared notification, so
        // leave `dismissed` untouched on update.
        update: {},
      })
    )
  );
}

/**
 * *Clear* one or more admin notification keys for a given admin — removes them
 * from the bell entirely (implies read). Used by the per-item clear button and
 * "Clear all". Idempotent.
 */
export async function dismissAdminNotifications(userId: string, keys: string[]) {
  const unique = Array.from(new Set(keys.filter(Boolean)));
  if (unique.length === 0) return;

  await prisma.$transaction(
    unique.map((key) =>
      prisma.adminNotificationRead.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, dismissed: true },
        update: { dismissed: true },
      })
    )
  );
}
