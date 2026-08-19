// Display order for the pack-occasion lists — the homepage "Shop by Occasions"
// tiles and the Curated Packs → By Occasion menu. These names lead, in this
// order; every other occasion follows in the admin's own order. Nothing is
// dropped, so an occasion that gains packs still shows up on its own.
export const FEATURED_PACK_OCCASIONS = [
  'Onboarding',
  'Diwali',
  'Events',
  'Client Gifting',
  'Festive',
  'Gifting for Her',
  'Anniversary',
  'Farewell',
];

// Matched by name (case-insensitive) rather than slug, so renaming a slug in
// the admin can't silently drop an entry to the back of the list.
const RANK = new Map(FEATURED_PACK_OCCASIONS.map((n, i) => [n.toLowerCase(), i]));

export function orderPackOccasions<T extends { name: string }>(items: T[]): T[] {
  return items
    .map((item, i) => ({ item, i, rank: RANK.get(item.name.toLowerCase()) ?? Infinity }))
    // Ties keep their incoming order (the admin's sortOrder).
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((e) => e.item);
}
