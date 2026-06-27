'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  heroImage?: string;
  sortOrder: number;
  isActive: boolean;
}

interface ProductLite {
  id: string;
  name: string;
  brand?: string | null;
  image?: string | null;
}

export default function EditCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const collectionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<Collection>({
    id: '',
    name: '',
    slug: '',
    description: '',
    heroImage: '',
    sortOrder: 0,
    isActive: true,
  });

  // Product selection
  const [allProducts, setAllProducts] = useState<ProductLite[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Fetch the collection (with its products) + the product list to choose from.
  useEffect(() => {
    const load = async () => {
      try {
        const colRes = await fetch(`/api/admin/collections/${collectionId}`);
        if (!colRes.ok) throw new Error('Failed to fetch collection');
        const collection = await colRes.json();

        setFormData({
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          description: collection.description || '',
          heroImage: collection.heroImage || '',
          sortOrder: collection.sortOrder || 0,
          isActive: collection.isActive,
        });

        // Products already in this collection (full detail comes from the GET).
        const colProducts: ProductLite[] = (collection.products || []).map((cp: any) => ({
          id: cp.product?.id ?? cp.productId,
          name: cp.product?.name ?? 'Product',
          brand: cp.product?.brand ?? null,
          image: cp.product?.images?.[0]?.url ?? null,
        }));
        setSelectedIds(colProducts.map((p) => p.id));

        // Load ALL products by paginating (the API caps limit at 100 per page).
        const list: ProductLite[] = [];
        for (let page = 1; page <= 100; page++) {
          const r = await fetch(`/api/admin/products?limit=100&page=${page}`);
          if (!r.ok) break;
          const d = await r.json();
          const batch: ProductLite[] = (d.products || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            brand: p.brand ?? null,
            image: p.images?.[0]?.url ?? null,
          }));
          list.push(...batch);
          const total = typeof d.total === 'number' ? d.total : list.length;
          if (batch.length === 0 || list.length >= total) break;
        }

        // Merge so any current member also shows + is selectable.
        const byId = new Map<string, ProductLite>();
        [...list, ...colProducts].forEach((p) => byId.set(p.id, p));
        setAllProducts(Array.from(byId.values()));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load collection');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [collectionId]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const base = q
      ? allProducts.filter(
          (p) => p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)
        )
      : allProducts;
    // Show selected products first (stable order within each group).
    const selected = new Set(selectedIds);
    return [...base].sort((a, b) => (selected.has(a.id) ? 0 : 1) - (selected.has(b.id) ? 0 : 1));
  }, [allProducts, productSearch, selectedIds]);

  // Hooks above must run on every render; the role gate comes after them.
  if (session?.user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Unauthorized</p>
        <Link href="/admin/collections" className="text-blue-600 hover:underline mt-4 block">
          Back to Collections
        </Link>
      </div>
    );
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    });
  };

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
          heroImage: formData.heroImage || undefined,
          isActive: formData.isActive,
          productIds: selectedIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update collection');
      }

      router.push('/admin/collections');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete collection');
      }

      router.push('/admin/collections');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/collections" className="text-blue-600 hover:underline text-sm">
            ← Back to Collections
          </Link>
          <h1 className="text-2xl font-normal text-gray-900 mt-4">Edit Collection</h1>
          <p className="text-sm text-gray-600 mt-1">{formData.slug}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection Name *
            </label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={handleNameChange}
              className="rounded-lg"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug (auto-generated)
            </label>
            <Input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">URL-friendly identifier</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="rounded-lg"
            />
          </div>

          {/* Hero Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hero Image URL
            </label>
            <Input
              type="url"
              value={formData.heroImage}
              onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Image URL for collection banner</p>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort Order
            </label>
            <Input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Active (visible to customers)</span>
            </label>
          </div>

          {/* Products in this collection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Products ({selectedIds.length} selected)
            </label>
            <Input
              type="text"
              placeholder="Search products by name or brand..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="rounded-lg mb-3"
            />
            <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-gray-500 p-3">No products found.</p>
              ) : (
                filteredProducts.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="rounded"
                    />
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={p.name} className="w-9 h-9 rounded object-cover bg-gray-100" />
                    ) : (
                      <span className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center">📦</span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">{p.name}</p>
                      {p.brand && <p className="text-xs text-gray-500 truncate">{p.brand}</p>}
                    </div>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Tick products to include in this collection. Use search to filter by name or brand.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <Button
              type="submit"
              disabled={saving || deleting || !formData.name || !formData.slug}
              className="rounded-lg"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Link href="/admin/collections">
              <Button type="button" variant="outline" className="rounded-lg">
                Cancel
              </Button>
            </Link>
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleting}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
