'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, RotateCcw, Package } from 'lucide-react';
import { toast } from '@/lib/stores/toast-store';

interface SavedPackItem {
  productId: string;
  variants: Array<{ kind: string; value: string }>;
  name: string;
  slug: string;
  active: boolean;
  image: string | null;
}

interface SavedPack {
  id: string;
  name: string;
  packQuantity: number;
  updatedAt: string;
  items: SavedPackItem[];
}

// Rebuild the builder hand-off URL the curated-pack pages use:
//   /builder?pack=id1,id2&qty=N&pv=<id>~<kind>~<value>|…
// The builder clears the current pack, sets the quantity and re-adds every
// product priced at TODAY'S tiers — a saved pack never carries stale prices.
function reorderHref(pack: SavedPack) {
  const ids = pack.items.map((it) => it.productId);
  const pvEntries = pack.items.flatMap((it) =>
    it.variants.map(
      (v) =>
        `${encodeURIComponent(it.productId)}~${encodeURIComponent(v.kind)}~${encodeURIComponent(v.value)}`
    )
  );
  const pv = pvEntries.length ? `&pv=${encodeURIComponent(pvEntries.join('|'))}` : '';
  return `/builder?pack=${encodeURIComponent(ids.join(','))}&qty=${pack.packQuantity}${pv}`;
}

export function SavedPacksManager({ packs }: { packs: SavedPack[] }) {
  const router = useRouter();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleRename = async (id: string) => {
    const name = renameValue.trim();
    if (!name || busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/dashboard/saved-packs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('rename failed');
      setRenamingId(null);
      router.refresh();
    } catch {
      toast.error('Could not rename this pack. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (pack: SavedPack) => {
    if (busyId) return;
    if (!window.confirm(`Delete "${pack.name}"? This cannot be undone.`)) return;
    setBusyId(pack.id);
    try {
      const res = await fetch(`/api/dashboard/saved-packs/${pack.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      toast.success(`"${pack.name}" deleted`);
      router.refresh();
    } catch {
      toast.error('Could not delete this pack. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  if (packs.length === 0) {
    return (
      <div className="rounded-md border border-bdr bg-white px-6 py-16 text-center">
        <Package className="mx-auto h-10 w-10 text-ink-3" />
        <h2 className="mt-4 text-lg font-semibold text-ink">No saved packs yet</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">
          Build a gift pack and hit &ldquo;Save pack for later&rdquo; in the builder — it will show
          up here, ready to reorder for the next occasion.
        </p>
        <Link
          href="/builder"
          className="mt-6 inline-block rounded-full bg-em px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-em-700"
        >
          Open the Gift Builder
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {packs.map((pack) => {
        const inactive = pack.items.filter((it) => !it.active);
        return (
          <div key={pack.id} className="rounded-md border border-bdr bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                {renamingId === pack.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(pack.id)}
                      maxLength={80}
                      autoFocus
                      aria-label="Pack name"
                      className="rounded-md border border-bdr px-2.5 py-1.5 text-sm text-ink outline-none focus:border-em"
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(pack.id)}
                      disabled={busyId === pack.id || !renameValue.trim()}
                      className="rounded-full bg-em px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-em-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      className="text-xs font-semibold text-ink-2 hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h2 className="truncate text-base font-semibold text-ink">{pack.name}</h2>
                )}
                <p className="mt-0.5 text-xs text-ink-2">
                  {pack.items.length} product{pack.items.length === 1 ? '' : 's'} ·{' '}
                  {pack.packQuantity} units · saved{' '}
                  {new Date(pack.updatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={reorderHref(pack)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-em px-4 py-2 text-xs font-semibold text-white transition hover:bg-em-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reorder
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setRenamingId(pack.id);
                    setRenameValue(pack.name);
                  }}
                  aria-label={`Rename ${pack.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-bdr text-ink-2 transition hover:border-em hover:text-em"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(pack)}
                  disabled={busyId === pack.id}
                  aria-label={`Delete ${pack.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-bdr text-ink-2 transition hover:border-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Member products */}
            <div className="mt-3 flex flex-wrap gap-2">
              {pack.items.map((it) => (
                <Link
                  key={it.productId}
                  href={`/products/${it.slug}`}
                  title={it.name}
                  className={`flex items-center gap-2 rounded-md border border-bdr px-2 py-1.5 text-xs text-ink-2 transition hover:border-em hover:text-em ${
                    it.active ? '' : 'opacity-50'
                  }`}
                >
                  <span className="relative block h-8 w-8 overflow-hidden rounded bg-gray-100">
                    {it.image ? (
                      <Image src={it.image} alt={it.name} fill sizes="32px" className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">📦</span>
                    )}
                  </span>
                  <span className="max-w-[140px] truncate">{it.name}</span>
                </Link>
              ))}
            </div>

            {inactive.length > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                {inactive.length} product{inactive.length === 1 ? ' is' : 's are'} no longer
                available and will be skipped on reorder.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
