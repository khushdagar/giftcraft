import { prisma } from '@/lib/prisma';

/**
 * Mark one or more admin notification keys as read/seen for a given admin.
 * Keys are the synthetic notification ids used by /api/admin/notifications
 * (e.g. "order-<id>", "revision-<id>", "dispute-<id>"). Idempotent.
 */
export async function markAdminNotificationsRead(userId: string, keys: string[]) {
  const unique = Array.from(new Set(keys.filter(Boolean)));
  if (unique.length === 0) return;

  await prisma.$transaction(
    unique.map((key) =>
      prisma.adminNotificationRead.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key },
        update: {},
      })
    )
  );
}
