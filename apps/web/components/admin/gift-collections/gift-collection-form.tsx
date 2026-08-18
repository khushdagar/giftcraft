'use client';

import { compressAndUpload } from '@/hooks/use-compressed-upload';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, ArrowLeft, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PACK_GRADIENTS } from '@/components/admin/gift-packs/gift-pack-form';
import { slugify } from '@/lib/slug';

interface GiftCollectionFormProps {
  mode?: 'create' | 'edit';
  collection?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    gradient: string | null;
    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;
    parentId: string | null;
  };
  /** Top-level collections this one may be nested under (self excluded). Empty
      when the collection already has sub-collections, since the tree is capped
      at two levels. */
  parentOptions?: { id: string; name: string; slug: string }[];
  /** True when this collection already holds sub-collections — it then cannot
      itself become one. */
  hasChildren?: boolean;
  /** Create mode only: pre-selects a parent (from "+ Sub-collection"). */
  presetParentId?: string | null;
  /** Server-rendered "Packs in this collection" panel, shown atop the main column. */
  packsSlot?: ReactNode;
  /** Counts for the sidebar summary (edit mode only). */
  stats?: {
    packCount: number;
    activePackCount: number;
    productCount: number;
  };
}

export function GiftCollectionForm({
  mode = 'create',
  collection,
  parentOptions = [],
  hasChildren = false,
  presetParentId = null,
  packsSlot,
  stats,
}: GiftCollectionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: collection?.name || '',
    slug: collection?.slug || '',
    description: collection?.description || '',
    image: collection?.image || '',
    gradient: collection?.gradient || PACK_GRADIENTS[0]?.value || '',
    isActive: collection?.isActive ?? true,
    isFeatured: collection?.isFeatured ?? false,
    sortOrder: collection?.sortOrder ?? 0,
    parentId: collection?.parentId ?? presetParentId ?? '',
  });

  const backHref = '/admin/products?view=packs';

  // A sub-collection lives one segment deeper — the preview link and the "URL"
  // row must point at the address customers actually land on.
  const parentSlug = parentOptions.find((o) => o.id === formData.parentId)?.slug;
  const storefrontPath = parentSlug
    ? `/curated-packs/${parentSlug}/${formData.slug}`
    : `/curated-packs/${formData.slug}`;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: mode === 'create' ? slugify(name) : prev.slug,
    }));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await compressAndUpload(file, { folder: 'gift-collections' });
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
    if (!formData.name.trim()) return toast.error('Collection name is required');
    if (!formData.slug.trim()) return toast.error('Slug is required');

    setLoading(true);
    try {
      const url =
        mode === 'create'
          ? '/api/admin/gift-collections'
          : `/api/admin/gift-collections/${collection?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${mode} collection`);
      }
      const saved = await res.json();
      toast.success(`Collection ${mode === 'create' ? 'created' : 'updated'}!`);
      // After creating, jump straight into the collection so packs can be added.
      if (mode === 'create') {
        router.push(`/admin/gift-collections/${saved.id}/edit`);
      } else {
        router.push(backHref);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${mode} collection`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Delete this collection? The packs inside are NOT deleted — they become standalone packs.'
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/gift-collections/${collection?.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete collection');
      }
      toast.success('Collection deleted');
      router.push(backHref);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete collection');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sticky action bar — Save stays reachable while scrolling. Sits just
          below the admin topbar (h-16), matching the product editor. */}
      <div className="sticky top-16 z-30 -mx-4 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition hover:bg-gray-50"
            aria-label="Back to curated collections"
            title="Back to curated collections"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium text-gray-900">
            {mode === 'create' ? 'New Collection' : 'Edit Collection'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            disabled={loading || deleting}
            className="rounded-lg border-2 border-bdr px-4 py-2 text-sm font-normal text-ink transition-colors hover:border-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || deleting || !formData.name || !formData.slug}
            className="rounded-lg bg-em px-5 py-2 text-sm font-normal text-white transition-colors hover:bg-em-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? 'Saving…'
              : mode === 'create'
              ? 'Create Collection & Add Packs'
              : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-start">
        {/* ── Main column ──────────────────────────────────────────────────── */}
        <div className="space-y-5 lg:col-span-2">
          {/* Basic Info */}
          <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-6">
            <h2 className="text-lg font-normal text-ink">Basic Information</h2>

            <div>
              <label className="block text-sm font-normal text-ink mb-2">Collection Name *</label>
              <Input
                type="text"
                required
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g., Weight Loss Starter Kits"
                className="rounded-lg"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-normal text-ink mb-2">Slug</label>
                <Input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g., weight-loss-starter-kits"
                  className="rounded-lg"
                />
                <p className="text-xs text-ink-2 mt-1">URL-friendly identifier</p>
              </div>

              <div>
                <label className="block text-sm font-normal text-ink mb-2">Sort Order</label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                  }
                  className="rounded-lg"
                />
                <p className="text-xs text-ink-2 mt-1">Lower numbers appear first</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-normal text-ink mb-2">
                What is this?
              </label>
              {/* A radio pair, not a "parent" dropdown: the choice is what the
                  collection IS, and the dropdown is only the follow-up question
                  when it is a sub-collection. */}
              <div className="space-y-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition ${
                    formData.parentId ? 'border-bdr hover:border-slate-300' : 'border-em bg-em-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="collectionLevel"
                    checked={!formData.parentId}
                    onChange={() => setFormData({ ...formData, parentId: '' })}
                    className="mt-0.5 h-4 w-4 accent-em"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">Main collection</span>
                    <span className="block text-xs text-ink-2">
                      Shows on the Curated Packs page. Can hold packs directly, or be split into
                      sub-collections later.
                    </span>
                  </span>
                </label>

                <label
                  className={`flex items-start gap-3 rounded-lg border-2 p-3 transition ${
                    hasChildren || parentOptions.length === 0
                      ? 'cursor-not-allowed border-bdr opacity-50'
                      : formData.parentId
                      ? 'cursor-pointer border-em bg-em-50'
                      : 'cursor-pointer border-bdr hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="collectionLevel"
                    checked={!!formData.parentId}
                    disabled={hasChildren || parentOptions.length === 0}
                    onChange={() =>
                      setFormData({ ...formData, parentId: parentOptions[0]?.id ?? '' })
                    }
                    className="mt-0.5 h-4 w-4 accent-em"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">Sub-collection</span>
                    <span className="block text-xs text-ink-2">
                      Sits inside a main collection. Customers open the main collection first, then
                      this one, then its packs.
                    </span>
                  </span>
                </label>
              </div>

              {formData.parentId && (
                <div className="mt-3">
                  <label className="block text-sm font-normal text-ink mb-2">Inside which collection?</label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full rounded-lg border-2 border-bdr px-3 py-2 text-sm text-ink focus:border-em focus:outline-none"
                  >
                    {parentOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {hasChildren && (
                <p className="text-xs text-ink-2 mt-2">
                  This one already holds sub-collections, so it has to stay a main collection. Move
                  its sub-collections out first if you want to change that.
                </p>
              )}
              {!hasChildren && parentOptions.length === 0 && (
                <p className="text-xs text-ink-2 mt-2">
                  There is no other main collection to sit inside yet.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-normal text-ink mb-2">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Ready-made kits to kick-start a wellness journey."
                rows={2}
                className="rounded-lg"
              />
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-6">
            <h2 className="text-lg font-normal text-ink">Appearance</h2>

            <div>
              <label className="block text-sm font-normal text-ink mb-3">Card Gradient</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PACK_GRADIENTS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, gradient: g.value })}
                    className={`p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                      formData.gradient === g.value
                        ? 'border-slate-900 ring-2 ring-em'
                        : 'border-bdr hover:border-slate-300'
                    }`}
                  >
                    <div className="h-14 rounded mb-2" style={{ background: g.value }} />
                    {g.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-2 mt-2">
                Used as the tile background when no hero image is set.
              </p>
            </div>

            <div>
              <label className="block text-sm font-normal text-ink mb-2">
                Hero Image <span className="text-ink-3">(optional — overrides gradient)</span>
              </label>
              <div className="flex items-center gap-4">
                <div
                  className="w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-bdr flex items-center justify-center"
                  style={{ background: formData.image ? undefined : formData.gradient }}
                >
                  {formData.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.image}
                      alt="Collection"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white/70 text-xs">Gradient</span>
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

          {packsSlot}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="space-y-5 lg:col-span-1">
          {/* Live preview — the tile exactly as it renders on /curated-packs. */}
          <div className="bg-white rounded-lg border-2 border-bdr p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">Preview</h2>
            <div className="overflow-hidden rounded-lg border border-bdr">
              <div
                className="relative h-32"
                style={{ background: formData.image ? undefined : formData.gradient }}
              >
                {formData.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formData.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <p className="absolute inset-x-0 bottom-0 p-4 text-lg font-semibold text-white drop-shadow">
                    {formData.name || 'Collection name'}
                  </p>
                )}
              </div>
              <div className="space-y-1 bg-white p-3">
                {formData.image && (
                  <p className="text-sm font-medium text-ink">
                    {formData.name || 'Collection name'}
                  </p>
                )}
                <p className="line-clamp-2 text-xs text-ink-2">
                  {formData.description || 'No description yet.'}
                </p>
                {stats && (
                  <p className="text-xs text-ink-3">
                    {stats.packCount} pack{stats.packCount === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            </div>
            {mode === 'edit' && formData.slug && (
              <a
                href={storefrontPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-em hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View on the storefront
              </a>
            )}
          </div>

          {/* Visibility */}
          <div className="bg-white rounded-lg border-2 border-bdr p-5 space-y-4">
            <h2 className="text-sm font-medium text-ink">Visibility</h2>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-em-50 border-2 border-em-200">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-5 h-5 rounded cursor-pointer accent-em"
              />
              <label
                htmlFor="isActive"
                className="text-sm font-normal text-ink cursor-pointer flex-1"
              >
                Active (visible to customers)
              </label>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border-2 border-amber-200">
              <input
                type="checkbox"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-5 h-5 rounded cursor-pointer accent-amber-500"
              />
              <label
                htmlFor="isFeatured"
                className="text-sm font-normal text-ink cursor-pointer flex-1"
              >
                Featured (highlight this collection)
              </label>
            </div>

            <p className="text-xs text-ink-3">
              An inactive collection is hidden from the storefront, but its packs stay live on their
              own pages.
            </p>
          </div>

          {/* At a glance */}
          {mode === 'edit' && stats && (
            <div className="bg-white rounded-lg border-2 border-bdr p-5 space-y-3">
              <h2 className="text-sm font-medium text-ink">At a glance</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">Packs</dt>
                  <dd className="tabnum font-medium text-ink">{stats.packCount}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">Active packs</dt>
                  <dd className="tabnum font-medium text-ink">{stats.activePackCount}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">Products across packs</dt>
                  <dd className="tabnum font-medium text-ink">{stats.productCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-bdr pt-2">
                  <dt className="text-ink-2">URL</dt>
                  <dd className="truncate font-mono text-xs text-ink-2">
                    {storefrontPath}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Danger zone */}
          {mode === 'edit' && (
            <div className="rounded-lg border-2 border-red-200 bg-red-50/50 p-5 space-y-3">
              <h2 className="text-sm font-medium text-red-900">Delete collection</h2>
              <p className="text-xs text-red-700">
                The packs inside are not deleted — they become standalone packs you can reassign.
              </p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || loading}
                className="w-full rounded-lg border-2 border-red-200 bg-white px-4 py-2 text-sm font-normal text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete Collection'}
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
