import { revalidatePath } from 'next/cache';

/**
 * Every ISR surface that renders a budget band's name or membership. Called
 * after any admin create/update/delete so the change shows immediately on
 * production instead of waiting for the hourly `revalidate` window.
 *
 * - the band page(s) themselves (old + new slug on rename)
 * - /curated-packs/budget (tiles) and /curated-packs (hub)
 * - / (homepage budget tiles)
 * - /api/pack-nav — the mega-menu is a cached route handler, not a page, so
 *   without this the navbar keeps showing the old band names for an hour.
 */
export function revalidateBudgetBandPages(...slugs: Array<string | null | undefined>) {
  for (const slug of new Set(slugs.filter(Boolean) as string[])) {
    revalidatePath(`/curated-packs/budget/${slug}`);
  }
  revalidatePath('/curated-packs/budget');
  revalidatePath('/curated-packs');
  revalidatePath('/');
  revalidatePath('/api/pack-nav');
}
