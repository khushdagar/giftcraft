'use client';

import { useState, useEffect, useRef, ChangeEvent, FocusEvent } from 'react';
import { useReducedMotion } from 'framer-motion';
import { formatRupees } from '@/lib/utils';

interface PriceTier {
  tier: number;
  minQty: number;
  maxQty: number | null;
  sellPrice: number;
}

function AnimatedNumber({ value, formatter = (n: number) => n.toString() }: { value: number; formatter?: (n: number) => string }) {
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
  onQtyChange?: (qty: number) => void;
}

export function PricingBlock({ priceTiers, gstRate, hsnCode, onQtyChange }: PricingBlockProps) {
  const minAllowedQty = priceTiers[0]?.minQty || 25;
  const [qty, setQty] = useState(minAllowedQty);
  const inputRef = useRef<HTMLInputElement>(null);

  // Notify parent when quantity changes
  useEffect(() => {
    onQtyChange?.(qty);
  }, [qty, onQtyChange]);

  const sortedTiers = [...priceTiers].sort((a, b) => a.tier - b.tier);
  const activeTier = sortedTiers.find((t) => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty)) || sortedTiers[0];
  const subtotal = activeTier ? activeTier.sellPrice * qty : 0;
  const firstTier = sortedTiers[0];
  const savings = activeTier && firstTier && activeTier.tier > 1 ? (firstTier.sellPrice - activeTier.sellPrice) * qty : 0;

  const isUnderMinimum = qty < minAllowedQty;

  return (
    <div className="mt-8 space-y-6 rounded-md border border-bdr bg-white p-6 shadow-card">
      {/* Quantity input */}
      <div>
        <p className="mb-2 text-sm font-medium text-ink">How many packs?</p>
        <p className="mb-3 text-xs text-ink-3">Price adjusts based on quantity tier</p>
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
              const value = e.currentTarget.value.replace(/[^0-9]/g, '');
              if (value === '') {
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
              const value = e.currentTarget.value.replace(/[^0-9]/g, '');
              if (value === '' || parseInt(value, 10) < minAllowedQty) {
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
            style={{ border: '2px solid #e4e4e7' }}
          />
          <button
            onClick={() => setQty(qty + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-bdr text-lg hover:border-em"
          >
            +
          </button>
        </div>

        {/* MOQ Warning Message */}
        {isUnderMinimum && (
          <div className="mt-3 rounded-md bg-em/10 px-3 py-2">
            <p className="text-xs font-semibold text-em">
              ⓘ Minimum order quantity of this product is {minAllowedQty} units
            </p>
          </div>
        )}
      </div>

      {/* Pricing table */}
      <div>
        <div className="overflow-hidden rounded-md border border-bdr">
          {/* Table header */}
          <div className="grid grid-cols-3 gap-4 bg-elevated px-4 py-3">
            <span className="text-xs font-semibold uppercase text-ink-3">Quantity</span>
            <span className="text-xs font-semibold uppercase text-ink-3">Per Unit (Incl. Laser Engraved)</span>
            <span className="text-right text-xs font-semibold uppercase text-ink-3">Total at Min Qty</span>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-bdr">
            {sortedTiers.map((tier) => {
              const isActive = activeTier?.tier === tier.tier;
              const totalAtMin = tier.sellPrice * tier.minQty;
              return (
                <button
                  key={tier.tier}
                  onClick={() => {
                    setQty(tier.minQty);
                    if (inputRef.current) {
                      inputRef.current.value = String(tier.minQty);
                    }
                  }}
                  className={`w-full grid grid-cols-3 gap-4 px-4 py-3 transition text-left hover:bg-elevated ${
                    isActive ? 'border-l-4 border-l-em bg-em/5 font-semibold text-em' : ''
                  }`}
                >
                  <span className="text-sm">{tier.minQty}–{tier.maxQty ? tier.maxQty : '∞'} units</span>
                  <span className="tabnum text-sm">{formatRupees(tier.sellPrice)}</span>
                  <span className="tabnum text-right text-sm">{formatRupees(totalAtMin)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-3">
          All prices include standard Laser Engraved branding. Prices exclusive of GST (18%) packaging, and shipping.
        </p>
        <p className="mt-1 text-xs text-ink-3">
          GST: 18% (HSN 7323) — CGST+SGST or IGST applied at checkout based on delivery location.
        </p>
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
            <p className="mt-1 text-xs text-ink-3">⚪ GST packaging & shipping</p>
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
