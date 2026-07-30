'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, ImageIcon, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface OccasionRow {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  isActive: boolean;
  isCollection: boolean;
  _count: { products: number };
}

export function OccasionList({ occasions }: { occasions: OccasionRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return occasions;
    return occasions.filter(
      (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q)
    );
  }, [occasions, query]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((o) => selected.has(o.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach((o) => next.delete(o.id));
      else filtered.forEach((o) => next.add(o.id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} occasion${ids.length === 1 ? '' : 's'}? Linked products are kept.`)) return;
    setDeleting(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/admin/occasions/${id}`, { method: 'DELETE' }))
      );
      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length;
      if (failed) toast.error(`${failed} could not be deleted`);
      else toast.success(`Deleted ${ids.length} occasion${ids.length === 1 ? '' : 's'}`);
      setSelected(new Set());
      router.refresh();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Occasions</h1>
          <p className="mt-1 text-sm text-ink-2">{occasions.length} occasion{occasions.length === 1 ? '' : 's'}</p>
        </div>
        <Button asChild variant="em">
          <Link href="/admin/occasions/new">
            <Plus className="mr-1.5 h-4 w-4" /> New Occasion
          </Link>
        </Button>
      </div>

      {/* Card */}
      <div className="overflow-hidden rounded-xl border border-bdr bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-bdr px-4 py-2.5">
          <span className="rounded-lg border border-bdr px-3 py-1 text-sm font-medium text-ink">All</span>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search and filter"
              className="w-full rounded-lg bg-transparent py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none"
            />
          </div>
        </div>

        {/* Bulk action bar (only when something is selected) */}
        {selected.size > 0 && (
          <div className="flex items-center gap-4 border-b border-bdr bg-gray-50 px-4 py-2 text-sm">
            <span className="font-medium text-ink">{selected.size} selected</span>
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>
          </div>
        )}

        {/* Column header */}
        <div className="flex items-center gap-3 border-b border-bdr bg-gray-50/60 px-4 py-2 text-xs font-medium text-ink-2">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-bdr accent-slate-800"
            aria-label="Select all"
          />
          <span className="ml-9 flex-1">Title</span>
          <span className="w-24 text-right">Products</span>
          <span className="w-32 text-right">Status</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-ink-2">
            {query ? 'No occasions match your search.' : 'No occasions yet.'}
          </div>
        ) : (
          <ul className="divide-y divide-bdr">
            {filtered.map((occ) => {
              const isSelected = selected.has(occ.id);
              return (
                <li
                  key={occ.id}
                  className={`group flex items-center gap-3 px-4 py-2.5 transition hover:bg-gray-50 ${isSelected ? 'bg-sky-50/50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(occ.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-bdr accent-slate-800"
                    aria-label={`Select ${occ.name}`}
                  />

                  {/* Thumbnail */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-bdr bg-gray-50">
                    {occ.imageUrl ? (
                      <Image src={occ.imageUrl} alt="" width={36} height={36} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-ink-3" />
                    )}
                  </div>

                  {/* Title + slug subtitle */}
                  <Link href={`/admin/occasions/${occ.id}/edit`} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-sky-700 group-hover:underline">{occ.name}</div>
                    <div className="truncate text-xs text-ink-3">
                      /{occ.slug}{occ.isCollection ? ' · Curated collection' : ''}
                    </div>
                  </Link>

                  {/* Product count */}
                  <div className="w-24 text-right text-sm tabular-nums text-ink">{occ._count.products}</div>

                  {/* Status */}
                  <div className="w-32 text-right">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${occ.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {occ.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-ink-3">
        Occasions group products for gifting moments. Click one to edit its details, image and members.
      </p>
    </div>
  );
}
