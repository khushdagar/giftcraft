/**
 * Reusable Zod field schemas for API routes, sharing the exact same rules the
 * client-side forms use (see `lib/validation.ts`) so a value that passes in the
 * browser also passes on the server — and vice versa.
 */
import { z } from "zod";
import {
  EMAIL_REGEX,
  GSTIN_REGEX,
  IFSC_REGEX,
  PAN_REGEX,
  PHONE_REGEX,
  PINCODE_REGEX,
} from "./validation";

export const zEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(EMAIL_REGEX, "Enter a valid email address");

export const zPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => PHONE_REGEX.test(v), "Enter a valid 10-digit Indian mobile number");

export const zPincode = z
  .string()
  .trim()
  .regex(PINCODE_REGEX, "Enter a valid 6-digit pincode");

export const zGstin = z
  .string()
  .trim()
  .toUpperCase()
  .regex(GSTIN_REGEX, "Enter a valid 15-character GSTIN");

export const zPan = z
  .string()
  .trim()
  .toUpperCase()
  .regex(PAN_REGEX, "Enter a valid 10-character PAN");

export const zIfsc = z
  .string()
  .trim()
  .toUpperCase()
  .regex(IFSC_REGEX, "Enter a valid 11-character IFSC code");

export const zPersonName = (label = "Name") =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(100, `${label} must be under 100 characters`)
    .regex(/[a-zA-Z]/, `Enter a valid ${label.toLowerCase()}`);

/** Accepts "acme.com" as well as "https://acme.com" — matching validateUrl(). */
export const zUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => {
    try {
      const url = new URL(v.startsWith("http") ? v : `https://${v}`);
      return url.hostname.includes(".");
    } catch {
      return false;
    }
  }, "Enter a valid URL");
