'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';

interface ResultItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

interface ResultGroup {
  type: string;
  label: string;
  items: ResultItem[];
}

/**
 * Global admin search box in the topbar — searches orders, products,
 * categories, clients, enquiries and vendors, and jumps straight to a result.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const flat = groups.flatMap((g) => g.items);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let active = true;
    const t = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          if (active) {
            setGroups(d.groups || []);
            setOpen(true);
          }
        })
        .catch(() => active && setGroups([]))
        .finally(() => active && setLoading(false));
    }, 200);
    return () => {
      active = false;
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

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    setGroups([]);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || flat.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      const sel = flat[active];
      if (sel) go(sel.href);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  let runningIndex = -1;

  return (
    <div ref={boxRef} className="relative max-w-lg flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
        }}
        onFocus={() => flat.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search orders, products, clients, categories…"
        className="h-9 w-full rounded-md border border-gray-200 bg-gray-50 pl-10 pr-8 text-sm text-gray-700 placeholder:text-gray-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
      )}

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-96 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {flat.length === 0 && !loading ? (
            <p className="px-3 py-3 text-sm text-gray-500">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            groups.map((group) => (
              <div key={group.type} className="py-1">
                <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  return (
                    <button
                      key={`${group.type}-${item.id}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(item.href)}
                      onMouseEnter={() => setActive(idx)}
                      className={`flex w-full flex-col items-start px-3 py-2 text-left ${
                        active === idx ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate text-sm font-medium text-gray-800">{item.title}</span>
                      <span className="truncate text-xs text-gray-500">{item.subtitle}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
