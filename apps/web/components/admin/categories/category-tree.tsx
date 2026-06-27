'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Trash2, Edit2, Package, Layers, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductLink {
  product: { id: string; name: string; sku: string; status: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  parentId: string | null;
  _count?: { products: number };
  products?: ProductLink[];
  children?: Category[];
}

interface CategoryTreeProps {
  initialCategories: Category[];
  totalProducts: number;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-rose-100 text-rose-700',
  seasonal: 'bg-amber-100 text-amber-700',
};

/** Products directly in this category + all descendants. */
function subtreeProductCount(cat: Category): number {
  const own = cat._count?.products ?? 0;
  const kids = (cat.children ?? []).reduce((sum, c) => sum + subtreeProductCount(c), 0);
  return own + kids;
}

function countCategories(cats: Category[]): number {
  return cats.reduce((sum, c) => sum + 1 + countCategories(c.children ?? []), 0);
}

function countEmpty(cats: Category[]): number {
  return cats.reduce(
    (sum, c) => sum + (subtreeProductCount(c) === 0 ? 1 : 0) + countEmpty(c.children ?? []),
    0
  );
}

export function CategoryTree({ initialCategories, totalProducts }: CategoryTreeProps) {
  const router = useRouter();
  // Use the server prop directly so router.refresh() (after a delete) re-renders
  // the tree with fresh data instead of a stale initial snapshot.
  const categories = initialCategories;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const totalCategories = countCategories(categories);
  const emptyCategories = countEmpty(categories);

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const renderCategory = (cat: Category, level = 0) => {
    const childCats = cat.children ?? [];
    const products = cat.products ?? [];
    const ownCount = cat._count?.products ?? 0;
    const subtreeCount = subtreeProductCount(cat);
    const isExpandable = childCats.length > 0 || products.length > 0;
    const isExpanded = expandedIds.has(cat.id);
    const isEmpty = subtreeCount === 0;

    return (
      <div key={cat.id}>
        <div
          className="flex items-center gap-2 p-3 hover:bg-gray-50 rounded-lg group"
          style={{ paddingLeft: `${16 + level * 24}px` }}
        >
          {isExpandable ? (
            <button
              onClick={() => toggleExpanded(cat.id)}
              className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <div className="flex-1 text-sm font-medium text-gray-900">{cat.name}</div>

          {/* Product count badges */}
          <div className="flex items-center gap-2">
            {isEmpty ? (
              <span className="text-xs text-gray-400 italic">empty</span>
            ) : (
              <>
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                  title="Products directly in this category"
                >
                  <Package className="h-3 w-3" />
                  {ownCount}
                </span>
                {childCats.length > 0 && subtreeCount !== ownCount && (
                  <span
                    className="text-xs text-gray-400"
                    title="Total products in this category and its sub-categories"
                  >
                    {subtreeCount} total
                  </span>
                )}
              </>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
            <button
              onClick={() => router.push(`/admin/categories/${cat.id}/edit`)}
              className="p-1 text-gray-600 hover:text-gray-900"
              title="Edit details"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => deleteCategory(cat.id)}
              className="p-1 text-gray-600 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-l border-gray-200 ml-6">
            {/* Sub-categories first */}
            {childCats.map((child) => renderCategory(child, level + 1))}

            {/* Then the products directly in this category */}
            {products.map(({ product }) => (
              <button
                key={product.id}
                onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-gray-50 rounded-lg"
                style={{ paddingLeft: `${16 + (level + 1) * 24}px` }}
              >
                <Package className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700">{product.name}</span>
                <span className="text-xs text-gray-400 font-mono">{product.sku}</span>
                <span
                  className={`ml-auto mr-4 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                    STATUS_STYLES[product.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {product.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <Layers className="h-5 w-5 text-indigo-500" />
          <div>
            <p className="text-xl font-semibold text-gray-900">{totalCategories}</p>
            <p className="text-xs text-gray-500">Categories</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <Package className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-xl font-semibold text-gray-900">{totalProducts}</p>
            <p className="text-xs text-gray-500">Products total</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <FolderOpen className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-xl font-semibold text-gray-900">{emptyCategories}</p>
            <p className="text-xs text-gray-500">Empty categories</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
        {categories.map((cat) => renderCategory(cat))}
      </div>

      <Button asChild>
        <a href="/admin/categories/new">+ New Root Category</a>
      </Button>
    </div>
  );
}
