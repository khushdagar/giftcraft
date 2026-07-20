import 'server-only';
import { prisma } from '@/lib/prisma';
import { SLA_MINUTES } from '@/lib/constants';

/**
 * Dynamic SLA targets (minutes per order stage).
 *
 * The values in SLA_MINUTES (constants) are DEFAULTS / fallback only. The real,
 * runtime values are stored in the `platformSetting` table under keys
 * `sla.<status>` and are editable by admins at /admin/settings/sla — no redeploy
 * needed. Any status without a saved override falls back to the default.
 *
 * Cached in-memory for a short window so hot paths (e.g. every order status
 * change) don't hit the DB each time.
 */

let cache: { value: Record<string, number>; expiresAt: number } | null = null;
const TTL_MS = 30_000;

export async function getSlaMinutes(): Promise<Record<string, number>> {
  if (cache && Date.now() < cache.expiresAt) return cache.value;

  const merged: Record<string, number> = { ...SLA_MINUTES };
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
    // Never let a config read break the calling request — fall back to defaults.
    console.error('[sla] failed to load overrides, using defaults', err);
  }

  cache = { value: merged, expiresAt: Date.now() + TTL_MS };
  return merged;
}

/** Convenience: resolved SLA minutes for one stage (0 when unset/terminal). */
export async function getSlaMinutesForStage(stage: string): Promise<number> {
  const all = await getSlaMinutes();
  return all[stage] ?? 0;
}

/** Drop the cache so a just-saved change is picked up immediately. */
export function invalidateSlaCache(): void {
  cache = null;
}
