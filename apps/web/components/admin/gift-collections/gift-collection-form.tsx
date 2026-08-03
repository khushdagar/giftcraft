'use client';

import { compressAndUpload } from '@/hooks/use-compressed-upload';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
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
  };
}

export function GiftCollectionForm({ mode = 'create', collection }: GiftCollectionFormProps) {
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
  });


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
        router.push('/admin/products?view=packs');
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
      router.push('/admin/products?view=packs');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete collection');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
                <img src={formData.image} alt="Collection" className="w-full h-full object-cover" />
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
            Featured (highlight this collection)
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
          {loading
            ? 'Saving…'
            : mode === 'create'
            ? 'Create Collection & Add Packs'
            : 'Update Collection'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/admin/products?view=packs')}
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
            {deleting ? 'Deleting…' : 'Delete Collection'}
          </button>
        )}
      </div>
    </form>
  );
}
