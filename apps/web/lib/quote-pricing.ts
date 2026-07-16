import { computePricing } from '@giftcraft/pricing';
import type { PricingBreakdown } from '@giftcraft/types';
import { computeOrderShipping } from '@/lib/shipping';
import { resolveBuyerStateCode } from '@/lib/pincode-to-state';
import { SELLER_STATE_CODE } from '@/lib/constants';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface QuotePricingResult {
  pricing: PricingBreakdown;
  shippingFlat: number;
  buyerStateCode: string;
  isInterState: boolean;
  packQty: number;
}

/**
 * Single source of truth for pricing a quote payload server-side. Used by both
 * the order-creation route and the Razorpay order route so the amount charged
 * to the customer always equals the saved order's grand total.
 *
 * Never trust totals baked into the quote — older quotes stored
 * `quantity = packQuantity`, which double-counted the pack quantity. We always
 * price with one unit per pack (packQuantity is the multiplier).
 */
export function priceQuotePayload(payload: any, fallbackState?: string): QuotePricingResult {
  const products = payload?.products || [];
  const packQty = payload?.packQuantity || 1;

  const orderDeliveryMode: 'single' | 'individual' =
    (payload?.deliveryMode || 'single') === 'individual' ? 'individual' : 'single';

  const buyerStateCode =
    resolveBuyerStateCode(
      payload?.address?.state || fallbackState,
      payload?.address?.pincode || payload?.pincode || undefined
    ) || SELLER_STATE_CODE;
  const isInterState = buyerStateCode !== SELLER_STATE_CODE;

  // Use the exact shipping cost already quoted in the builder (Shiprocket
  // real-time rate, stored on shippingZone.shippingCost). Fall back to zone
  // pricing only for legacy quotes that never captured a quoted cost.
  const quotedShipping = Number(payload?.shippingZone?.shippingCost);
  const shippingFlat = Number.isFinite(quotedShipping)
    ? quotedShipping
    : computeOrderShipping({
        products: products.map((p: any) => ({
          weightG: p.weightG,
          quantity: 1,
          sellPrice: Number(p.sellPrice),
          dimensionL: p.dimensionL,
          dimensionW: p.dimensionW,
          dimensionH: p.dimensionH,
        })),
        zone: payload?.shippingZone,
        packQuantity: packQty,
        deliveryMode: orderDeliveryMode,
      }).shippingCost;

  const addonsPerUnit =
    (payload?.addons || []).reduce((sum: number, a: any) => sum + Number(a.price), 0) +
    (payload?.sleeve ? 60 : 0);

  const pricing = computePricing({
    products: products.map((p: any) => ({
      sellPrice: Number(p.sellPrice),
      quantity: 1,
      hsnCode: p.hsnCode || '4820',
      gstRate: p.gstRate || 18,
    })),
    packagingPerUnit: Number(payload?.packaging?.price) || 0,
    addonsPerUnit,
    packQuantity: packQty,
    shippingFlat,
    discount: payload?.discount || 0,
    sellerStateCode: SELLER_STATE_CODE,
    buyerStateCode,
    // 2% payment-processing fee + the 18% GST Razorpay charges on it (≈2.36%
    // effective), passed through to the customer per CLAUDE.md Rule 2.
    razorpayFeePct: 2,
    razorpayFeeGstPct: 18,
  });

  return { pricing, shippingFlat, buyerStateCode, isInterState, packQty };
}

/** The advance payment due for the price-lock path (10% of the grand total). */
export function advanceAmount(grandTotal: number): number {
  return round2(grandTotal * 0.1);
}
