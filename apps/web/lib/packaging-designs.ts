/**
 * Packaging size helpers for the Gift Builder.
 *
 * Packaging designs themselves now live in the database (products in the
 * "Packaging" category, each with Small/Medium/Large *size variants* that carry
 * a price — editable from the admin Products tab). These helpers only decide
 * which size a given pack needs and build the packaging snapshot id.
 *
 * The customer picks a DESIGN; the size is decided automatically from how many
 * products are in the pack (see `packagingSizeForCount`) and locked, so the
 * price shown is that design's price for the pack's current size.
 */

export type BoxSize = 'Small' | 'Medium' | 'Large';

export const BOX_SIZES: BoxSize[] = ['Small', 'Medium', 'Large'];

/**
 * Auto-pick the box size from the number of products in the pack:
 *   1–2 → Small · 3–4 → Medium · 5+ → Large
 * Mirrors the "BOX SIZE" badge shown in the gift-pack summary.
 */
export function packagingSizeForCount(count: number): BoxSize {
  if (count <= 2) return 'Small';
  if (count <= 4) return 'Medium';
  return 'Large';
}

/** Synthetic packaging snapshot id for a design + size, e.g. `<productId>-medium`. */
export function packagingId(designId: string, size: BoxSize): string {
  return `${designId}-${size.toLowerCase()}`;
}

/**
 * Price for a design at the given size: the matching size-variant price, falling
 * back to the design's base price when that size has no explicit price set.
 */
export function priceForSize(
  design: { price: number; sizePrices?: Record<string, number> | null },
  size: BoxSize
): number {
  const bySize = design.sizePrices?.[size.toLowerCase()];
  return bySize != null ? bySize : design.price;
}
