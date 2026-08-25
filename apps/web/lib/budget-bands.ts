// Budget bands are the price ladder on /curated-packs/budget. They live in the
// `BudgetBand` table and are managed from /admin/budget-bands — this module
// holds only the shape and the membership rule, so it stays importable from
// client components (the loader itself is in lib/pack-data.ts, server-only).
export interface BudgetBandFaq {
  question: string;
  answer: string;
}

export interface BudgetBand {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  gradient: string | null;
  /** Inclusive floor. */
  min: number;
  /** Exclusive ceiling; null means "and above". */
  max: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  contentBelow: string | null;
  faqs: BudgetBandFaq[];
}

/**
 * A pack belongs to the band its "from" price falls into. `min` inclusive and
 * `max` exclusive is what stops ₹500 landing in two bands at once.
 */
export function bandContains(band: Pick<BudgetBand, 'min' | 'max'>, price: number) {
  if (price < band.min) return false;
  return band.max === null ? true : price < band.max;
}

/** The band a price falls into, or null when no band covers it. */
export function findBandForPrice<T extends Pick<BudgetBand, 'min' | 'max'>>(
  bands: T[],
  price: number
) {
  return bands.find((b) => bandContains(b, price)) ?? null;
}
