'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Check, X } from 'lucide-react';
import { useCompareStore } from '@/store/compare';
import { formatRupees } from '@/lib/utils';
import { printingTechniqueLabel } from '@/lib/printing';

interface CompareProduct {
  id: string;
  name: string;
  slug: string;
  moq?: number;
  leadTimeDays?: number;
  material?: string | null;
  brandingArea?: string | null;
  printingTechnique?: string;
  isEcoCertified?: boolean;
  ecoCertification?: string | null;
  weightG?: number | null;
  priceTiers?: Array<{ minQty: number; maxQty: number | null; sellPrice: number }>;
  images?: Array<{ url: string }>;
}

const dash = <span className="text-ink-3">—</span>;

export function CompareContent() {
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ids = mounted ? items.map((i) => i.id) : [];

  // One query for the whole set — the products route resolves by id as well as
  // slug. A product that fails to load (deactivated since it was ticked) is
  // dropped rather than failing the page.
  const { data: products = [], isLoading } = useQuery<CompareProduct[]>({
    queryKey: ['compare', ids.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.product ?? null;
          } catch {
            return null;
          }
        })
      );
      return results.filter(Boolean);
    },
    enabled: ids.length > 0,
  });

  const fromPrice = (p: CompareProduct) => {
    const prices = (p.priceTiers ?? []).map((t) => Number(t.sellPrice)).filter((n) => n > 0);
    return prices.length ? Math.min(...prices) : 0;
  };
  const tier1Price = (p: CompareProduct) => Number(p.priceTiers?.[0]?.sellPrice ?? 0);

  /**
   * "Best value" test per numeric row (lowest price / MOQ / lead time wins).
   * Only highlights when the products actually DIFFER on that row — a tie on
   * every column would paint everything green and mean nothing.
   */
  const bestOf = (metric: (p: CompareProduct) => number) => {
    const values = products.map(metric).filter((n) => n > 0 && Number.isFinite(n));
    if (values.length < 2) return () => false;
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return () => false;
    return (p: CompareProduct) => metric(p) === min;
  };

  const bestFrom = bestOf(fromPrice);
  // The MOQ row's headline figure is the entry cost (unit × MOQ), so "Best"
  // must judge that same number — not the unit price alone.
  const bestMoqCost = bestOf((p) => (p.moq ? tier1Price(p) * p.moq : 0));
  const bestMoq = bestOf((p) => p.moq ?? 0);
  const bestLead = bestOf((p) => p.leadTimeDays ?? 0);

  // Attribute rows, defined once so the label and every value stay in step.
  const rows: Array<{
    label: string;
    render: (p: CompareProduct) => React.ReactNode;
    isBest?: (p: CompareProduct) => boolean;
  }> = [
    {
      label: 'Price per unit (from)',
      render: (p) =>
        fromPrice(p) > 0 ? (
          <span>
            <span className="text-base font-black tabnum">{formatRupees(fromPrice(p))}</span>
            <span className="text-ink-3"> / unit</span>
          </span>
        ) : (
          dash
        ),
      isBest: bestFrom,
    },
    {
      // Unit price at the first tier, then what the minimum order actually
      // costs — the number a buyer needs to get started.
      label: 'Starting order cost',
      render: (p) => {
        const unit = tier1Price(p);
        if (unit <= 0) return dash;
        const moq = p.moq ?? 0;
        return (
          <span>
            <span className="tabnum">{formatRupees(unit)}</span>
            <span className="text-ink-3"> / unit</span>
            {moq > 0 && (
              <span className="mt-0.5 block font-black tabnum">
                × {moq} = {formatRupees(unit * moq)}
              </span>
            )}
          </span>
        );
      },
      isBest: bestMoqCost,
    },
    { label: 'Min. order', render: (p) => (p.moq ? `${p.moq} units` : dash), isBest: bestMoq },
    {
      label: 'Lead time',
      render: (p) => (p.leadTimeDays ? `${p.leadTimeDays} days` : dash),
      isBest: bestLead,
    },
    { label: 'Material', render: (p) => p.material || dash },
    { label: 'Branding', render: (p) => printingTechniqueLabel(p.printingTechnique) || dash },
    { label: 'Branding area', render: (p) => p.brandingArea || dash },
    {
      label: 'Eco-certified',
      render: (p) =>
        p.isEcoCertified ? (
          <span className="inline-flex items-center gap-1 text-em-700">
            <Check className="h-3.5 w-3.5" />
            {p.ecoCertification?.trim() || 'Yes'}
          </span>
        ) : (
          'No'
        ),
    },
    { label: 'Weight', render: (p) => (p.weightG ? `${p.weightG} g` : dash) },
  ];

  // Label column + one equal column per product. Shared by the header cards
  // and every attribute row so everything lines up. The label column flexes
  // between 92px (phones) and 150px (desktop) — no horizontal scrolling.
  const cols = {
    gridTemplateColumns: `minmax(92px, 150px) repeat(${Math.max(products.length, 1)}, minmax(0, 1fr))`,
  };

  return (
    <div className="bg-canvas min-h-[60vh] pb-16">
      <div className="container-gc-w pt-8">
        <p className="text-xs text-ink-3">
          <Link href="/" className="hover:text-ink">Home</Link>
          {' / '}
          <Link href="/catalog" className="hover:text-ink">Catalog</Link>
          {' / '}
          <span className="text-ink">Compare</span>
        </p>

        <h1 className="mt-4 font-serif text-4xl font-light tracking-tight text-ink">
          Compare Products
        </h1>
        <p className="mt-2 text-sm text-ink-2">
          Side-by-side specs for your shortlist — pick from the catalog or wishlist using the{' '}
          <ArrowLeftRight className="inline h-3.5 w-3.5" /> button on any product card.
        </p>

        {ids.length === 0 || (!isLoading && products.length === 0) ? (
          <div className="mt-12 rounded-md border border-bdr bg-white px-6 py-20 text-center">
            <ArrowLeftRight className="mx-auto h-10 w-10 text-ink-3" />
            <h2 className="mt-4 text-lg font-semibold text-ink">Nothing to compare yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">
              Tick the compare button on 2–3 products in the catalog, then come back here to see
              them side by side.
            </p>
            <Link
              href="/catalog"
              className="mt-6 inline-block rounded-full bg-em px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-em-700"
            >
              Browse the Catalog
            </Link>
          </div>
        ) : isLoading ? (
          <div className="mt-12 rounded-md border border-bdr bg-white px-6 py-20 text-center text-sm text-ink-3">
            Loading comparison…
          </div>
        ) : (
          // Capped width so 2 columns don't stretch across an ultrawide screen.
          // On phones the table scrolls sideways instead of crushing the
          // product columns; the label rail stays pinned (sticky left-0).
          <div className="mt-8 max-w-7xl overflow-x-auto rounded-md border border-bdr bg-white">
            <div style={{ minWidth: `${92 + Math.max(products.length, 1) * 172}px` }}>
            {/* Product header cards — first cell is the empty label-column stub */}
            <div className="grid divide-x divide-bdr border-b border-bdr" style={cols}>
              <div className="sticky left-0 z-20 flex items-end bg-elevated px-2.5 py-3 sm:px-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-3">
                  Product
                </span>
              </div>
              {products.map((p) => (
                <div key={p.id} className="relative flex flex-col p-3 sm:p-5">
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label={`Remove ${p.name} from comparison`}
                    className="absolute right-2 top-2 z-[1] flex h-6 w-6 items-center justify-center rounded-full border border-bdr bg-white text-ink-2 transition hover:border-red-500 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <Link href={`/products/${p.slug}`} className="group flex flex-1 flex-col">
                    <span className="relative mx-auto block aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl bg-gray-50">
                      {p.images?.[0]?.url ? (
                        <Image
                          src={p.images[0].url}
                          alt={p.name}
                          fill
                          sizes="(min-width: 640px) 200px, 45vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-4xl opacity-60">
                          📦
                        </span>
                      )}
                    </span>
                    <span className="mt-2.5 block text-center text-xs font-semibold leading-tight text-ink sm:text-sm">
                      {p.name}
                    </span>
                  </Link>
                  <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:justify-center">
                    <Link
                      href={`/builder?product=${p.id}&qty=${p.moq || 25}`}
                      className="rounded-full bg-em px-3 py-1.5 text-center text-xs font-semibold text-white transition hover:bg-em-700 sm:px-4"
                    >
                      Add to Pack
                    </Link>
                    <Link
                      href={`/products/${p.slug}`}
                      className="rounded-full border-2 border-bdr px-3 py-1.5 text-center text-xs font-semibold text-ink-2 transition hover:border-em hover:text-em sm:px-4"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Attribute rows: label cell on the left, one value per product
                column — classic comparison-table layout on every screen size. */}
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid divide-x divide-bdr border-b border-bdr last:border-b-0"
                style={cols}
              >
                <div className="sticky left-0 z-20 flex items-center gap-1.5 bg-elevated px-2.5 py-2.5 sm:px-4">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-em" aria-hidden />
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">
                    {row.label}
                  </span>
                </div>
                {products.map((p) => {
                  const best = row.isBest?.(p) ?? false;
                  return (
                    <div
                      key={p.id}
                      className={`px-2.5 py-2.5 text-xs text-ink sm:px-5 sm:py-3 sm:text-sm ${
                        best ? 'bg-em/5' : ''
                      }`}
                    >
                      {row.render(p)}
                      {best && (
                        <span className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-em-700">
                          <Check className="h-3 w-3" /> Best
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Tax/fee disclaimer — amounts are NOT computed here on purpose:
                GST depends on HSN, quantity and buyer state, so any figure
                shown would disagree with the builder/checkout. */}
            <div className="bg-elevated px-3 py-2.5 text-[11px] leading-relaxed text-ink-3 sm:px-5">
              Prices shown are per unit before GST. GST (as per product HSN), shipping and payment
              processing fee are calculated transparently at checkout.
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
