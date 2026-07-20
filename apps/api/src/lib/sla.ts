import { OrderStatus } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Dynamic SLA targets (minutes per order stage) for the API process.
 *
 * SLA_DEFAULTS is the fallback only. Runtime values come from the
 * `platformSetting` table (keys `sla.<status>`), which admins edit in the web
 * app at /admin/settings/sla. Both apps read the same rows, so there is a single
 * source of truth at runtime; these defaults just cover the "not configured yet"
 * / DB-unavailable case.
 */
export const SLA_DEFAULTS: Record<OrderStatus, number> = {
  draft: 60,
  quote_sent: 1440,
  confirmed: 240,
  mockup_pending: 2880,
  mockup_approved: 240,
  payment_pending: 1440,
  production: 7200,
  quality_check: 1440,
  packed: 1440,
  shipped: 240,
  in_transit: 4320,
  delivered: 2880,
  completed: 0,
  cancelled: 0,
  refunded: 0,
};

let cache: { value: Record<string, number>; expiresAt: number } | null = null;
const TTL_MS = 30_000;

export async function getSlaMinutes(): Promise<Record<string, number>> {
  if (cache && Date.now() < cache.expiresAt) return cache.value;

  const merged: Record<string, number> = { ...SLA_DEFAULTS };
  try {
    const rows = await prisma.platformSetting.findMany({
      where: { key: { startsWith: 'sla.' } },
      select: { key: true, value: true },
    });
    for (const row of rows) {
      const status = row.key.slice('sla.'.length);
      const n = Number(row.value);
      if (status && Number.isFinite(n)) merged[status] = n;
    }
  } catch (err) {
    console.error('[sla] failed to load overrides, using defaults', err);
  }

  cache = { value: merged, expiresAt: Date.now() + TTL_MS };
  return merged;
}
