'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

interface Option {
  id: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  emptyText?: string;
}

/**
 * Searchable single-select dropdown — a trigger showing the current selection,
 * with a search box and check-marked options. Mirrors SearchableMultiSelect but
 * for picking exactly one option (e.g. a vendor).
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  emptyText = 'No options',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = useMemo(() => options.find((o) => o.id === value), [options, value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm hover:border-gray-400"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">
                {options.length === 0 ? emptyText : 'No matches'}
              </p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <span>{o.label}</span>
                  {o.id === value && <Check className="h-4 w-4 text-emerald-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
