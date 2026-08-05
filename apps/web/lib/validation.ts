/**
 * Shared client + server form validation helpers.
 *
 * Every validator returns `null` when the value is acceptable, or a short
 * human-readable message when it is not. That makes them composable:
 *
 *   const errors = validateFields({
 *     email: validateEmail(form.email),
 *     phone: validatePhone(form.phone),
 *   });
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/** Indian mobile: 10 digits starting 6-9, optional +91 / 0 prefix. */
export const PHONE_REGEX = /^(?:\+?91[-\s]?|0)?[6-9]\d{9}$/;

export const PINCODE_REGEX = /^[1-9]\d{5}$/;

export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$/;

export const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z\d]{6}$/;

/** Digits only, ignoring spaces/dashes/parens — useful before length checks. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function validateRequired(value: string | null | undefined, label = "This field"): string | null {
  if (!value || !value.trim()) return `${label} is required`;
  return null;
}

export function validateEmail(value: string, { required = true } = {}): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return required ? "Email is required" : null;
  if (trimmed.length > 254) return "Email is too long";
  if (!EMAIL_REGEX.test(trimmed)) return "Enter a valid email address";
  return null;
}

export function validatePhone(value: string, { required = true } = {}): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return required ? "Phone number is required" : null;
  if (!PHONE_REGEX.test(trimmed.replace(/[\s-]/g, ""))) {
    return "Enter a valid 10-digit Indian mobile number";
  }
  return null;
}

export function validatePincode(value: string, { required = true } = {}): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return required ? "Pincode is required" : null;
  if (!PINCODE_REGEX.test(trimmed)) return "Enter a valid 6-digit pincode";
  return null;
}

export function validateName(
  value: string,
  label = "Name",
  { required = true, min = 2, max = 100 } = {},
): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return required ? `${label} is required` : null;
  if (trimmed.length < min) return `${label} must be at least ${min} characters`;
  if (trimmed.length > max) return `${label} must be under ${max} characters`;
  if (!/[a-zA-Z]/.test(trimmed)) return `Enter a valid ${label.toLowerCase()}`;
  return null;
}

export function validateText(
  value: string,
  label: string,
  { required = true, min = 1, max = 2000 } = {},
): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return required ? `${label} is required` : null;
  if (trimmed.length < min) return `${label} must be at least ${min} characters`;
  if (trimmed.length > max) return `${label} must be under ${max} characters`;
  return null;
}

export function validateGstin(value: string, { required = false } = {}): string | null {
  const trimmed = (value || "").trim().toUpperCase();
  if (!trimmed) return required ? "GSTIN is required" : null;
  if (!GSTIN_REGEX.test(trimmed)) return "Enter a valid 15-character GSTIN";
  return null;
}

export function validatePan(value: string, { required = false } = {}): string | null {
  const trimmed = (value || "").trim().toUpperCase();
  if (!trimmed) return required ? "PAN is required" : null;
  if (!PAN_REGEX.test(trimmed)) return "Enter a valid 10-character PAN";
  return null;
}

export function validateIfsc(value: string, { required = false } = {}): string | null {
  const trimmed = (value || "").trim().toUpperCase();
  if (!trimmed) return required ? "IFSC code is required" : null;
  if (!IFSC_REGEX.test(trimmed)) return "Enter a valid 11-character IFSC code";
  return null;
}

export function validateNumber(
  value: string | number,
  label: string,
  { required = true, min, max, integer = true }: { required?: boolean; min?: number; max?: number; integer?: boolean } = {},
): string | null {
  const raw = typeof value === "number" ? String(value) : (value || "").trim();
  if (!raw) return required ? `${label} is required` : null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return `${label} must be a number`;
  if (integer && !Number.isInteger(num)) return `${label} must be a whole number`;
  if (min !== undefined && num < min) return `${label} must be at least ${min}`;
  if (max !== undefined && num > max) return `${label} must be at most ${max}`;
  return null;
}

export function validateUrl(value: string, { required = false } = {}): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return required ? "URL is required" : null;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!url.hostname.includes(".")) return "Enter a valid URL";
    return null;
  } catch {
    return "Enter a valid URL";
  }
}

export function validatePassword(value: string, { min = 8 } = {}): string | null {
  if (!value) return "Password is required";
  if (value.length < min) return `Password must be at least ${min} characters`;
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    return "Password must contain both letters and a number";
  }
  return null;
}

/** Strips null entries so `Object.keys(errors).length` reflects real problems. */
export function collectErrors<T extends Record<string, string | null>>(
  candidates: T,
): Partial<Record<keyof T, string>> {
  const out: Partial<Record<keyof T, string>> = {};
  for (const [key, message] of Object.entries(candidates)) {
    if (message) out[key as keyof T] = message;
  }
  return out;
}
