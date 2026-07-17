'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Package, Minus, Plus } from 'lucide-react';
import { formatRupees } from '@/lib/utils';

interface Tier {
  minQty: number;
  maxQty: number | null;
  sellPrice: number;
}

interface BundleItem {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  image: string | null;
  quantity: number;
  priceTiers: Tier[];
}

interface PackBundleProps {
  pack: {
    name: string;
    description: string | null;
    collectionName: string;
    collectionSlug: string;
    productIds: string[];
    items: BundleItem[];
  };
}

// Corporate MOQ (RULE 4) — the pack is ordered in multiples starting at 25.
const MOQ = 25;

// Price of one product at a given order quantity — the tier whose band contains
// qty (falls back to the first tier). Mirrors the admin pack pricing logic.
function priceAtQty(tiers: Tier[], qty: number) {
  if (!tiers.length) return 0;
  const t =
    tiers.find((t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty)) ?? tiers[0];
  return t ? t.sellPrice : 0;
}

export function PackBundle({ pack }: PackBundleProps) {
  const [qty, setQty] = useState(MOQ);

  const setSafe = (n: number) => setQty(Math.max(MOQ, Math.floor(n) || MOQ));

  // Per-pack price at the chosen quantity, and the grand total (× packs).
  const perPack = pack.items.reduce(
    (sum, it) => sum + priceAtQty(it.priceTiers, qty) * it.quantity,
    0
  );
  const total = perPack * qty;

  const checkoutHref = `/builder?pack=${encodeURIComponent(pack.productIds.join(','))}&qty=${qty}`;

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Products in this pack (read-only) */}
      <div className="lg:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5" style={{ color: '#1A6B4F' }} />
          <h2 className="text-lg font-medium text-ink">
            What&apos;s inside ({pack.items.length} product{pack.items.length === 1 ? '' : 's'})
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pack.items.map((it) => (
            <div
              key={it.id}
              className="flex flex-col overflow-hidden rounded-md border-2 border-bdr bg-white"
            >
              <div className="relative aspect-[4/3] bg-gray-50">
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image} alt={it.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-ink-3">
                    <Package className="w-8 h-8" />
                  </div>
                )}
                {it.quantity > 1 && (
                  <span className="absolute top-2 right-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
                    ×{it.quantity}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                {it.brand && (
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-3 mb-1">
                    {it.brand}
                  </p>
                )}
                <h3 className="text-sm font-semibold text-ink leading-snug">{it.name}</h3>
                {it.description && (
                  <p className="mt-1 text-xs text-ink-2 line-clamp-2">{it.description}</p>
                )}
                <p className="mt-2 text-xs text-ink-3">
                  Qty in pack: <span className="font-medium text-ink-2">{it.quantity}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checkout summary with quantity selector */}
      <div className="lg:col-span-1">
        <div className="rounded-md border-2 border-bdr bg-white p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
          <h2 className="text-lg font-medium text-ink">Pack summary</h2>

          {/* Quantity selector */}
          <div className="mt-4">
            <label className="block text-sm text-ink-2 mb-2">
              How many packs? <span className="text-ink-3">(min {MOQ})</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSafe(qty - 1)}
                disabled={qty <= MOQ}
                className="p-2 rounded-lg border-2 border-bdr text-ink-2 hover:border-em disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={MOQ}
                value={qty}
                onChange={(e) => setSafe(parseInt(e.target.value))}
                className="w-20 text-center rounded-lg border-2 border-bdr py-2 text-sm text-ink focus:border-em focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSafe(qty + 1)}
                className="p-2 rounded-lg border-2 border-bdr text-ink-2 hover:border-em"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-sm text-ink-3">packs</span>
            </div>
          </div>

          {/* Live pricing */}
          <div className="mt-5 space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink-2">Price per pack</span>
              <span className="font-medium tabular-nums text-ink">
                {perPack > 0 ? formatRupees(perPack) : '—'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-2">Total ({qty} packs)</span>
              <span className="text-3xl font-serif font-light tabular-nums text-ink">
                {total > 0 ? formatRupees(total) : '—'}
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-ink-3">
            Price updates with quantity. Final GST &amp; fees are shown at checkout.
          </p>

          <div className="my-5 border-t border-bdr" />

          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-3">
            Contains {pack.items.length} product{pack.items.length === 1 ? '' : 's'}
          </p>
          <ul className="space-y-2 mb-6">
            {pack.items.map((it) => (
              <li key={it.id} className="flex items-start gap-2 text-sm text-ink">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#1A6B4F' }} />
                <span className="flex-1">
                  {it.name}
                  {it.quantity > 1 && <span className="text-ink-3"> ×{it.quantity}</span>}
                </span>
              </li>
            ))}
          </ul>

          <Link
            href={checkoutHref}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-em px-6 py-3.5 text-base font-bold text-white transition hover:bg-em-600 hover:-translate-y-0.5"
          >
            Add to Pack <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/packs/${pack.collectionSlug}`}
            className="mt-3 block text-center text-sm font-medium text-ink-2 hover:text-ink"
          >
            ← Back to {pack.collectionName}
          </Link>
        </div>
      </div>
    </div>
  );
}
