'use client';

import { compressAndUpload } from '@/hooks/use-compressed-upload';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { Search, Plus, Minus, X, Upload, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatRupees } from '@/lib/utils';
import { SearchableMultiSelect } from '@/components/admin/products/searchable-multi-select';

// Rich diagonal gradients matching the customer "Curated Packs" card design.
export const PACK_GRADIENTS: Array<{ name: string; value: string }> = [
  { name: 'Gold', value: 'linear-gradient(145deg, #D7AC55 0%, #9A6E2E 55%, #6F4D1E 100%)' },
  { name: 'Charcoal', value: 'linear-gradient(145deg, #34332F 0%, #222222 55%, #0C0C0B 100%)' },
  { name: 'Emerald', value: 'linear-gradient(145deg, #3FA978 0%, #1F8A5C 45%, #134E36 100%)' },
  { name: 'Orange', value: 'linear-gradient(145deg, #F0A85A 0%, #D9781F 55%, #9A4E12 100%)' },
  { name: 'Ocean', value: 'linear-gradient(145deg, #4FB0C6 0%, #2D6F9E 55%, #1A3C6E 100%)' },
  { name: 'Berry', value: 'linear-gradient(145deg, #7A2130 0%, #3B2A1E 55%, #14361E 100%)' },
  { name: 'Rose', value: 'linear-gradient(145deg, #E38FBE 0%, #C25A93 55%, #7A2E5A 100%)' },
  { name: 'Slate', value: 'linear-gradient(145deg, #3A3A3A 0%, #232323 55%, #101010 100%)' },
];

interface PackTier {
  minQty: number;
  maxQty: number | null;
  sellPrice: number;
}

interface PackItem {
  productId: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  quantity: number;
  // Full quantity price tiers of the product, used to auto-compute the pack's
  // price at every quantity breakpoint (summed across all items).
  priceTiers?: PackTier[];
}

interface GiftPackFormProps {
  mode?: 'create' | 'edit';
  // The collection this pack belongs to. Set when creating a pack from inside a
  // collection, or from the pack's stored collectionId on edit. Drives where we
  // navigate back to after save/delete.
  collectionId?: string | null;
  pack?: {
    id: string;
    name: string;
    slug: string;
    descriptionShort?: string | null;
    description: string | null;
    image: string | null;
    gradient: string | null;
    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;
    items: PackItem[];
    categoryIds?: string[];
  };
}

export function GiftPackForm({
  mode = 'create',
  collectionId: initialCollectionId,
  pack,
}: GiftPackFormProps) {
  const router = useRouter();

  // The collection this pack belongs to — editable so admins can assign or move
  // a pack between collections. Defaults to the collection it was opened from.
  const [collectionId, setCollectionId] = useState<string>(initialCollectionId ?? '');
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetch('/api/admin/gift-collections')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) =>
        setCollections(
          Array.isArray(d) ? d.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : []
        )
      )
      .catch(() => {});
  }, []);

  // Packs are managed from the Products area, so always return there after save.
  const backHref = '/admin/products?view=packs';
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: pack?.name || '',
    slug: pack?.slug || '',
    descriptionShort: pack?.descriptionShort || '',
    description: pack?.description || '',
    image: pack?.image || '',
    gradient: pack?.gradient || PACK_GRADIENTS[0]?.value || '',
    isActive: pack?.isActive ?? true,
    isFeatured: pack?.isFeatured ?? false,
    sortOrder: pack?.sortOrder ?? 0,
  });

  const [items, setItems] = useState<PackItem[]>(pack?.items || []);

  // Categories the pack belongs to (reuses the product Category list).
  const [categoryIds, setCategoryIds] = useState<string[]>(pack?.categoryIds || []);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  // Product search
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      // Keep auto-slug only while creating (don't clobber an edited slug on edit).
      slug: mode === 'create' ? generateSlug(name) : prev.slug,
    }));
  };

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const all = data.products || [];
      setResults(all.filter((p: any) => !items.some((it) => it.productId === p.id)));
    } catch {
      toast.error('Failed to search products');
    } finally {
      setSearching(false);
    }
  };

  const addItem = (product: any) => {
    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        brand: product.brand,
        imageUrl: product.images?.[0]?.url ?? null,
        quantity: 1,
        priceTiers: (product.priceTiers ?? []).map((t: any) => ({
          minQty: t.minQty,
          maxQty: t.maxQty ?? null,
          sellPrice: Number(t.sellPrice),
        })),
      },
    ]);
    setResults((prev) => prev.filter((p) => p.id !== product.id));
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const setQty = (productId: string, qty: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId ? { ...it, quantity: Math.max(1, qty) } : it
      )
    );
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await compressAndUpload(file, { folder: 'gift-packs' });
      setFormData((prev) => ({ ...prev, image: data.url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Pack name is required');
    if (!formData.slug.trim()) return toast.error('Slug is required');
    if (items.length === 0) return toast.error('Add at least one product to the pack');

    setLoading(true);
    try {
      const url = mode === 'create' ? '/api/admin/gift-packs' : `/api/admin/gift-packs/${pack?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          collectionId: collectionId || null,
          categoryIds,
          items: items.map((it, i) => ({
            productId: it.productId,
            quantity: it.quantity,
            sortOrder: i,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${mode} pack`);
      }
      toast.success(`Pack ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      router.push(backHref);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${mode} pack`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this pack? This cannot be undone. Products are not affected.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/gift-packs/${pack?.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete pack');
      }
      toast.success('Pack deleted');
      router.push(backHref);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete pack');
    } finally {
      setDeleting(false);
    }
  };

  // Pack pricing, auto-derived from the selected products' own quantity tiers.
  // For a given order quantity, each product is priced at its matching tier and
  // multiplied by how many of it are in the pack; summing gives the pack price.
  const priceAtQty = (tiers: PackTier[] | undefined, qty: number) => {
    if (!tiers || tiers.length === 0) return 0;
    const t = tiers.find((t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty)) ?? tiers[0];
    return t ? Number(t.sellPrice) : 0;
  };

  // Union of every product's quantity breakpoints → one pack price per breakpoint.
  const breakpoints = Array.from(
    new Set(items.flatMap((it) => (it.priceTiers ?? []).map((t) => t.minQty)))
  ).sort((a, b) => a - b);

  const tierRows = breakpoints.map((qty) => ({
    qty,
    price: items.reduce((sum, it) => sum + priceAtQty(it.priceTiers, qty) * it.quantity, 0),
  }));

  const fromPrice = tierRows[0]?.price ?? 0;
  const missingPrice = items.some((it) => !it.priceTiers || it.priceTiers.length === 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-6">
        <h2 className="text-lg font-normal text-ink">Basic Information</h2>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Pack Name *</label>
          <Input
            type="text"
            required
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g., Premium Executive Collection"
            className="rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Slug</label>
          <Input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="e.g., premium-executive-collection"
            className="rounded-lg"
          />
          <p className="text-xs text-ink-2 mt-1">URL-friendly identifier</p>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Short Description</label>
          <Input
            type="text"
            value={formData.descriptionShort}
            onChange={(e) => setFormData({ ...formData, descriptionShort: e.target.value })}
            placeholder="e.g., A ready-to-gift executive bundle."
            className="rounded-lg"
          />
          <p className="text-xs text-ink-2 mt-1">One line shown on the pack card.</p>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g., Luxury gifts for your most valued relationships."
            rows={3}
            className="rounded-lg"
          />
          <p className="text-xs text-ink-2 mt-1">Full description shown on the pack detail page.</p>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Collection</label>
          <select
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
            className="w-full rounded-lg border-2 border-bdr bg-white px-3 py-2 text-sm text-ink focus:border-em focus:outline-none"
          >
            <option value="">— None (standalone pack) —</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-2 mt-1">
            The curated collection this pack appears under on the storefront.
          </p>
        </div>

        <SearchableMultiSelect
          label="Categories"
          placeholder={
            categories.length === 0 ? 'Loading categories…' : 'Search & select categories…'
          }
          options={categories.map((c) => ({ id: c.id, label: c.name }))}
          selected={categoryIds}
          onChange={setCategoryIds}
        />
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-6">
        <h2 className="text-lg font-normal text-ink">Appearance</h2>

        <p className="text-xs text-ink-2 -mt-2">
          By default the pack card shows a collage of its products’ images. Upload a hero image
          only if you want to override that with a single custom photo.
        </p>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">
            Hero Image <span className="text-ink-3">(optional — overrides the product collage)</span>
          </label>
          <div className="flex items-center gap-4">
            <div className="w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-bdr flex items-center justify-center bg-gray-50">
              {formData.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={formData.image} alt="Pack" className="w-full h-full object-cover" />
              ) : (
                <span className="text-ink-3 text-xs">No image</span>
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 px-4 py-2 border-2 border-bdr rounded-lg text-sm font-normal text-ink cursor-pointer hover:border-slate-300">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading…' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {formData.image && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image: '' })}
                  className="block text-xs text-red-600 hover:underline"
                >
                  Remove image
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-6">
        <div>
          <h2 className="text-lg font-normal text-ink mb-1">Products in this Pack</h2>
          <p className="text-sm text-ink-2">
            Hand-pick the products and set how many of each go in the pack.
          </p>
        </div>

        {/* Search */}
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-ink-3" />
            <Input
              type="text"
              placeholder="Search products by name, brand…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 rounded-lg"
            />
          </div>

          {search && searching && (
            <p className="text-sm text-ink-2 mt-3">Searching…</p>
          )}

          {search && !searching && results.length === 0 && (
            <div className="text-center py-4 mt-3 bg-canvas rounded-lg">
              <p className="text-sm text-ink-2">No products found</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="bg-canvas rounded-lg border border-bdr p-3 mt-3 max-h-64 overflow-y-auto space-y-2">
              {results.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-bdr hover:border-em transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {p.images?.[0]?.url && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        <Image
                          src={p.images[0].url}
                          alt={p.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                      {p.brand && <p className="text-xs text-ink-2 truncate">{p.brand}</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(p)}
                    className="ml-2 flex-shrink-0 p-2 rounded-lg bg-em hover:bg-em-600 text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected items */}
        <div className="border-t border-bdr pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-normal text-ink">In this pack ({items.length})</h3>
            {items.length > 0 && (
              <div className="text-right">
                <span className="text-xs text-ink-2">From </span>
                <span className="text-lg font-semibold text-ink tabular-nums">
                  {formatRupees(fromPrice)}
                </span>
                <span className="text-xs text-ink-2">/pack</span>
              </div>
            )}
          </div>
          {missingPrice && (
            <p className="text-xs text-amber-600 mb-3">
              Some products have no tier-1 price yet, so they’re excluded from the total above.
            </p>
          )}
          {items.length === 0 ? (
            <div className="text-center py-8 bg-canvas rounded-lg border-2 border-dashed border-bdr">
              <p className="text-ink-2">No products added yet</p>
              <p className="text-xs text-ink-3 mt-1">Search and add products above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <div
                  key={it.productId}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-canvas border border-bdr"
                >
                  <GripVertical className="w-4 h-4 text-ink-3 flex-shrink-0" />
                  {it.imageUrl && (
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      <Image
                        src={it.imageUrl}
                        alt={it.name}
                        width={44}
                        height={44}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{it.name}</p>
                    {it.brand && <p className="text-xs text-ink-2 truncate">{it.brand}</p>}
                  </div>

                  {/* Quantity stepper */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setQty(it.productId, it.quantity - 1)}
                      className="p-1.5 rounded-lg border border-bdr text-ink-2 hover:border-em disabled:opacity-40"
                      disabled={it.quantity <= 1}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => setQty(it.productId, parseInt(e.target.value) || 1)}
                      className="w-12 text-center text-sm border border-bdr rounded-lg py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(it.productId, it.quantity + 1)}
                      className="p-1.5 rounded-lg border border-bdr text-ink-2 hover:border-em"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(it.productId)}
                    className="flex-shrink-0 p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto price tiers — summed from each product's own quantity tiers. */}
        {tierRows.length > 0 && (
          <div className="border-t border-bdr pt-5">
            <h3 className="font-normal text-ink mb-1">Price by quantity</h3>
            <p className="text-xs text-ink-2 mb-3">
              Auto-calculated by adding up each product’s quantity price tier — this is
              what a buyer pays per pack at each order size.
            </p>
            <div className="rounded-lg border border-bdr overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-canvas">
                  <tr>
                    <th className="text-left px-4 py-2 font-normal text-ink-2">Order quantity</th>
                    <th className="text-right px-4 py-2 font-normal text-ink-2">Price / pack</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bdr">
                  {tierRows.map((r, i) => {
                    const next = tierRows[i + 1];
                    const label = next ? `${r.qty}–${next.qty - 1}` : `${r.qty}+`;
                    return (
                      <tr key={r.qty}>
                        <td className="px-4 py-2 text-ink">{label} units</td>
                        <td className="px-4 py-2 text-right text-ink tabular-nums font-medium">
                          {formatRupees(r.price)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-6">
        <h2 className="text-lg font-normal text-ink">Settings</h2>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Sort Order</label>
          <Input
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
            className="rounded-lg"
          />
          <p className="text-xs text-ink-2 mt-1">Lower numbers appear first</p>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-em-50 border-2 border-em-200">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-5 h-5 rounded cursor-pointer accent-em"
          />
          <label htmlFor="isActive" className="text-sm font-normal text-ink cursor-pointer flex-1">
            Active (visible to customers)
          </label>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border-2 border-amber-200">
          <input
            type="checkbox"
            id="isFeatured"
            checked={formData.isFeatured}
            onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
            className="w-5 h-5 rounded cursor-pointer accent-amber-500"
          />
          <label htmlFor="isFeatured" className="text-sm font-normal text-ink cursor-pointer flex-1">
            Featured (highlight this pack)
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t border-bdr">
        <button
          type="submit"
          disabled={loading || deleting || !formData.name || !formData.slug}
          className="px-6 py-3 bg-em hover:bg-em-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-normal rounded-lg transition-colors"
        >
          {loading ? 'Saving…' : mode === 'create' ? 'Create Pack' : 'Update Pack'}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading || deleting}
          className="px-6 py-3 border-2 border-bdr hover:border-slate-300 text-ink font-normal rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || loading}
            className="px-6 py-3 ml-auto bg-red-50 hover:bg-red-100 text-red-600 font-normal rounded-lg transition-colors border-2 border-red-200 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete Pack'}
          </button>
        )}
      </div>
    </form>
  );
}
