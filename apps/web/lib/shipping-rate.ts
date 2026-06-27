import { getShiprocketRate } from '@/lib/shiprocket';
import { SHIPPING_MARKUP } from '@/lib/shipping';

// Seller pickup pincode (the registered Shiprocket pickup address — Shakti Nagar,
// Delhi 110007). Used as the origin for real-time rate lookups.
const PICKUP_PINCODE = process.env.SHIPROCKET_PICKUP_PINCODE || '110007';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface ShiprocketShippingResult {
  shippingCost: number;
  perPackCost: number;
  courierName: string;
  etdDays: number | null;
}

/**
 * Real-time shipping cost from Shiprocket for the whole order.
 *  · single delivery  → one consolidated parcel of (perPackKg × packs)
 *  · individual       → one parcel per pack, charged × packs
 * Returns null when Shiprocket is unavailable/unserviceable so the caller can
 * fall back to zone pricing.
 */
export async function getShiprocketShippingCost(input: {
  deliveryPincode: string;
  perPackKg: number;
  packQuantity: number;
  deliveryMode: 'single' | 'individual';
}): Promise<ShiprocketShippingResult | null> {
  const packs = Math.max(1, input.packQuantity);

  if (input.deliveryMode === 'single') {
    const r = await getShiprocketRate({
      pickupPostcode: PICKUP_PINCODE,
      deliveryPostcode: input.deliveryPincode,
      weightKg: input.perPackKg * packs,
    });
    if (!r) return null;
    // Bake in the silent shipping margin (never shown separately).
    const total = r.rate * SHIPPING_MARKUP;
    return {
      shippingCost: round2(total),
      perPackCost: round2(total / packs),
      courierName: r.courierName,
      etdDays: r.etdDays,
    };
  }

  const r = await getShiprocketRate({
    pickupPostcode: PICKUP_PINCODE,
    deliveryPostcode: input.deliveryPincode,
    weightKg: input.perPackKg,
  });
  if (!r) return null;
  // Bake in the silent shipping margin (never shown separately).
  const perPack = r.rate * SHIPPING_MARKUP;
  return {
    shippingCost: round2(perPack * packs),
    perPackCost: round2(perPack),
    courierName: r.courierName,
    etdDays: r.etdDays,
  };
}
