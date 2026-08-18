'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ImageIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BandRow {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  gradient: string | null;
  minPrice: number;
  maxPrice: number | null;
  isActive: boolean;
  /** Live count of packs whose price lands in this band. */
  packCount: number;
}

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function BudgetBandList({ bands, gaps }: { bands: BandRow[]; gaps: string[] }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Budget bands</h1>
          <p className="mt-1 text-sm text-ink-2">
            {bands.length} band{bands.length === 1 ? '' : 's'} · packs join by price, automatically
          </p>
        </div>
        <Button asChild variant="em">
          <Link href="/admin/budget-bands/new">
            <Plus className="mr-1.5 h-4 w-4" /> New Band
          </Link>
        </Button>
      </div>

      {/* A price with no band is a pack nobody can reach by budget — worth
          saying out loud rather than leaving to be noticed. */}
      {gaps.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">Gaps in the ladder</p>
          <p className="mt-0.5 text-sm text-amber-800">
            No band covers {gaps.join(', ')}. Packs priced there won&apos;t appear under By Budget.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-bdr bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-bdr bg-gray-50/60 px-4 py-2 text-xs font-medium text-ink-2">
          <span className="ml-12 flex-1">Band</span>
          <span className="w-40 text-right">Range</span>
          <span className="w-24 text-right">Packs</span>
          <span className="w-28 text-right">Status</span>
        </div>

        {bands.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-ink-2">No budget bands yet.</div>
        ) : (
          <ul className="divide-y divide-bdr">
            {bands.map((band) => (
              <li
                key={band.id}
                className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-gray-50"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-bdr"
                  style={{ background: band.imageUrl ? undefined : band.gradient || '#E5DFD4' }}
                >
                  {band.imageUrl ? (
                    <Image
                      src={band.imageUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-white/70" />
                  )}
                </div>

                <Link href={`/admin/budget-bands/${band.id}/edit`} className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-sky-700 group-hover:underline">
                    {band.name}
                  </div>
                  <div className="truncate text-xs text-ink-3">/{band.slug}</div>
                </Link>

                <div className="w-40 text-right text-sm tabular-nums text-ink-2">
                  {money(band.minPrice)} – {band.maxPrice == null ? 'above' : money(band.maxPrice)}
                </div>

                <div className="w-24 text-right text-sm tabular-nums text-ink">{band.packCount}</div>

                <div className="w-28 text-right">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      band.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {band.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-ink-3">
        A pack belongs to the band its per-pack price falls into. Change a pack&apos;s price and it
        moves band on its own — a band with no packs is hidden from customers.
      </p>
    </div>
  );
}
