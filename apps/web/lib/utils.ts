import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a rupee value — tabular, no symbol decoration. */
export function formatRupees(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return "₹0";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "₹0";
  // Show paise only when the amount isn't a whole rupee, so clean prices stay
  // clean (₹590) while fractional ones display precisely (₹174.80) — this keeps
  // line items and totals visibly adding up instead of rounding each line.
  const hasPaise = Math.round(n * 100) % 100 !== 0;
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  })}`;
}
