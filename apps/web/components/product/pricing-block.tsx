'use client';

import { useState, useEffect, useRef } from 'react';
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

export function PricingBlock({ priceTiers, gstRate, hsnCode }: { priceTiers: PriceTier[]; gstRate: number; hsnCode?: string }) {
  const [qty, setQty] = useState(priceTiers[0]?.minQty || 25);

  const sortedTiers = [...priceTiers].sort((a, b) => a.tier - b.tier);
  const activeTier = sortedTiers.find((t) => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty)) || sortedTiers[0];
  const subtotal = activeTier ? activeTier.sellPrice * qty : 0;
  const firstTier = sortedTiers[0];
  const savings = activeTier && firstTier && activeTier.tier > 1 ? (firstTier.sellPrice - activeTier.sellPrice) * qty : 0;

  return (
    <div className="mt-8 space-y-6">
      {/* Quantity input */}
      <div>
        <p className="overline mb-3 text-ink-3">QUANTITY</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQty(Math.max(priceTiers[0]?.minQty || 25, qty - (priceTiers[0]?.minQty || 25)))}
            className="h-10 w-10 rounded-full border border-bdr hover:border-em flex items-center justify-center text-lg"
          >
            −
          </button>
          <input
            type="number"
            min={priceTiers[0]?.minQty || 25}
            value={qty}
            onChange={(e) => setQty(Math.max(priceTiers[0]?.minQty || 25, parseInt(e.target.value) || qty))}
            className="w-24 text-center font-semibold border border-bdr rounded-gc px-3 py-2"
          />
          <button
            onClick={() => setQty(qty + (priceTiers[0]?.minQty || 25))}
            className="h-10 w-10 rounded-full border border-bdr hover:border-em flex items-center justify-center text-lg"
          >
            +
          </button>
        </div>
      </div>

      {/* Pricing table */}
      <div className="overflow-hidden rounded-gc-l bg-white shadow-card">
        <div className="border-b border-bdr bg-elevated px-4 py-3">
          <p className="overline text-ink-3">TIERED PRICING</p>
        </div>
        <div className="divide-y divide-bdr">
          {sortedTiers.map((tier) => {
            const isActive = activeTier?.tier === tier.tier;
            return (
              <div
                key={tier.tier}
                className={`flex items-center justify-between px-4 py-3 transition ${
                  isActive ? 'bg-gold-50 border-l-4 border-l-gold font-semibold text-gold-700' : ''
                }`}
              >
                <span className="text-sm">
                  {tier.minQty}–{tier.maxQty ? tier.maxQty : '∞'} units
                </span>
                <span className="tabnum text-base">{formatRupees(tier.sellPrice)} per unit</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtotal with savings */}
      <div className="rounded-gc-l border border-bdr bg-white shadow-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-2">Subtotal (excl. GST)</span>
          <span className="font-black tabnum text-lg">
            <AnimatedNumber value={subtotal} formatter={formatRupees} />
          </span>
        </div>

        {savings > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-gc-p bg-gold-50 px-3 py-2">
            <span className="text-xs font-semibold text-gold-700">
              You save {formatRupees(savings)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
