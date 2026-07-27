'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Package } from 'lucide-react';

interface Suggestion {
  id: string;
  name: string;
  sku: string;
  status: string;
  image: string | null;
}

/**
 * Products search box with a live suggestion dropdown. Typing shows matching
 * products (by name or SKU); clicking one opens its edit page. No submit needed.
 */
export function ProductsSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let alive = true;
    const t = setTimeout(() => {
      fetch(`/api/admin/products/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          if (alive) {
            setResults(d.results || []);
            setOpen(true);
          }
        })
        .catch(() => alive && setResults([]))
        .finally(() => alive && setLoading(false));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (id: string) => {
    setOpen(false);
    router.push(`/admin/products/${id}/edit`);
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
      e.preventDefault();
      const sel = results[active];
      if (sel) go(sel.id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      <input
        type="text"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search products by name or SKU…"
        className="h-10 w-full rounded-xl border border-bdr pl-9 pr-9 text-sm"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-3" />
      )}

      {open && (results.length > 0 || (!loading && query.trim().length > 0)) && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-96 overflow-y-auto rounded-xl border border-bdr bg-white py-1 shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-3">No matching products</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r.id)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
                  active === i ? 'bg-elevated' : 'hover:bg-elevated/60'
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-bdr bg-gray-50">
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image} alt={r.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-4 w-4 text-ink-3" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{r.name}</span>
                  <span className="block truncate text-xs text-ink-3">{r.sku}</span>
                </span>
                <span className="shrink-0 text-xs capitalize text-ink-3">{r.status}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
