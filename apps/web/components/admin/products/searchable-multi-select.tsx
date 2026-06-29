'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';

interface Option {
  id: string;
  label: string;
}

interface Props {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}

/**
 * Searchable multi-select dropdown — selected items show as removable chips,
 * the dropdown has a search box and check-marked options. Used for Categories
 * and Occasions on the product form.
 */
export function SearchableMultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Search & select…',
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

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const selectedOptions = useMemo(
    () => options.filter((o) => selectedSet.has(o.id)),
    [options, selectedSet]
  );

  const toggle = (id: string) =>
    onChange(selectedSet.has(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-normal text-gray-900 mb-2">{label}</label>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedOptions.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-xs rounded-full pl-2.5 pr-1 py-1"
            >
              {o.label}
              <button
                type="button"
                onClick={() => toggle(o.id)}
                className="text-gray-400 hover:text-red-600"
                aria-label={`Remove ${o.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:border-gray-400"
      >
        <span>
          {selectedOptions.length ? `${selectedOptions.length} selected` : placeholder}
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
              <p className="px-3 py-2 text-sm text-gray-400">{options.length === 0 ? emptyText : 'No matches'}</p>
            ) : (
              filtered.map((o) => {
                const checked = selectedSet.has(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(o.id)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <span>{o.label}</span>
                    {checked && <Check className="h-4 w-4 text-emerald-600" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
