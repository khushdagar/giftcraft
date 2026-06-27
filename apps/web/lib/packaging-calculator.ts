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
 * Calculate total volume of products
 * Uses simple packing estimation: sum of volumes with 20% padding for safety
 */
function calculateProductsVolume(products: ProductDimensions[]): number {
  let totalVolume = 0;

  products.forEach(product => {
    if (product.lengthCm && product.widthCm && product.heightCm) {
      const productVolume = product.lengthCm * product.widthCm * product.heightCm;
      // Multiply by quantity
      totalVolume += productVolume * product.quantity;
    }
  });

  // Add 20% padding for safety (packing efficiency, wrapping, etc.)
  return totalVolume * 1.2;
}

/**
 * Calculate packaging volume
 */
function calculatePackagingVolume(packaging: PackagingOption): number {
  if (!packaging.lengthCm || !packaging.widthCm || !packaging.heightCm) {
    return 0;
  }
  return packaging.lengthCm * packaging.widthCm * packaging.heightCm;
}

/**
 * Check if products fit in packaging
 * Returns true if packaging volume is at least the product volume
 */
export function canProductsFit(products: ProductDimensions[], packaging: PackagingOption): boolean {
  const productsVolume = calculateProductsVolume(products);
  const packagingVolume = calculatePackagingVolume(packaging);

  // If packaging has no dimensions, we can't calculate
  if (packagingVolume === 0) {
    return true; // Assume it fits if we don't have packaging dimensions
  }

  return packagingVolume >= productsVolume;
}

/**
 * Suggest best packaging from available options
 * Returns the smallest packaging that fits all products
 */
export function suggestPackaging(
  products: ProductDimensions[],
  availablePackaging: PackagingOption[]
): PackagingOption | null {
  // Filter packaging that can fit the products
  const fitPackaging = availablePackaging.filter(pkg => canProductsFit(products, pkg));

  if (fitPackaging.length === 0) {
    return null; // No packaging can fit
  }

  // Sort by volume and return the smallest one (most economical)
  const sorted = fitPackaging.sort((a, b) => {
    const volA = calculatePackagingVolume(a);
    const volB = calculatePackagingVolume(b);
    return volA - volB;
  });

  return sorted[0] ?? null;
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
