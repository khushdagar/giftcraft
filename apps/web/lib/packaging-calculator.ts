/**
 * Packaging Calculator - Suggests best packaging based on products
 */

export interface ProductDimensions {
  id: string;
  name: string;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  quantity: number;
}

export interface PackagingOption {
  id: string;
  name: string;
  price: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}

/**
 * Fallback per-item box size (cm) when a product has no dimensions saved, so a
 * pack of dimensionless products still produces a realistic required volume
 * instead of zero. A typical small branded gift item.
 */
export const DEFAULT_ITEM_CM = { l: 15, w: 10, h: 8 };

/** Volume (cm³) of one unit of a product, using a fallback when dims are missing. */
function unitVolume(product: ProductDimensions): number {
  const l = product.lengthCm && product.lengthCm > 0 ? product.lengthCm : DEFAULT_ITEM_CM.l;
  const w = product.widthCm && product.widthCm > 0 ? product.widthCm : DEFAULT_ITEM_CM.w;
  const h = product.heightCm && product.heightCm > 0 ? product.heightCm : DEFAULT_ITEM_CM.h;
  return l * w * h;
}

/**
 * Required volume (cm³) for one gift pack — the sum of each product's unit
 * volume × quantity, plus 20% padding for packing efficiency and wrapping.
 */
function calculateProductsVolume(products: ProductDimensions[]): number {
  const total = products.reduce(
    (sum, p) => sum + unitVolume(p) * (p.quantity > 0 ? p.quantity : 1),
    0
  );
  return total * 1.2;
}

/** Packaging interior volume (cm³). Returns 0 when the box has no dimensions. */
function calculatePackagingVolume(packaging: PackagingOption): number {
  if (!packaging.lengthCm || !packaging.widthCm || !packaging.heightCm) {
    return 0;
  }
  return packaging.lengthCm * packaging.widthCm * packaging.heightCm;
}

/**
 * Whether the products fit in this packaging. A box with NO dimensions cannot be
 * confirmed to fit, so it is excluded from the recommendation (previously these
 * were treated as "fits everything", which made the first box always win).
 */
export function canProductsFit(products: ProductDimensions[], packaging: PackagingOption): boolean {
  const packagingVolume = calculatePackagingVolume(packaging);
  if (packagingVolume === 0) return false;
  return packagingVolume >= calculateProductsVolume(products);
}

/**
 * Suggest the smallest (most economical) box whose real dimensions fit the pack.
 * Returns null when no dimensioned box can fit — the UI then shows no claim
 * rather than a wrong one.
 */
export function suggestPackaging(
  products: ProductDimensions[],
  availablePackaging: PackagingOption[]
): PackagingOption | null {
  const fitPackaging = availablePackaging
    .filter((pkg) => calculatePackagingVolume(pkg) > 0)
    .filter((pkg) => canProductsFit(products, pkg));

  if (fitPackaging.length === 0) return null;

  const sorted = [...fitPackaging].sort(
    (a, b) => calculatePackagingVolume(a) - calculatePackagingVolume(b)
  );
  return sorted[0] ?? null;
}

/**
 * Always recommend from the AVAILABLE boxes:
 *   · the smallest box that fits (best value), or
 *   · if nothing fits, the largest available box as the closest option
 *     (`fits: false` → the UI flags that a custom box may be needed).
 * Returns null only when no box has dimensions at all.
 */
export function recommendPackaging(
  products: ProductDimensions[],
  availablePackaging: PackagingOption[]
): { box: PackagingOption; fits: boolean } | null {
  const dimensioned = availablePackaging.filter((pkg) => calculatePackagingVolume(pkg) > 0);
  if (dimensioned.length === 0) return null;

  const required = calculateProductsVolume(products);
  const bySize = [...dimensioned].sort(
    (a, b) => calculatePackagingVolume(a) - calculatePackagingVolume(b)
  );

  const smallestFit = bySize.find((pkg) => calculatePackagingVolume(pkg) >= required);
  if (smallestFit) return { box: smallestFit, fits: true };

  // Nothing fits — recommend the largest box as the closest option.
  return { box: bySize[bySize.length - 1]!, fits: false };
}

/**
 * Get packaging suggestions with reasoning
 */
export function getPackagingSuggestions(
  products: ProductDimensions[],
  availablePackaging: PackagingOption[]
): {
  recommended: PackagingOption | null;
  suitable: PackagingOption[];
  reason: string;
} {
  const recommended = suggestPackaging(products, availablePackaging);
  const suitable = availablePackaging.filter(pkg => canProductsFit(products, pkg));

  let reason = '';
  if (recommended) {
    reason = `Perfect fit! Your ${products.length} product(s) will fit comfortably in the ${recommended.name}.`;
  } else {
    reason = `No suitable packaging available for these products. Please add more packaging options with larger dimensions.`;
  }

  return {
    recommended,
    suitable,
    reason,
  };
}
