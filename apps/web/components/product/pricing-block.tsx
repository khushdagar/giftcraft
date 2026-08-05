"use client";

import { useState, useEffect, useRef, ChangeEvent, FocusEvent } from "react";
import { ChevronDown } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { formatRupees } from "@/lib/utils";

interface PriceTier {
  tier: number;
  minQty: number;
  maxQty: number | null;
  sellPrice: number;
}

function AnimatedNumber({
  value,
  formatter = (n: number) => n.toString(),
}: {
  value: number;
  formatter?: (n: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number | null>(null);
  const startRef = useRef(Date.now());
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setDisplayValue(value);
      return;
    }

    const start = value - displayValue;
    if (Math.abs(start) < 1) {
      setDisplayValue(value);
      return;
    }

    startRef.current = Date.now();
    const duration = 400;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setDisplayValue(Math.round(displayValue + start * eased));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value, reduce, displayValue]);

  return <>{formatter(displayValue)}</>;
}

interface PricingBlockProps {
  priceTiers: PriceTier[];
  gstRate: number;
  hsnCode?: string;
  printingTechnique?: string;
  moq?: number;
  onQtyChange?: (qty: number) => void;
}

// Turn the stored enum (e.g. "laser_engraving") into a readable label
function brandingLabelFor(technique?: string): string {
  if (!technique || technique === "none") return "";
  return technique
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function PricingBlock({
  priceTiers,
  gstRate,
  hsnCode,
  printingTechnique,
  moq,
  onQtyChange,
}: PricingBlockProps) {
  const brandingLabel = brandingLabelFor(printingTechnique);
  // Minimum order quantity is the product's own MOQ (falls back to the first tier).
  const minAllowedQty = moq && moq > 0 ? moq : priceTiers[0]?.minQty || 25;
  const [qty, setQty] = useState(minAllowedQty);
  const inputRef = useRef<HTMLInputElement>(null);

  // Notify parent when quantity changes
  useEffect(() => {
    onQtyChange?.(qty);
  }, [qty, onQtyChange]);

  const sortedTiers = [...priceTiers].sort((a, b) => a.tier - b.tier);
  const activeTier =
    sortedTiers.find(
      (t) => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty),
    ) || sortedTiers[0];
  const subtotal = activeTier ? activeTier.sellPrice * qty : 0;
  const firstTier = sortedTiers[0];
  const savings =
    activeTier && firstTier && activeTier.tier > 1
      ? (firstTier.sellPrice - activeTier.sellPrice) * qty
      : 0;

  const isUnderMinimum = qty < minAllowedQty;

  // Mobile-only collapse for the tier table — six rows push the Add to Pack
  // button off screen. Collapsed shows just the tier the current quantity is in;
  // `firstOrderableIdx` is the fallback row when the quantity is still below MOQ
  // and no tier is active.
  const [tiersOpen, setTiersOpen] = useState(false);
  const firstOrderableIdx = sortedTiers.findIndex(
    (t) => t.maxQty === null || t.maxQty >= minAllowedQty,
  );

  return (
    <div className="mt-8 space-y-6 rounded-md border border-bdr bg-white p-6 shadow-card">
      {/* Quantity input */}
      <div>
      <div className="flex flex-row justify-between items-start">
        <div>
          <p className="mb-2 text-sm font-medium text-ink">How many packs?</p>
          <p className="mb-3 text-xs text-ink-3">
            Price adjusts based on quantity tier
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQty(Math.max(minAllowedQty, qty - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-bdr text-lg hover:border-em"
          >
            −
          </button>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={String(qty)}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = e.currentTarget.value.replace(/[^0-9]/g, "");
              if (value === "") {
                // Allow empty temporarily
                return;
              }
              const num = parseInt(value, 10);
              if (!isNaN(num)) {
                // Don't enforce minimum during typing - let user enter any valid number
                setQty(num);
              }
            }}
            onBlur={(e: FocusEvent<HTMLInputElement>) => {
              const value = e.currentTarget.value.replace(/[^0-9]/g, "");
              if (value === "" || parseInt(value, 10) < minAllowedQty) {
                setQty(minAllowedQty);
              } else {
                const num = parseInt(value, 10);
                setQty(num);
              }
            }}
            onFocus={(e: FocusEvent<HTMLInputElement>) => {
              // Select all text so typing replaces it
              e.currentTarget.select();
            }}
            className="w-20 text-center text-lg font-semibold text-ink"
            style={{ border: "2px solid #e4e4e7" }}
          />
          <button
            onClick={() => setQty(qty + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-bdr text-lg hover:border-em"
          >
            +
          </button>
        </div>
      </div>

      {/* MOQ Warning Message — full-width banner below the quantity row */}
      {isUnderMinimum && (
        <div className="mt-3 flex items-start gap-2.5 rounded-md border border-gold-200 bg-gold-50 px-3.5 py-2.5">
          <span className="text-base leading-none text-gold-700">ⓘ</span>
          <div>
            <p className="text-xs font-semibold text-gold-700">
              Minimum order quantity is {minAllowedQty} units
            </p>
            <p className="mt-0.5 text-[11px] text-gold-700/80">
              Please increase the quantity to {minAllowedQty} or more to place an order for this product.
            </p>
          </div>
        </div>
      )}
      </div>

      {/* Pricing table */}
      <div>
        <div className="overflow-hidden rounded-md border border-bdr">
          {/* Table header */}
          <div className="grid grid-cols-3 gap-4 bg-elevated px-4 py-3">
            <span className="text-xs font-semibold uppercase text-ink-3">
              Quantity
            </span>
            <span className="text-xs font-semibold uppercase text-ink-3">
              Per Unit{brandingLabel ? ` (Incl. ${brandingLabel})` : ""}
            </span>
            <span className="text-right text-xs font-semibold uppercase text-ink-3">
              Total at Min Qty
            </span>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-bdr">
            {sortedTiers.map((tier, idx) => {
              const isActive = activeTier?.tier === tier.tier;
              // A tier that ends below the MOQ can never be ordered — disable it.
              const isBelowMoq =
                tier.maxQty !== null && tier.maxQty < minAllowedQty;
              const totalAtMin = tier.sellPrice * tier.minQty;
              // Collapsed on mobile: only the tier the current quantity falls in
              // stays visible (or the first orderable one if the quantity is
              // still below MOQ). Desktop always shows the full table.
              const keepWhenCollapsed = activeTier
                ? isActive
                : idx === firstOrderableIdx;
              const collapsedClass =
                !tiersOpen && !keepWhenCollapsed ? "hidden lg:grid" : "";
              return (
                <button
                  key={tier.tier}
                  disabled={isBelowMoq}
                  onClick={() => {
                    if (isBelowMoq) return;
                    setQty(tier.minQty);
                    if (inputRef.current) {
                      inputRef.current.value = String(tier.minQty);
                    }
                  }}
                  className={`w-full grid grid-cols-3 gap-4 px-4 py-3 transition text-left ${collapsedClass} ${
                    isBelowMoq
                      ? "cursor-not-allowed bg-elevated/40 text-ink-3 opacity-50"
                      : isActive
                        ? "border-l-4 border-l-em bg-em/5 font-semibold text-em hover:bg-elevated"
                        : "hover:bg-elevated"
                  }`}
                >
                  <span className="text-sm">
                    {tier.minQty}–{tier.maxQty ? tier.maxQty : "∞"} units
                    {isBelowMoq && (
                      <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide">
                        · below MOQ
                      </span>
                    )}
                  </span>
                  <span className="tabnum text-sm">
                    {formatRupees(tier.sellPrice)}
                  </span>
                  <span className="tabnum text-right text-sm">
                    {formatRupees(totalAtMin)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mobile-only expander for the hidden tiers. */}
          {sortedTiers.length > 1 && (
            <button
              type="button"
              onClick={() => setTiersOpen((v) => !v)}
              aria-expanded={tiersOpen}
              className="flex w-full items-center justify-center gap-1 border-t border-bdr bg-elevated/50 py-2.5 text-xs font-semibold text-em lg:hidden"
            >
              {tiersOpen
                ? "Hide price tiers"
                : `View all ${sortedTiers.length} price tiers`}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${tiersOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-3">
          All prices include standard branding. Prices exclusive of GST, packaging, shipping and payment processing fees.
        </p>
        {/* <p className="mt-1 text-xs text-ink-3">
          GST: {gstRate}%{hsnCode ? ` (HSN ${hsnCode})` : ""} — CGST+SGST or IGST
          applied at checkout based on delivery location.
        </p> */}
      </div>

      {/* Final pricing */}
      <div className="border-t border-bdr pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-ink-2">
            {qty} units × {formatRupees(activeTier?.sellPrice || 0)}
          </span>
          <div className="text-right">
            <span className="font-black tabnum text-3xl text-ink">
              <AnimatedNumber value={subtotal} formatter={formatRupees} />
            </span>
            {/* <p className="mt-1 text-xs text-ink-3">
              ⚪ GST packaging & shipping
            </p> */}
          </div>
        </div>
      </div>

      {savings > 0 && (
        <div className="rounded-md-p bg-gold-50 px-3 py-2">
          <p className="text-xs font-semibold text-gold-700">
            ✓ You save {formatRupees(savings)}
          </p>
        </div>
      )}
    </div>
  );
}
