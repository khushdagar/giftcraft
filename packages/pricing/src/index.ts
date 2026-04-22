/**
 * @giftcraft/pricing
 *
 * Single source of truth for every rupee the platform calculates. Sprint 1
 * ships a working but minimal implementation — just enough for the Builder
 * and Checkout pages to show real totals. Sprint 3 will fill in:
 *   · tiered quantity discounts per product
 *   · true HSN-aware GST split (CGST+SGST vs IGST) using seller & buyer state
 *   · coupon application logic with stacking rules
 *   · shipping zone lookup
 *   · Razorpay fee calculation with its own GST-on-fee
 *
 * CLAUDE.md invariant: branding cost is already baked into sellPrice — we
 * never add a separate "Branding" line item. Razorpay fee is always shown
 * as its own line, passed through to the customer.
 */

import type { PricingBreakdown } from "@giftcraft/types";

export interface PricingInput {
  productsSubtotal: number;       // sum of (sellPrice * qty) across pack items
  packagingPerUnit: number;
  addonsPerUnit: number;
  quantity: number;
  shippingFlat: number;
  discount?: number;
  // GST
  sellerStateCode: string;        // "DL"
  buyerStateCode: string;         // e.g. "MH"
  effectiveGstRate: number;       // blended rate for the pack — Sprint 3 computes per-HSN
  // Razorpay — falls back to env defaults
  razorpayFeePct?: number;        // default 2
  razorpayFeeGstPct?: number;     // default 18
}

export function computePricing(input: PricingInput): PricingBreakdown {
  const {
    productsSubtotal, packagingPerUnit, addonsPerUnit, quantity,
    shippingFlat, discount = 0,
    sellerStateCode, buyerStateCode, effectiveGstRate,
    razorpayFeePct = 2, razorpayFeeGstPct = 18,
  } = input;

  const packaging = packagingPerUnit * quantity;
  const addons = addonsPerUnit * quantity;
  const subtotal = productsSubtotal;

  const preTax = Math.max(0, subtotal + packaging + addons + shippingFlat - discount);

  // Same-state → CGST+SGST split. Otherwise IGST.
  const sameState = sellerStateCode.toUpperCase() === buyerStateCode.toUpperCase();
  const gstTotal = round2((preTax * effectiveGstRate) / 100);
  const cgst = sameState ? round2(gstTotal / 2) : 0;
  const sgst = sameState ? round2(gstTotal / 2) : 0;
  const igst = sameState ? 0 : gstTotal;

  // Razorpay fee is calculated on (preTax + gst), and carries its own GST.
  const amountWithTax = preTax + gstTotal;
  const rpBase = round2((amountWithTax * razorpayFeePct) / 100);
  const rpGst = round2((rpBase * razorpayFeeGstPct) / 100);
  const razorpayFee = round2(rpBase + rpGst);

  const grandTotal = round2(amountWithTax + razorpayFee);
  const perPack = quantity > 0 ? round2(grandTotal / quantity) : 0;

  return {
    subtotal: round2(subtotal),
    packaging: round2(packaging),
    addons: round2(addons),
    shipping: round2(shippingFlat),
    discount: round2(discount),
    cgst, sgst, igst,
    razorpayFee,
    grandTotal,
    perPack,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
