'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeftRight, X } from 'lucide-react';
import { useCompareStore, MAX_COMPARE } from '@/store/compare';

/**
 * Floating tray shown while products are ticked for comparison. Rendered on the
 * pages where products can be added (catalog, wishlist); hidden when empty.
 */
export function CompareBar() {
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);

  // localStorage-backed — render nothing until mounted to avoid a hydration
  // mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || items.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-dark px-4 py-2.5 text-white shadow-float">
      <div className="flex items-center gap-1.5">
        {items.map((it) => (
          <span key={it.id} className="relative">
            <span className="relative block h-8 w-8 overflow-hidden rounded-full border border-white/20 bg-white">
              {it.image ? (
                <Image src={it.image} alt={it.name} fill sizes="32px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs">📦</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => remove(it.id)}
              aria-label={`Remove ${it.name} from comparison`}
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-ink shadow"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      <span className="text-xs text-white/60">
        {items.length}/{MAX_COMPARE}
      </span>
      <Link
        href="/compare"
        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${
          items.length >= 2
            ? 'bg-em text-white hover:bg-em-600'
            : 'pointer-events-none bg-white/10 text-white/40'
        }`}
        aria-disabled={items.length < 2}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        Compare
      </Link>
      <button
        type="button"
        onClick={clear}
        className="text-xs font-semibold text-white/50 transition hover:text-white"
      >
        Clear
      </button>
    </div>
  );
}
