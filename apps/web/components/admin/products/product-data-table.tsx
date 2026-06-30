'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Edit2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatRupees } from '@/lib/utils';

interface SerializedProduct {
  id: string;
  name: string;
  sku: string;
  status: string;
  priceTiers?: Array<{ sellPrice: number }>;
  categories?: Array<{ category: { name: string } }>;
}

interface ProductDataTableProps {
  initialData: SerializedProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

export function ProductDataTable({ initialData, total, page, limit, totalPages }: ProductDataTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Navigate pages while keeping the current search/status filters.
  const goToPage = (target: number) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    params.set('page', String(target));
    router.push(`/admin/products?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      router.push(`/admin/products?${params.toString()}`, { scroll: false });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, status, router]);

  const handleSelectAll = () => {
    if (selected.size === initialData.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(initialData.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This cannot be undone.')) {
      try {
        const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
          router.refresh();
        }
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} product${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) {
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

      let deleted = 0;
      let archived = 0;
      let failed = 0;
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.ok) {
          if (r.value.body?.archived) archived++;
          else deleted++;
        } else {
          failed++;
        }
      }

      setSelected(new Set());
      router.refresh();

      const notes: string[] = [];
      if (archived > 0)
        notes.push(
          `${archived} product${archived > 1 ? 's were' : ' was'} used in orders and archived instead of deleted.`
        );
      if (failed > 0)
        notes.push(`${failed} product${failed > 1 ? 's' : ''} could not be removed.`);
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
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
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
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : `Delete ${selected.size}`}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left w-4">
                <input
                  type="checkbox"
                  checked={selected.size > 0 && selected.size === initialData.length}
                  ref={(el) => {
                    if (el) {
                      (el as any).indeterminate = selected.size > 0 && selected.size < initialData.length;
                    }
                  }}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-normal text-gray-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-normal text-gray-600 uppercase">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-normal text-gray-600 uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-normal text-gray-600 uppercase">Price</th>
              <th className="px-4 py-3 text-left text-xs font-normal text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-normal text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {initialData.map((product) => {
              const price = product.priceTiers?.[0]?.sellPrice || 0;
              const category = product.categories?.[0]?.category?.name || '—';
              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 font-mono">{product.sku}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">{category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-normal text-gray-900 tabnum">{formatRupees(price)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariants[product.status] || 'grey'}>{product.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/admin/products/${product.id}/edit`} title="Edit">
                        <Edit2 className="h-4 w-4 text-gray-600 hover:text-gray-900" />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id)}
                        title="Delete"
                        className="text-gray-600 hover:text-red-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => goToPage(1)}
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => goToPage(page - 1)}
          >
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
            onClick={() => goToPage(page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => goToPage(totalPages)}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
