import { getPacks, getBudgetBand, type PackListItem } from '@/lib/pack-data';
import { bandContains } from '@/lib/budget-bands';

/**
 * Server-side filtering, faceting and paging for the curated-pack listings.
 *
 * The browser used to receive every active pack (2088 of them, ~3.7 MB of JSON)
 * and do all of this client-side. That payload was serialised into the HTML of
 * every curated-pack page — single pages reached 3.7 MB — and caching those
 * pages is what exhausted the app instance's memory in production.
 *
 * Now the server owns the whole dataset (one shared in-process copy, below) and
 * hands out one page of results at a time. The filter and facet semantics here
 * MIRROR what PacksBrowser used to compute in the client; keep them in step.
 */

/** Cards per page. Matches DEFAULT_PAGE_SIZE in hooks/use-paged-list.ts. */
export const PACKS_PAGE_SIZE = 48;

export type PackScope =
  | { kind: 'all' }
  | { kind: 'budget'; slug: string }
  | { kind: 'occasion'; slug: string };

export interface PackFilters {
  categories: string[];
  brands: string[];
  occasions: string[];
  recipients: string[];
  priceMin: number | null;
  priceMax: number | null;
  search: string;
  sort: 'featured' | 'price-asc' | 'price-desc';
}

export const EMPTY_FILTERS: PackFilters = {
  categories: [],
  brands: [],
  occasions: [],
  recipients: [],
  priceMin: null,
  priceMax: null,
  search: '',
  sort: 'featured',
};

export interface PackFacets {
  categories: { id: string; name: string; count: number }[];
  brands: { brand: string; count: number }[];
  occasions: { id: string; name: string; count: number }[];
  recipients: { tag: string; count: number }[];
  priceBounds: { min: number; max: number };
}

export interface PackPage {
  packs: PackListItem[];
  /** Matches across the WHOLE filtered set, not just this page. */
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  /** Sent with page 1 only — the sidebar does not change as you page. */
  facets: PackFacets | null;
}

// The pack list is cached inside getPacks() itself (lib/pack-data.ts) so that
// every caller shares one copy — not just this module. Nothing extra to do here.
const allPacks = getPacks;

// ── Scope ───────────────────────────────────────────────────────────────────

async function applyScope(list: PackListItem[], scope: PackScope): Promise<PackListItem[]> {
  if (scope.kind === 'occasion') {
    return list.filter((p) => p.occasionSlugs.includes(scope.slug));
  }
  if (scope.kind === 'budget') {
    const band = await getBudgetBand(scope.slug);
    if (!band) return [];
    return list.filter((p) => bandContains(band, p.fromPrice));
  }
  return list;
}

// ── Filtering ───────────────────────────────────────────────────────────────

/**
 * Applies every active filter, optionally skipping one facet.
 *
 * Skipping is what lets you tick more than one option inside the same facet: an
 * option is measured against the OTHER filters, so selecting one does not drop
 * its siblings to a count of zero and hide them.
 */
function applyFilters(
  list: PackListItem[],
  f: PackFilters,
  skip?: 'categories' | 'brands' | 'occasions' | 'recipients'
): PackListItem[] {
  let out = list;
  if (skip !== 'categories' && f.categories.length)
    out = out.filter((p) => p.categories.some((c) => f.categories.includes(c.id)));
  if (skip !== 'brands' && f.brands.length)
    out = out.filter((p) => p.brands.some((b) => f.brands.includes(b)));
  if (skip !== 'occasions' && f.occasions.length)
    out = out.filter((p) => p.occasions.some((o) => f.occasions.includes(o.id)));
  if (skip !== 'recipients' && f.recipients.length)
    out = out.filter((p) => p.recipients.some((r) => f.recipients.includes(r)));
  const q = f.search.trim().toLowerCase();
  if (q) out = out.filter((p) => p.name.toLowerCase().includes(q));
  const { priceMin, priceMax } = f;
  if (priceMin != null) out = out.filter((p) => p.fromPrice >= priceMin);
  if (priceMax != null) out = out.filter((p) => p.fromPrice <= priceMax);
  return out;
}

function sortPacks(list: PackListItem[], sort: PackFilters['sort']): PackListItem[] {
  // 'featured' is the order getPacks() already returns (admin sortOrder, then
  // viewCount) — leave the array untouched so it stays stable.
  if (sort === 'price-asc') return [...list].sort((a, b) => a.fromPrice - b.fromPrice);
  if (sort === 'price-desc') return [...list].sort((a, b) => b.fromPrice - a.fromPrice);
  return list;
}

// ── Facets ──────────────────────────────────────────────────────────────────

function buildFacets(scoped: PackListItem[], f: PackFilters): PackFacets {
  const byCategory = applyFilters(scoped, f, 'categories');
  const byBrand = applyFilters(scoped, f, 'brands');
  const byOccasion = applyFilters(scoped, f, 'occasions');
  const byRecipient = applyFilters(scoped, f, 'recipients');

  const catOptions = new Map<string, string>();
  const occOptions = new Map<string, string>();
  const brandOptions = new Set<string>();
  const recipientOptions = new Set<string>();
  for (const p of scoped) {
    p.categories.forEach((c) => catOptions.set(c.id, c.name));
    p.occasions.forEach((o) => occOptions.set(o.id, o.name));
    p.brands.forEach((b) => brandOptions.add(b));
    p.recipients.forEach((r) => recipientOptions.add(r));
  }

  const prices = scoped.map((p) => p.fromPrice).filter((n) => n > 0);

  // An option survives only if it can still narrow the results, or if it is
  // already ticked — otherwise there would be no way to untick it.
  return {
    categories: Array.from(catOptions, ([id, name]) => ({
      id,
      name,
      count: byCategory.filter((p) => p.categories.some((c) => c.id === id)).length,
    }))
      .filter((c) => c.count > 0 || f.categories.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name)),

    brands: Array.from(brandOptions, (brand) => ({
      brand,
      count: byBrand.filter((p) => p.brands.includes(brand)).length,
    }))
      .filter((b) => b.count > 0 || f.brands.includes(b.brand))
      .sort((a, b) => a.brand.localeCompare(b.brand)),

    occasions: Array.from(occOptions, ([id, name]) => ({
      id,
      name,
      count: byOccasion.filter((p) => p.occasions.some((o) => o.id === id)).length,
    }))
      .filter((o) => o.count > 0 || f.occasions.includes(o.id))
      .sort((a, b) => a.name.localeCompare(b.name)),

    recipients: Array.from(recipientOptions, (tag) => ({
      tag,
      count: byRecipient.filter((p) => p.recipients.includes(tag)).length,
    }))
      .filter((r) => r.count > 0 || f.recipients.includes(r.tag))
      .sort((a, b) => a.tag.localeCompare(b.tag)),

    priceBounds: { min: 0, max: prices.length ? Math.max(...prices) : 10000 },
  };
}

// ── Entry point ─────────────────────────────────────────────────────────────

export async function queryPacks(
  scope: PackScope,
  filters: PackFilters = EMPTY_FILTERS,
  page = 1,
  pageSize = PACKS_PAGE_SIZE
): Promise<PackPage> {
  const scoped = await applyScope(await allPacks(), scope);
  const matched = sortPacks(applyFilters(scoped, filters), filters.sort);

  const start = (page - 1) * pageSize;
  const slice = matched.slice(start, start + pageSize);

  return {
    packs: slice,
    total: matched.length,
    page,
    pageSize,
    hasMore: start + slice.length < matched.length,
    // Facets describe the whole scope, so they are identical on every page —
    // computing and shipping them once with page 1 keeps later pages small.
    facets: page === 1 ? buildFacets(scoped, filters) : null,
  };
}

/**
 * Every pack in a scope. For the page's JSON-LD item list and metadata counts,
 * which run on the server and are never serialised into the client payload.
 */
export async function scopedPacks(scope: PackScope): Promise<PackListItem[]> {
  return applyScope(await allPacks(), scope);
}
