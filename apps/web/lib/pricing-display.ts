/**
 * Display-only helpers for the customer-facing price breakdown.
 *
 * Every customer-facing summary shows the SAME shape:
 *   Products → Packaging → Add-ons → Shipping → Payment fee (2%) → GST → Total
 * where the payment fee is shown PRE-GST and a single combined "GST" line carries
 * ALL the tax at once — product GST + packaging/add-on GST + shipping GST + the
 * GST charged on the payment fee. No CGST/SGST/IGST split in these summaries; the
 * formal Tax Invoice (components/orders/invoice-pdf.tsx) keeps the legal split.
 *
 * Fresh PricingBreakdown objects already expose `razorpayFeeBase`,
 * `razorpayFeeGst` and `gstTotal`. But some surfaces render persisted data — the
 * Order record (cgstAmount/sgstAmount/igstAmount + razorpayFee) or an older saved
 * quote payload whose pricing predates those fields — so these helpers re-derive
 * the split from the one always-present number: `razorpayFee = base × (1 + 18%)`.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** GST percentage Razorpay charges on its processing fee. */
export const PAYMENT_FEE_GST_PCT = 18;

/** GST rate baked into the courier/shipping rate (HSN 996812). */
export const SHIPPING_GST_PCT = 18;

/**
 * The TAXABLE (pre-GST) value of a GST-inclusive shipping charge. The courier
 * rate stored on an order (`shippingAmount`) is GST-inclusive, and shipping's GST
 * is already inside the combined GST line — so a summary must show the taxable
 * value here, or the shipping GST is counted twice (once in an "incl. GST"
 * shipping line, once in the GST line) and the rows over-shoot the grand total.
 */
export function shippingTaxable(
  shippingInclusive: number,
  gstPct: number = SHIPPING_GST_PCT
): number {
  return round2((Number(shippingInclusive) || 0) / (1 + gstPct / 100));
}

/**
 * Split a GST-inclusive payment fee into its pre-GST base and the GST on it.
 * `razorpayFee` stored/returned everywhere is base + fee-GST combined.
 */
export function splitPaymentFee(
  razorpayFee: number,
  feeGstPct: number = PAYMENT_FEE_GST_PCT
): { base: number; gst: number } {
  const fee = Number(razorpayFee) || 0;
  const base = round2(fee / (1 + feeGstPct / 100));
  return { base, gst: round2(fee - base) };
}

/**
 * The single all-in GST figure for a summary: goods/shipping GST (the
 * cgst+sgst+igst already computed on products, packaging, add-ons and shipping)
 * plus the GST charged on the payment fee.
 */
export function combinedGst(
  goodsCgst: number,
  goodsSgst: number,
  goodsIgst: number,
  razorpayFee: number
): number {
  const { gst } = splitPaymentFee(razorpayFee);
  return round2((Number(goodsCgst) || 0) + (Number(goodsSgst) || 0) + (Number(goodsIgst) || 0) + gst);
}
