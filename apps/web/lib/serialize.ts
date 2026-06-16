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
  extends Omit<Product, 'priceTiers' | 'hsn' | 'auditLogs' | 'brand' | 'dimensionL' | 'dimensionW' | 'dimensionH'> {
  brand?: string | null;
  priceTiers?: SerializedPriceTier[];
  images?: ProductImage[];
  hsn?: SerializedProductHsn | null;
  categories?: any[];
  occasions?: any[];
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
  return {
    ...product,
    // Map database dimension fields to form field names for compatibility
    lengthCm: product.dimensionL,
    widthCm: product.dimensionW,
    heightCm: product.dimensionH,
    priceTiers: product.priceTiers?.map(serializePriceTier),
    images: product.images || [],
    hsn: product.hsn ? serializeProductHsn(product.hsn) : null,
    variants: product.variants || [],
  };
}
