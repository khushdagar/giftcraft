'use client';

import { useEffect, useState } from 'react';
import { X, Search, Check, Loader2 } from 'lucide-react';

export type MediaLibraryItem = {
  url: string;
  altText: string | null;
  /** Source label — product name or blog post title. */
  productName: string | null;
  /** Object name in Spaces, minus the upload timestamp prefix. */
  fileName?: string;
};

/**
 * "Select existing" media picker — browses everything already uploaded so an
 * admin can reuse an image instead of re-uploading it.
 *
 * Shared by the product media manager (multi-select, appends to the gallery)
 * and the category/occasion cover pickers (single-select, replaces the cover).
 */
export function MediaLibraryModal({
  existing = [],
  multiple = true,
  title = 'Select existing media',
  onClose,
  onConfirm,
}: {
  /** URLs already in use — shown dimmed and unselectable. */
  existing?: { url: string }[];
  /** false = single-select: picking one image confirms immediately. */
  multiple?: boolean;
  title?: string;
  onClose: () => void;
  onConfirm: (picked: { url: string; altText: string | null }[]) => void;
}) {
  const [media, setMedia] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const existingUrls = new Set(existing.map((i) => i.url));

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/products/media-library?search=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then((d) => {
          if (active) setMedia(d.media || []);
        })
        .catch(() => active && setMedia([]))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search]);

  const pick = (m: MediaLibraryItem) => {
    // Single-select is a one-click action — no reason to make the admin
    // select then confirm to swap one cover image.
    if (!multiple) {
      onConfirm([{ url: m.url, altText: m.altText }]);
      onClose();
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(m.url)) next.delete(m.url);
      else next.add(m.url);
      return next;
    });
  };

  const confirm = () => {
    onConfirm(
      media.filter((m) => selected.has(m.url)).map((m) => ({ url: m.url, altText: m.altText }))
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              // The modal can sit inside a <form> (blog editor) — Enter must
              // not submit it.
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              placeholder="Search by file name, product name, SKU, blog title or alt text"
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : media.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500">No media found.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {media.map((m) => {
                const isSelected = selected.has(m.url);
                const alreadyUsed = existingUrls.has(m.url);
                return (
                  <button
                    key={m.url}
                    type="button"
                    disabled={alreadyUsed}
                    onClick={() => pick(m)}
                    title={
                      alreadyUsed
                        ? 'Already attached'
                        : [m.fileName, m.productName || m.altText].filter(Boolean).join(' · ')
                    }
                    className={`group flex flex-col overflow-hidden rounded-lg border-2 text-left transition ${
                      isSelected ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                    } ${alreadyUsed ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    <span className="relative block aspect-square w-full overflow-hidden bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={m.altText || ''} className="h-full w-full object-cover" />
                      {isSelected && (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </span>
                    {/* File name so a search hit is recognisable at a glance. */}
                    {m.fileName && (
                      <span className="block truncate px-1 py-0.5 text-[10px] text-gray-500">{m.fileName}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {multiple && (
          <div className="flex items-center justify-between border-t border-gray-100 p-4">
            <span className="text-sm text-gray-500">{selected.size} selected</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={confirm}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
              >
                Add {selected.size > 0 ? selected.size : ''} image{selected.size === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
