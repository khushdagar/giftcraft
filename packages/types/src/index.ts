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
export interface PricingBreakdown {
  subtotal: number;
  packaging: number;
  addons: number;
  shipping: number;
  discount: number;
  cgst: number;
  sgst: number;
  igst: number;
  razorpayFee: number;
  grandTotal: number;
  perPack: number;
}
