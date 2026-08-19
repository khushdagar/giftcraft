/**
 * Serialization utilities for converting Prisma Decimal fields to JSON-safe numbers
 * All Server Components must serialize before passing to client component props
 */

import { Decimal } from '@prisma/client/runtime/library';
import type {
  Product,
  PriceTier,
  ProductImage,
  ProductHsn,
  HsnCode,
  Packaging,
  Addon,
  ShippingZone,
  ProductVariant,
} from '@prisma/client';

export interface SerializedPriceTier extends Omit<PriceTier, 'costPrice' | 'sellPrice'> {
  costPrice: number;
  sellPrice: number;
}

export interface SerializedProductHsn extends Omit<ProductHsn, 'gstRate'> {
  gstRate: number;
  hsn?: SerializedHsnCode;
}

export interface SerializedHsnCode extends Omit<HsnCode, 'defaultGstRate'> {
  defaultGstRate: number;
}

export interface SerializedPackaging extends Omit<Packaging, 'price'> {
  price: number;
}

export interface SerializedAddon extends Omit<Addon, 'price'> {
  price: number;
}

export interface SerializedShippingZone extends ShippingZone {}

export interface SerializedProduct
  extends Omit<Product, 'priceTiers' | 'hsn' | 'auditLogs' | 'brand' | 'tags' | 'dimensionL' | 'dimensionW' | 'dimensionH'> {
  brand?: string | null;
  priceTiers?: SerializedPriceTier[];
  images?: ProductImage[];
  hsn?: SerializedProductHsn | null;
  /**
   * The product's tax identity, flattened off the `hsn` relation. Consumers
   * (builder, checkout, quote payload) price against these — reaching through
   * `hsn.hsn.code` is easy to forget, and a missed lookup silently taxes the
   * product at the 18% default instead of its real rate.
   */
  hsnCode?: string | null;
  gstRate?: number | null;
  categories?: any[];
  occasions?: any[];
  categoryIds?: string[];
  occasionIds?: string[];
  tags?: string[];
  vendors?: any[];
  variants?: ProductVariant[];
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}

export function serializePriceTier(tier: PriceTier): SerializedPriceTier {
  return {
    ...tier,
    costPrice: Number(tier.costPrice),
    sellPrice: Number(tier.sellPrice),
  };
}

export function serializeHsnCode(hsn: HsnCode): SerializedHsnCode {
  return {
    ...hsn,
    defaultGstRate: Number(hsn.defaultGstRate),
  };
}

export function serializeProductHsn(
  pHsn: ProductHsn & { hsn?: HsnCode }
): SerializedProductHsn {
  return {
    ...pHsn,
    gstRate: Number(pHsn.gstRate),
    hsn: pHsn.hsn ? serializeHsnCode(pHsn.hsn) : undefined,
  };
}

export function serializePackaging(pkg: Packaging): SerializedPackaging {
  return {
    ...pkg,
    price: Number(pkg.price),
  };
}

export function serializeAddon(addon: Addon): SerializedAddon {
  return {
    ...addon,
    price: Number(addon.price),
  };
}

export function serializeProduct(
  product: Product & {
    priceTiers?: PriceTier[];
    images?: ProductImage[];
    hsn?: (ProductHsn & { hsn?: HsnCode }) | null;
    categories?: any[];
    occasions?: any[];
    vendors?: any[];
    variants?: ProductVariant[];
  }
): SerializedProduct {
  // Extract category IDs from the nested category objects
  const categoryIds = product.categories?.map((cat: any) => cat.categoryId || cat.id) || [];
  const occasionIds = product.occasions?.map((occ: any) => occ.occasionId || occ.id) || [];

  // Serialize vendor links (costPrice is Decimal, dates must be plain)
  const vendors = product.vendors?.map((v: any) => ({
    id: v.id,
    vendorId: v.vendorId,
    vendorName: v.vendor?.name ?? null,
    isPrimary: v.isPrimary,
    costPrice: v.costPrice != null ? Number(v.costPrice) : null,
    vendorSku: v.vendorSku ?? null,
    vendorMoq: v.vendorMoq ?? null,
    vendorLeadDays: v.vendorLeadDays ?? null,
    sourcingStatus: v.sourcingStatus ?? null,
    lastPriceConfirmedAt: v.lastPriceConfirmedAt
      ? new Date(v.lastPriceConfirmedAt).toISOString()
      : null,
  }));

  return {
    ...product,
    // Map database dimension fields to form field names for compatibility
    lengthCm: product.dimensionL,
    widthCm: product.dimensionW,
    heightCm: product.dimensionH,
    priceTiers: product.priceTiers?.map(serializePriceTier),
    images: product.images || [],
    hsn: product.hsn ? serializeProductHsn(product.hsn) : null,
    hsnCode: product.hsn?.hsn?.code ?? null,
    gstRate: product.hsn?.gstRate != null ? Number(product.hsn.gstRate) : null,
    categoryIds,
    occasionIds,
    vendors: vendors || [],
    // ProductVariant.price is a Decimal — leaving it raw made the admin edit
    // form's zod resolver reject `variants` ("Invalid value") for any product
    // with per-size pricing, blocking every save.
    variants: (product.variants || []).map((v: any) => ({
      ...v,
      price: v.price != null ? Number(v.price) : null,
    })),
  };
}
