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

import type { PricingBreakdown, HsnGstLine } from "@giftcraft/types";

/** Courier / goods-transport service. Shipping is quoted GST-inclusive. */
export const SHIPPING_HSN_CODE = "996812";
export const SHIPPING_GST_RATE = 18;

export interface ProductForPricing {
  sellPrice: number;
  quantity: number;
  hsnCode: string;
  gstRate: number;
}

export interface PricingInput {
  // New: products with per-HSN GST
  products?: ProductForPricing[];
  packagingPerUnit: number;
  addonsPerUnit: number;
  packQuantity: number;
  shippingFlat: number;
  discount?: number;
  // GST
  sellerStateCode: string;        // "DL"
  buyerStateCode: string;         // e.g. "MH"
  // Razorpay — falls back to env defaults
  razorpayFeePct?: number;        // default 2
  razorpayFeeGstPct?: number;     // default 18
  // Legacy fallback (when products[] not provided)
  productsSubtotal?: number;
  effectiveGstRate?: number;       // blended rate for the pack
}

export function computePricing(input: PricingInput): PricingBreakdown {
  const {
    products, packagingPerUnit, addonsPerUnit, packQuantity,
    shippingFlat, discount = 0,
    sellerStateCode, buyerStateCode,
    razorpayFeePct = 2, razorpayFeeGstPct = 18,
    productsSubtotal: legacyProductsSubtotal,
    effectiveGstRate: legacyEffectiveGstRate,
  } = input;

  // Compute products subtotal using per-HSN data if available
  let productsSubtotal: number;
  let hsnBreakdown: HsnGstLine[] = [];

  if (products && products.length > 0) {
    // New per-HSN path
    const perPackProductCost = products.reduce(
      (sum, p) => sum + p.sellPrice * p.quantity,
      0
    );
    productsSubtotal = perPackProductCost * packQuantity;

    // Group products by HSN code
    const hsnMap = new Map<string, { rate: number; products: ProductForPricing[] }>();
    for (const product of products) {
      const hsnCode = product.hsnCode || "9999";
      if (!hsnMap.has(hsnCode)) {
        hsnMap.set(hsnCode, { rate: product.gstRate, products: [] });
      }
      hsnMap.get(hsnCode)!.products.push(product);
    }

    // Compute taxable amount and GST per HSN group
    const sameState = sellerStateCode.toUpperCase() === buyerStateCode.toUpperCase();
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    for (const [hsnCode, group] of hsnMap) {
      const groupTaxable = group.products.reduce(
        (sum, p) => sum + p.sellPrice * p.quantity * packQuantity,
        0
      );
      const groupGst = round2((groupTaxable * group.rate) / 100);
      const groupCgst = sameState ? round2(groupGst / 2) : 0;
      const groupSgst = sameState ? round2(groupGst / 2) : 0;
      const groupIgst = sameState ? 0 : groupGst;

      hsnBreakdown.push({
        hsnCode,
        gstRate: group.rate,
        taxableAmount: round2(groupTaxable),
        cgst: groupCgst,
        sgst: groupSgst,
        igst: groupIgst,
      });

      totalCgst += groupCgst;
      totalSgst += groupSgst;
      totalIgst += groupIgst;
    }

    // Add packaging/addons under default HSN 4819 at 18% GST
    const packagingTotal = packagingPerUnit * packQuantity;
    const addonsTotal = addonsPerUnit * packQuantity;
    const packagingAddonsTotal = packagingTotal + addonsTotal;
    const packagingAddonsGst = round2((packagingAddonsTotal * 18) / 100);
    const packagingAddonsCgst = sameState ? round2(packagingAddonsGst / 2) : 0;
    const packagingAddonsSgst = sameState ? round2(packagingAddonsGst / 2) : 0;
    const packagingAddonsIgst = sameState ? 0 : packagingAddonsGst;

    hsnBreakdown.push({
      hsnCode: "4819",
      gstRate: 18,
      taxableAmount: round2(packagingAddonsTotal),
      cgst: packagingAddonsCgst,
      sgst: packagingAddonsSgst,
      igst: packagingAddonsIgst,
    });

    totalCgst += packagingAddonsCgst;
    totalSgst += packagingAddonsSgst;
    totalIgst += packagingAddonsIgst;

    // Shipping (HSN 996812, 18%). The courier rate is already GST-INCLUSIVE, so
    // we reverse-calculate rather than adding tax on top:
    //     taxable = amount / 1.18
    //     gst     = taxable * 0.18
    //     taxable + gst === amount   (the customer pays no more than before)
    // Disclosing the embedded GST is what makes the invoice GST-compliant; the
    // taxable half feeds preTax and the GST half joins the CGST/SGST/IGST totals.
    const shippingTaxable = round2(shippingFlat / (1 + SHIPPING_GST_RATE / 100));
    const shippingGst = round2(shippingFlat - shippingTaxable);
    const shippingCgst = sameState ? round2(shippingGst / 2) : 0;
    const shippingSgst = sameState ? round2(shippingGst - shippingCgst) : 0;
    const shippingIgst = sameState ? 0 : shippingGst;

    if (shippingFlat > 0) {
      hsnBreakdown.push({
        hsnCode: SHIPPING_HSN_CODE,
        gstRate: SHIPPING_GST_RATE,
        taxableAmount: shippingTaxable,
        cgst: shippingCgst,
        sgst: shippingSgst,
        igst: shippingIgst,
      });

      totalCgst += shippingCgst;
      totalSgst += shippingSgst;
      totalIgst += shippingIgst;
    }

    const packaging = round2(packagingTotal);
    const addons = round2(addonsTotal);
    const preTax = Math.max(
      0,
      productsSubtotal + packaging + addons + shippingTaxable - discount
    );

    const gstTotal = totalCgst + totalSgst + totalIgst;
    const amountWithTax = preTax + gstTotal;
    const rpBase = round2((amountWithTax * razorpayFeePct) / 100);
    const rpGst = round2((rpBase * razorpayFeeGstPct) / 100);
    const razorpayFee = round2(rpBase + rpGst);

    const grandTotal = round2(amountWithTax + razorpayFee);
    const perPack = packQuantity > 0 ? round2(grandTotal / packQuantity) : 0;

    return {
      subtotal: round2(productsSubtotal),
      itemsSubtotal: round2(productsSubtotal + packaging + addons),
      packaging,
      addons,
      shipping: round2(shippingFlat),
      shippingTaxable,
      shippingGst,
      discount: round2(discount),
      cgst: round2(totalCgst),
      sgst: round2(totalSgst),
      igst: round2(totalIgst),
      razorpayFee,
      grandTotal,
      perPack,
      hsnBreakdown,
    };
  } else {
    // Legacy fallback path (for backward compatibility)
    const { quantity = packQuantity } = input as any;
    if (!legacyProductsSubtotal || legacyEffectiveGstRate === undefined) {
      throw new Error(
        "computePricing requires either products[] or productsSubtotal+effectiveGstRate"
      );
    }

    const packaging = packagingPerUnit * quantity;
    const addons = addonsPerUnit * quantity;
    const subtotal = legacyProductsSubtotal;
    const preTax = Math.max(0, subtotal + packaging + addons + shippingFlat - discount);

    const sameState = sellerStateCode.toUpperCase() === buyerStateCode.toUpperCase();
    const gstTotal = round2((preTax * legacyEffectiveGstRate) / 100);
    const cgst = sameState ? round2(gstTotal / 2) : 0;
    const sgst = sameState ? round2(gstTotal / 2) : 0;
    const igst = sameState ? 0 : gstTotal;

    const amountWithTax = preTax + gstTotal;
    const rpBase = round2((amountWithTax * razorpayFeePct) / 100);
    const rpGst = round2((rpBase * razorpayFeeGstPct) / 100);
    const razorpayFee = round2(rpBase + rpGst);

    const grandTotal = round2(amountWithTax + razorpayFee);
    const perPack = quantity > 0 ? round2(grandTotal / quantity) : 0;

    return {
      subtotal: round2(subtotal),
      itemsSubtotal: round2(subtotal + packaging + addons),
      packaging: round2(packaging),
      addons: round2(addons),
      shipping: round2(shippingFlat),
      // Legacy path taxes preTax as one blob, so shipping has no separate
      // taxable/GST split to report.
      shippingTaxable: round2(shippingFlat),
      shippingGst: 0,
      discount: round2(discount),
      cgst,
      sgst,
      igst,
      razorpayFee,
      grandTotal,
      perPack,
      hsnBreakdown: [],
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
