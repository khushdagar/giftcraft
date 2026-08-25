'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Edit2, Package, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatRupees } from '@/lib/utils';

export interface PackRow {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: string;
  /** Where the pack shows up on the storefront — its occasion rungs. */
  occasions: { id: string; name: string }[];
  /** The budget band this pack's price lands in, resolved server-side. */
  budgetBand: string | null;
  itemCount: number;
  /** Sum of the members' tier-1 sell prices × quantity — the pack's from-price. */
  price: number;
  /** The pack's own image if it has one, else its members' images (collaged). */
  images: string[];
  memberNames: string[];
}

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
  { value: 'seasonal', label: 'Seasonal' },
];

const statusVariants: Record<string, any> = {
  active: 'em',
  draft: 'grey',
  archived: 'red',
  seasonal: 'gold',
};

const PAGE_SIZE = 50;

/**
 * The thumbnail for a pack. Packs usually carry no image of their own — the
 * storefront collages the member products' images — so the list shows that same
 * collage, scaled down. Falls back to a box icon for an empty pack.
 */
function PackThumb({ images }: { images: string[] }) {
  const imgs = images.slice(0, 4);
  if (imgs.length === 0) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50">
        <Package className="h-4 w-4 text-gray-300" />
      </div>
    );
  }
  const cols = imgs.length === 1 ? 1 : 2;
  return (
    <div
      className="grid h-10 w-10 shrink-0 gap-px overflow-hidden rounded-md border border-gray-200 bg-gray-100"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: '1fr' }}
    >
      {imgs.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ))}
    </div>
  );
}

export function PackDataTable({ packs }: { packs: PackRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [occasion, setOccasion] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);

  const returnTo = '/admin/products?view=packs';
  const editHref = (id: string) =>
    `/admin/products/${id}/edit?returnTo=${encodeURIComponent(returnTo)}`;

  // Every occasion that actually holds packs, for the filter dropdown.
  const occasions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of packs) for (const o of p.occasions) map.set(o.id, o.name);
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [packs]);


  // Filtering is client-side (the server already sent every pack down), then
  // paginated client-side too so the table only ever renders PAGE_SIZE rows.
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return packs.filter((p) => {
      if (status && p.status !== status) return false;
      if (occasion === '__none') {
        if (p.occasions.length > 0) return false;
      } else if (occasion && !p.occasions.some((o) => o.id === occasion)) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.memberNames.some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [packs, search, status, occasion]);

  // A changed search/filter can shrink the result set below the current page —
  // land back on page 1 rather than showing an empty page.
  useEffect(() => {
    setPage(1);
  }, [search, status, occasion]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page]
  );

  const allSelected = pagedRows.length > 0 && pagedRows.every((p) => selected.has(p.id));

  const handleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(pagedRows.map((p) => p.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete the pack "${name}"? Its member products are not affected. This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        if (body?.archived) {
          alert('This pack has been ordered before, so it was archived instead of deleted.');
        }
        router.refresh();
      } else {
        alert(body?.error || 'Could not delete this pack.');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Could not delete this pack.');
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Delete ${selected.size} pack${selected.size > 1 ? 's' : ''}? Member products are not affected. This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const ids = Array.from(selected);
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/admin/products/${id}`, { method: 'DELETE' }).then(async (r) => ({
            ok: r.ok,
            body: (await r.json().catch(() => ({}))) as { archived?: boolean },
          }))
        )
      );

      let archived = 0;
      let failed = 0;
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.ok) {
          if (r.value.body?.archived) archived++;
        } else {
          failed++;
        }
      }

      setSelected(new Set());
      router.refresh();

      const notes: string[] = [];
      if (archived > 0)
        notes.push(
          `${archived} pack${archived > 1 ? 's were' : ' was'} used in orders and archived instead of deleted.`
        );
      if (failed > 0) notes.push(`${failed} pack${failed > 1 ? 's' : ''} could not be removed.`);
      if (notes.length > 0) alert(notes.join('\n'));
    } catch (error) {
      console.error('Bulk delete failed:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search packs by name, SKU or a product inside…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {occasions.length > 0 && (
          <select
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
          >
            <option value="">All occasions</option>
            {occasions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
            <option value="__none">No occasion</option>
          </select>
        )}
        <div className="flex gap-1 border-b border-gray-200">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`px-3 py-2 text-sm font-medium transition border-b-2 ${
                status === opt.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-gray-500">
          {rows.length > 0
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, rows.length)} of `
            : ''}
          {rows.length} pack{rows.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : `Delete ${selected.size}`}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div
          className={`overflow-x-auto transition-opacity duration-200 ${
            isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'
          }`}
        >
          <table className="w-full min-w-[880px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left w-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        (el as any).indeterminate = selected.size > 0 && !allSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-600 uppercase">Pack</th>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-600 uppercase">Occasion</th>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-600 uppercase">Contains</th>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-600 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-normal text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagedRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                    No packs match these filters.
                  </td>
                </tr>
              )}
              {pagedRows.map((pack) => (
                <tr
                  key={pack.id}
                  onClick={() => startTransition(() => router.push(editHref(pack.id)))}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(pack.id)}
                      onChange={() => toggleSelect(pack.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <PackThumb images={pack.images} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{pack.name}</p>
                        <p className="truncate font-mono text-xs text-gray-500">{pack.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {pack.occasions.length > 0 ? (
                      <p className="max-w-[200px] text-sm text-gray-600">
                        {pack.occasions.map((o) => o.name).join(', ')}
                      </p>
                    ) : (
                      // Without an occasion a pack is only reachable by budget,
                      // so say so rather than leaving the cell blank.
                      <Badge variant="grey">Budget only</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">
                      {pack.itemCount} product{pack.itemCount === 1 ? '' : 's'}
                    </p>
                    <p className="max-w-[260px] truncate text-xs text-gray-500">
                      {pack.memberNames.join(', ') || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-normal text-gray-900 tabnum">{formatRupees(pack.price)}</p>
                    {/* The budget rung this price puts the pack on. */}
                    <p className="text-xs text-gray-500">{pack.budgetBand ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariants[pack.status] || 'grey'}>{pack.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 justify-end">
                      <Link href={editHref(pack.id)} title="Edit">
                        <Edit2 className="h-4 w-4 text-gray-600 hover:text-gray-900" />
                      </Link>
                      <button
                        onClick={() => handleDelete(pack.id, pack.name)}
                        title="Delete"
                        className="text-gray-600 hover:text-red-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)} title="First page">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-gray-600 px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(totalPages)}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
