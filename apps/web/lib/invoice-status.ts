/**
 * Single source of truth for "is this order a Tax Invoice yet?".
 *
 * Deliberately dependency-free so both server (invoice PDF) and client (order
 * pages) can share it without pulling in @react-pdf/renderer.
 */

/**
 * An order becomes a GST Tax Invoice only once it is FULLY paid.
 *
 * `Order.paidAt` must never be used to decide this: the price-lock path sets
 * paidAt as soon as a 10% advance is captured, so paidAt is true while ~90% of
 * the balance is still pending. Compare against the grand total instead.
 *
 * The 1-paisa epsilon absorbs rounding between the Decimal grand total and the
 * amount Razorpay actually captured.
 */
export function isOrderFullyPaid(amountPaid: number, grandTotal: number): boolean {
  return amountPaid > 0 && amountPaid >= grandTotal - 0.01;
}

/** The invoice's title — matches the heading rendered inside the PDF. */
export function invoiceLabel(amountPaid: number, grandTotal: number): string {
  return isOrderFullyPaid(amountPaid, grandTotal) ? 'Tax Invoice' : 'Proforma Invoice';
}
