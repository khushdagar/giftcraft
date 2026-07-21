import { z } from "zod";

// ── Canonical role enum (mirrors Prisma) ──────────────────
export const UserRoleSchema = z.enum([
  "super_admin",
  "company_admin",
  "company_member",
  "vendor",
  "reseller",
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

// ── REST envelope ─────────────────────────────────────────
export interface ApiSuccess<T> {
  success: true;
  data: T;
}
export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

// ── Builder state (shared by frontend + API) ──────────────
export const BuilderStateSchema = z.object({
  pack: z.array(z.string()).default([]),
  qty: z.number().int().min(1).default(50),
  pkg: z.string().default("white"),
  sleeve: z.boolean().default(false),
  addons: z.record(z.boolean()).default({}),
  logoUrl: z.string().nullable().default(null),
  notes: z.string().default(""),
  cardMsg: z.string().default(""),
  delivery: z.enum(["single", "individual"]).default("single"),
  delivDate: z.string().nullable().default(null),
});
export type BuilderState = z.infer<typeof BuilderStateSchema>;

// ── Quote / pricing breakdown ─────────────────────────────
export interface HsnGstLine {
  hsnCode: string;
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface PricingBreakdown {
  subtotal: number;            // products only (branding baked in) — DB column
  itemsSubtotal: number;       // products + packaging + add-ons — the SOW "Subtotal (before shipping, GST)" display line
  packaging: number;
  addons: number;
  shipping: number;            // what the customer pays for shipping — GST-INCLUSIVE
  shippingTaxable: number;     // shipping / 1.18 — the taxable value under HSN 996812
  shippingGst: number;         // shipping − shippingTaxable — the GST already inside the courier rate
  discount: number;
  cgst: number;                // includes the CGST half of shippingGst — legal tax-invoice split
  sgst: number;                // includes the SGST half of shippingGst — legal tax-invoice split
  igst: number;                // includes shippingGst when inter-state — legal tax-invoice split
  razorpayFee: number;         // payment-processing fee INCLUDING its own GST (base + fee GST)
  razorpayFeeBase: number;     // just the % fee, PRE-GST — the "Payment fee (2%)" display line
  razorpayFeeGst: number;      // GST charged on the payment fee — folded into gstTotal for display
  // Single all-in GST figure for customer-facing summaries: product GST +
  // packaging/add-on GST + shipping GST + payment-fee GST, combined. Formal tax
  // invoices still split this into cgst/sgst/igst above; summaries show one line.
  gstTotal: number;
  grandTotal: number;
  perPack: number;
  hsnBreakdown: HsnGstLine[];
}
