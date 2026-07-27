'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupees } from '@/lib/utils';
import { Search, Loader2 } from 'lucide-react';

interface Suggestion {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  customer: string;
}

function statusLabel(status: string) {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Search box for the orders list. Behaves as a normal form field (Enter / the
 * Search button still runs the server-side filter) but also shows a live
 * dropdown of matching orders as you type — click one to jump straight to it.
 */
export function OrdersSearch({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced fetch of suggestions.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let active = true;
    const t = setTimeout(() => {
      fetch(`/api/admin/orders/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          if (active) {
            setResults(d.results || []);
            setOpen(true);
          }
        })
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false));
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (id: string) => {
    setOpen(false);
    router.push(`/admin/orders/${id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && active >= 0) {
      // A suggestion is highlighted — jump to it instead of submitting the form.
      e.preventDefault();
      const sel = results[active];
      if (sel) go(sel.id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative flex-1 min-w-[220px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      <input
        type="text"
        name="search"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search by order number or customer…"
        className="h-9 w-full rounded-md border border-bdr pl-9 pr-8 text-sm"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-3" />
      )}

      {open && (results.length > 0 || (!loading && query.trim().length > 0)) && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-md border border-bdr bg-white py-1 shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-3">No matching orders</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()} // keep focus, fire before blur
                onClick={() => go(r.id)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${
                  active === i ? 'bg-elevated' : 'hover:bg-elevated/60'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">#{r.orderNumber}</span>
                  <span className="block truncate text-xs text-ink-3">
                    {r.customer} · {statusLabel(r.status)}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabnum text-ink-2">{formatRupees(r.total)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
