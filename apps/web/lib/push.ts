import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

/**
 * Web Push sender. Configures web-push lazily from VAPID env vars and exposes
 * two entry points:
 *   - sendPushToUser  → a specific user's devices (respects notification prefs)
 *   - sendPushToAdmins → every super_admin's devices (ops alerts)
 *
 * Dead subscriptions (push service returns 404/410) are pruned automatically so
 * the PushSubscription table doesn't accumulate stale endpoints.
 */

export interface PushPayload {
  title: string;
  body: string;
  /** Path to open when the notification is clicked (default '/'). */
  url?: string;
  /** Collapse key — a newer notification with the same tag replaces the old. */
  tag?: string;
}

/** Event categories that map to per-user preference flags in prefsJson. */
type PushEvent = 'orderStatus' | 'quotes' | 'disputes' | 'marketing';

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:udayveer@rankingeek.com';

  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys missing — web push is disabled (no-op).');
    configured = false;
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

interface StoredSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Send a payload to a list of stored subscriptions, pruning dead ones. */
async function deliver(subs: StoredSub[], payload: PushPayload): Promise<number> {
  if (subs.length === 0) return 0;
  const body = JSON.stringify(payload);

  const results = await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        return true;
      } catch (err: any) {
        const statusCode = err?.statusCode;
        // 404 Not Found / 410 Gone → the subscription is dead. Prune it.
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription
            .deleteMany({ where: { endpoint: sub.endpoint } })
            .catch(() => {});
        } else {
          console.error('[push] send failed', statusCode, err?.message);
        }
        return false;
      }
    })
  );

  return results.filter(Boolean).length;
}

/**
 * Push to a single user's devices. Silently no-ops when push is disabled, the
 * user turned the push channel off, or the specific event category is muted.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  opts?: { event?: PushEvent }
): Promise<void> {
  if (!ensureConfigured()) return;

  try {
    // Preference gate. Absence of a flag means "not explicitly disabled" → allow.
    const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
    const prefs = (pref?.prefsJson as Record<string, unknown> | undefined) || {};
    if (prefs.push === false) return;
    if (opts?.event && prefs[opts.event] === false) return;

    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, p256dh: true, auth: true },
    });
    await deliver(subs, payload);
  } catch (err) {
    // Push is always best-effort — never let it break the calling request.
    console.error('[push] sendPushToUser error', err);
  }
}

/** Push to every super_admin's devices (ops alerts — new order, dispute, etc.). */
export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  try {
    const admins = await prisma.user.findMany({
      where: { role: 'super_admin' },
      select: { id: true },
    });
    if (admins.length === 0) return;

    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: admins.map((a) => a.id) } },
      select: { endpoint: true, p256dh: true, auth: true },
    });
    await deliver(subs, payload);
  } catch (err) {
    console.error('[push] sendPushToAdmins error', err);
  }
}
