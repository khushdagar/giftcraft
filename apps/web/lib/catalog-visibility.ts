import { cache } from 'react';
import { prisma } from '@/lib/prisma';

/**
 * "Packaging" and "Add-on" are real product categories, but their products are
 * NOT catalog items — they back the builder's packaging selector and the
 * product-detail add-ons. So:
 *   · they're hidden from the catalog grid + filter bar, and
 *   · /api/packaging and /api/addons read products from these categories.
 *
 * Matched by a normalised key so "Add-on", "Add ons", "addons", "Packaging"
 * all resolve regardless of casing/punctuation/singular-plural.
 */
const PACKAGING_KEYS = new Set(['packaging', 'packagings']);
const ADDON_KEYS = new Set(['addon', 'addons']);
const HIDDEN_CATEGORY_KEYS = new Set([...PACKAGING_KEYS, ...ADDON_KEYS]);

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchesKeys(
  cat: { name?: string | null; slug?: string | null },
  keys: Set<string>
): boolean {
  return (
    (!!cat.name && keys.has(normalizeKey(cat.name))) ||
    (!!cat.slug && keys.has(normalizeKey(cat.slug)))
  );
}

export function isHiddenCategory(cat: { name?: string | null; slug?: string | null }): boolean {
  return matchesKeys(cat, HIDDEN_CATEGORY_KEYS);
}

// One category scan per request, shared by every getHiddenCategoryIds /
// getPackagingCategoryIds / getAddonCategoryIds call in that render — there
// are 13 call sites and the table is small enough to hold whole.
const allCategories = cache(() =>
  prisma.category.findMany({ select: { id: true, name: true, slug: true } })
);

/** Category IDs whose normalised name/slug is in `keys`. */
async function getCategoryIdsForKeys(keys: Set<string>): Promise<string[]> {
  const cats = await allCategories();
  return cats.filter((c) => matchesKeys(c, keys)).map((c) => c.id);
}

/** Packaging + Add-on category IDs — excluded from the catalog. */
export function getHiddenCategoryIds(): Promise<string[]> {
  return getCategoryIdsForKeys(HIDDEN_CATEGORY_KEYS);
}

/** IDs of the "Packaging" category (source for /api/packaging). */
export function getPackagingCategoryIds(): Promise<string[]> {
  return getCategoryIdsForKeys(PACKAGING_KEYS);
}

/** IDs of the "Add-on" category (source for /api/addons). */
export function getAddonCategoryIds(): Promise<string[]> {
  return getCategoryIdsForKeys(ADDON_KEYS);
}
