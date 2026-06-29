/**
 * Canonical shipping calculator — SINGLE source of truth for every shipping
 * rupee on the platform (builder, checkout, order creation, quote PDF, admin).
 *
 * SOW (Stage 1) model: "rate per kg per zone" — the shipping cost is the
 * admin-configured zone rate × the parcel weight (NOT a flat per-pack fee and
 * NOT a live carrier rate; Shiprocket live rates arrive in Stage 2).
 *
 *   · Single delivery    → all packs go as ONE consolidated shipment.
 *   · Individual delivery → each pack ships separately (naturally costs more,
 *                           plus an optional per-zone surcharge %).
 *   · Free-shipping       → order subtotal ≥ zone threshold ⇒ shipping is ₹0.
 *
 * Weight is taken from each product's `weightG` (grams). Products missing a
 * weight fall back to DEFAULT_PRODUCT_WEIGHT_G so shipping is never ₹0 by
 * accident.
 */

/**
 * Silent margin baked into every shipping fee. The customer-facing shipping
 * charge is the raw courier/zone rate × this multiplier (currently +25%). It is
 * never shown as a separate line — it's part of the quoted shipping fee, so it
 * flows through the builder, checkout, quote, order and invoice automatically.
 * Applied at the two rate producers (computeShipping + getShiprocketShippingCost)
 * exactly once, so it never double-counts.
 */
export const SHIPPING_MARKUP = 1.25;

/** Fallback per-unit weight (grams) when a product has no weight saved. */
export const DEFAULT_PRODUCT_WEIGHT_G = 500;

/**
 * Days spent in-house on assembly, branding application and QC before a finished
 * order is dispatched. Added on top of the product's vendor lead time and before
 * the courier transit window. SINGLE source of truth — used by the builder's
 * delivery estimate and the public pricing page so they never disagree.
 */
export const ASSEMBLY_QC_DAYS = 4;

/** Vendor lead time (days) assumed when a product has none saved. */
export const DEFAULT_LEAD_TIME_DAYS = 14;

/**
 * End-to-end delivery window (days from order placement):
 *   vendor lead time + assembly/QC + courier transit (zone ETA).
 * Used wherever a "your order arrives in X–Y days" estimate is shown.
 */
export function deliveryWindowDays(input: {
  leadTimeDays: number;
  etaMinDays: number;
  etaMaxDays: number;
}): { min: number; max: number } {
  const lead = input.leadTimeDays > 0 ? input.leadTimeDays : DEFAULT_LEAD_TIME_DAYS;
  return {
    min: lead + ASSEMBLY_QC_DAYS + input.etaMinDays,
    max: lead + ASSEMBLY_QC_DAYS + input.etaMaxDays,
  };
}

/**
 * Fallback per-unit box dimensions (cm) when a product has no dimensions saved.
 * A typical small gift item (~20×15×10) so volumetric weight is never ₹0 by
 * accident for a bulky-but-light pack.
 */
export const DEFAULT_PRODUCT_DIM_CM = { l: 20, w: 15, h: 10 };

/**
 * Courier volumetric divisor. Shiprocket (and most Indian couriers) bill the
 * GREATER of dead weight and volumetric weight, where
 *   volumetric kg = (L × W × H in cm) / 5000.
 */
export const VOLUMETRIC_DIVISOR = 5000;

export interface ShippingZoneRates {
  /** ₹ charged per kg of parcel weight. */
  ratePerKg: number;
  /** Minimum shipping charge applied per shipment. */
  minCharge: number;
  /** Order subtotal at/above which shipping is free (null = never free). */
  freeShippingThreshold?: number | null;
  /** Extra % added to individual-delivery shipping (0 = none). */
  individualSurchargePct?: number;
}

export interface ShippingCalcInput extends ShippingZoneRates {
  /** Weight of ONE gift pack in kg (one of each selected product). */
  perPackWeightKg: number;
  /** Number of gift packs in the order. */
  packQuantity: number;
  /** 'single' = consolidated, 'individual' = per-pack shipments. */
  deliveryMode: 'single' | 'individual';
  /** Pre-tax products subtotal — used for the free-shipping threshold. */
  orderSubtotal: number;
}

export interface ShippingCalcResult {
  /** Total shipping charged for the whole order (₹, rounded to paise). */
  shippingCost: number;
  /** Shipping attributable to one pack (₹) — for the "₹X per pack" copy. */
  perPackCost: number;
  /** Billable (rounded-up) weight used for the calculation, in kg. */
  billableWeightKg: number;
  /** True when the free-shipping threshold zeroed the cost. */
  isFree: boolean;
}

/** Rates used when no shipping zone has been resolved yet (no pincode entered). */
export const DEFAULT_ZONE_RATES: ShippingZoneRates = {
  ratePerKg: 60,
  minCharge: 100,
  freeShippingThreshold: null,
  individualSurchargePct: 15,
};

/** A shipping zone as stored in the builder/quote payload (may be legacy-shaped). */
export interface ZoneLike {
  ratePerKg?: number | null;
  minCharge?: number | null;
  freeShippingThreshold?: number | null;
  individualSurchargePct?: number | null;
  flatRate?: number | null;
}

/**
 * Normalise a zone record (new or legacy) into concrete rates, with sensible
 * fallbacks: missing per-kg rate ⇒ 0 (so cost floors at minCharge), missing
 * minCharge ⇒ the legacy flatRate, no zone at all ⇒ DEFAULT_ZONE_RATES.
 */
export function zoneRatesFrom(zone: ZoneLike | null | undefined): ShippingZoneRates {
  if (!zone) return DEFAULT_ZONE_RATES;
  return {
    ratePerKg: zone.ratePerKg != null ? Number(zone.ratePerKg) : 0,
    minCharge:
      zone.minCharge != null
        ? Number(zone.minCharge)
        : zone.flatRate != null
          ? Number(zone.flatRate)
          : DEFAULT_ZONE_RATES.minCharge,
    freeShippingThreshold:
      zone.freeShippingThreshold != null ? Number(zone.freeShippingThreshold) : null,
    individualSurchargePct:
      zone.individualSurchargePct != null ? Number(zone.individualSurchargePct) : 0,
  };
}

/**
 * High-level convenience used by the builder, checkout and order creation so
 * all three compute shipping identically from the cart + resolved zone.
 */
export function computeOrderShipping(input: {
  products: Array<{
    weightG?: number | null;
    quantity?: number | null;
    sellPrice?: number | null;
    dimensionL?: number | null;
    dimensionW?: number | null;
    dimensionH?: number | null;
  }>;
  zone: ZoneLike | null | undefined;
  packQuantity: number;
  deliveryMode: 'single' | 'individual';
}): ShippingCalcResult {
  const rates = zoneRatesFrom(input.zone);
  // Bill on the greater of dead weight and volumetric weight (courier standard).
  const packKg = perPackBillableKg(input.products);
  const perPackProductCost = input.products.reduce(
    (sum, p) => sum + (Number(p.sellPrice) || 0) * (p.quantity != null && p.quantity > 0 ? p.quantity : 1),
    0,
  );
  const orderSubtotal = perPackProductCost * Math.max(0, input.packQuantity);
  return computeShipping({
    ...rates,
    perPackWeightKg: packKg,
    packQuantity: input.packQuantity,
    deliveryMode: input.deliveryMode,
    orderSubtotal,
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Couriers bill by whole kg — round up, with a 1 kg floor for any real parcel. */
function billableKg(weightKg: number): number {
  if (weightKg <= 0) return 0;
  return Math.max(1, Math.ceil(weightKg));
}

/**
 * Convert a list of builder/cart products into the weight of a SINGLE pack (kg).
 * Each pack holds `quantity` units of each product.
 */
export function perPackWeightKg(
  products: Array<{ weightG?: number | null; quantity?: number | null }>,
): number {
  const grams = products.reduce((sum, p) => {
    const w = p.weightG != null && p.weightG > 0 ? p.weightG : DEFAULT_PRODUCT_WEIGHT_G;
    const qty = p.quantity != null && p.quantity > 0 ? p.quantity : 1;
    return sum + w * qty;
  }, 0);
  return grams / 1000;
}

/**
 * Sum the volume (cm³) of a SINGLE gift pack from its products' box dimensions.
 * Products missing a dimension fall back to DEFAULT_PRODUCT_DIM_CM.
 */
export function perPackVolumeCm3(
  products: Array<{
    dimensionL?: number | null;
    dimensionW?: number | null;
    dimensionH?: number | null;
    quantity?: number | null;
  }>,
): number {
  return products.reduce((sum, p) => {
    const l = p.dimensionL != null && p.dimensionL > 0 ? p.dimensionL : DEFAULT_PRODUCT_DIM_CM.l;
    const w = p.dimensionW != null && p.dimensionW > 0 ? p.dimensionW : DEFAULT_PRODUCT_DIM_CM.w;
    const h = p.dimensionH != null && p.dimensionH > 0 ? p.dimensionH : DEFAULT_PRODUCT_DIM_CM.h;
    const qty = p.quantity != null && p.quantity > 0 ? p.quantity : 1;
    return sum + l * w * h * qty;
  }, 0);
}

/** Volumetric weight (kg) of a SINGLE gift pack: volume(cm³) / 5000. */
export function perPackVolumetricKg(
  products: Array<{
    dimensionL?: number | null;
    dimensionW?: number | null;
    dimensionH?: number | null;
    quantity?: number | null;
  }>,
): number {
  return perPackVolumeCm3(products) / VOLUMETRIC_DIVISOR;
}

/**
 * Billable weight (kg) of a SINGLE gift pack — the GREATER of its dead weight
 * and its volumetric weight, mirroring how couriers actually charge.
 */
export function perPackBillableKg(
  products: Array<{
    weightG?: number | null;
    dimensionL?: number | null;
    dimensionW?: number | null;
    dimensionH?: number | null;
    quantity?: number | null;
  }>,
): number {
  return Math.max(perPackWeightKg(products), perPackVolumetricKg(products));
}

/**
 * Compute shipping for an order. Pure function — no DB, no env.
 */
export function computeShipping(input: ShippingCalcInput): ShippingCalcResult {
  const {
    ratePerKg,
    minCharge,
    individualSurchargePct = 0,
    perPackWeightKg: packKg,
    packQuantity,
    deliveryMode,
  } = input;

  const packs = Math.max(0, packQuantity);

  // Free shipping is disabled platform-wide — shipping is always charged.

  let shippingCost: number;
  let billable: number;

  if (deliveryMode === 'individual') {
    // Each pack is its own shipment: min charge applies per pack.
    const perPackBillable = billableKg(packKg);
    const perPackRaw = Math.max(minCharge, perPackBillable * ratePerKg);
    const perPackWithSurcharge = perPackRaw * (1 + (individualSurchargePct || 0) / 100);
    shippingCost = round2(perPackWithSurcharge * packs);
    billable = round2(perPackBillable * packs);
  } else {
    // Single consolidated shipment for all packs.
    const totalBillable = billableKg(packKg * packs);
    shippingCost = round2(Math.max(minCharge, totalBillable * ratePerKg));
    billable = totalBillable;
  }

  // Bake in the silent shipping margin (never shown separately).
  shippingCost = round2(shippingCost * SHIPPING_MARKUP);
  const perPackCost = packs > 0 ? round2(shippingCost / packs) : 0;

  return { shippingCost, perPackCost, billableWeightKg: billable, isFree: false };
}
