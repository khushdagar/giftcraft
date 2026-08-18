'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { compressAndUpload } from '@/hooks/use-compressed-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { X, Upload, ArrowLeft } from 'lucide-react';
import { slugify } from '@/lib/slug';

// Same palette the tile grid falls back to, offered here so a band without a
// photo still gets a deliberate face rather than a random one.
const BAND_GRADIENTS = [
  { label: 'Gold', value: 'linear-gradient(145deg, #D7AC55 0%, #9A6E2E 55%, #6F4D1E 100%)' },
  { label: 'Charcoal', value: 'linear-gradient(145deg, #34332F 0%, #222222 55%, #0C0C0B 100%)' },
  { label: 'Emerald', value: 'linear-gradient(145deg, #3FA978 0%, #1F8A5C 45%, #134E36 100%)' },
  { label: 'Navy', value: 'linear-gradient(145deg, #4A90D9 0%, #2D5A9E 55%, #1A3C6E 100%)' },
  { label: 'Plum', value: 'linear-gradient(145deg, #A45C9B 0%, #6E3468 55%, #431F41 100%)' },
  { label: 'Rust', value: 'linear-gradient(145deg, #D97A4A 0%, #A2512A 55%, #6B3319 100%)' },
];

interface BudgetBandFormProps {
  mode?: 'create' | 'edit';
  band?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    gradient: string | null;
    minPrice: number;
    maxPrice: number | null;
    sortOrder: number;
    isActive: boolean;
  };
}

export function BudgetBandForm({ mode = 'create', band }: BudgetBandFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(band?.imageUrl || '');
  const [formData, setFormData] = useState({
    name: band?.name || '',
    slug: band?.slug || '',
    description: band?.description || '',
    imageUrl: band?.imageUrl || '',
    gradient: band?.gradient || BAND_GRADIENTS[0]!.value,
    minPrice: band?.minPrice ?? 0,
    // Empty means "and above" — the band has no ceiling.
    maxPrice: band?.maxPrice == null ? '' : String(band.maxPrice),
    sortOrder: band?.sortOrder ?? 0,
    isActive: band?.isActive ?? true,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setImageLoading(true);
    try {
      const data = await compressAndUpload(file, { folder: 'budget-bands' });
      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      setImagePreview(data.url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setImageLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setImagePreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        slug: formData.slug || slugify(formData.name),
        description: formData.description || null,
        imageUrl: formData.imageUrl || null,
        gradient: formData.gradient || null,
        minPrice: Number(formData.minPrice) || 0,
        maxPrice: formData.maxPrice === '' ? null : Number(formData.maxPrice),
        sortOrder: Number(formData.sortOrder) || 0,
        isActive: formData.isActive,
      };

      const res = await fetch(
        mode === 'edit' ? `/api/admin/budget-bands/${band!.id}` : '/api/admin/budget-bands',
        {
          method: mode === 'edit' ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      toast.success(mode === 'edit' ? 'Band updated' : 'Band created');
      router.push('/admin/budget-bands');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!band) return;
    if (!confirm(`Delete “${band.name}”? Packs are untouched — they just stop being reachable at this price range.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/budget-bands/${band.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Band deleted');
      router.push('/admin/budget-bands');
      router.refresh();
    } catch {
      toast.error('Failed to delete');
      setDeleting(false);
    }
  };

  const rangeLabel = `₹${formData.minPrice || 0} – ${
    formData.maxPrice === '' ? 'no upper limit' : `₹${formData.maxPrice}`
  }`;

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/admin/budget-bands"
            className="mb-2 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Budget bands
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {mode === 'edit' ? band!.name : 'New budget band'}
          </h1>
          <p className="mt-1 text-sm text-ink-2">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'edit' && (
            <Button type="button" variant="outline" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          )}
          <Button type="submit" variant="em" disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Details */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink">Details</h2>

            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
              Name
            </label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData((p) => ({
                  ...p,
                  name,
                  // Only auto-fill while creating — renaming a live band must
                  // not silently change its URL.
                  slug: mode === 'create' ? slugify(name) : p.slug,
                }));
              }}
              placeholder="₹500 – ₹1,000"
            />

            <label htmlFor="slug" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              URL
            </label>
            <Input
              id="slug"
              required
              value={formData.slug}
              onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
              placeholder="500-1000"
            />
            <p className="mt-1 text-xs text-ink-3">/curated-packs/budget/{formData.slug || '…'}</p>

            <label htmlFor="description" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="The volume sweet spot for onboarding kits and festive giveaways."
              className="w-full rounded-lg border border-bdr px-3 py-2 text-sm text-ink focus:border-em focus:outline-none"
            />
            <p className="mt-1 text-xs text-ink-3">Shown under the heading on the band&apos;s page.</p>
          </div>

          {/* Price range */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-ink">Price range</h2>
            <p className="mb-3 text-xs text-ink-3">
              A pack lands here automatically when its per-pack price falls in this range — there is
              nothing to add by hand. Ranges must not overlap another band.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="minPrice" className="mb-1.5 block text-sm font-medium text-ink">
                  From (₹)
                </label>
                <Input
                  id="minPrice"
                  type="number"
                  min={0}
                  required
                  value={formData.minPrice}
                  onChange={(e) => setFormData((p) => ({ ...p, minPrice: Number(e.target.value) }))}
                />
                <p className="mt-1 text-xs text-ink-3">Included in this band.</p>
              </div>
              <div>
                <label htmlFor="maxPrice" className="mb-1.5 block text-sm font-medium text-ink">
                  Up to (₹)
                </label>
                <Input
                  id="maxPrice"
                  type="number"
                  min={1}
                  value={formData.maxPrice}
                  onChange={(e) => setFormData((p) => ({ ...p, maxPrice: e.target.value }))}
                  placeholder="Leave blank for “and above”"
                />
                <p className="mt-1 text-xs text-ink-3">
                  Not included — a pack at exactly this price goes in the next band.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Image */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink">Tile image</h2>
            {imagePreview ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-bdr bg-gray-50">
                <Image src={imagePreview} alt="Band preview" fill className="object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-ink-2 shadow transition hover:text-rose-600"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-bdr transition hover:bg-gray-50">
                <Upload className="mb-1.5 h-6 w-6 text-em" />
                <p className="text-sm font-medium text-ink">
                  {imageLoading ? 'Uploading…' : 'Add image'}
                </p>
                <p className="text-xs text-ink-3">PNG, JPG up to 5MB</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={imageLoading}
                  className="hidden"
                />
              </label>
            )}
            <p className="mt-2 text-xs text-ink-3">
              Without an image the tile uses the colour below.
            </p>
          </div>

          {/* Fallback colour */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink">Fallback colour</h2>
            <div className="grid grid-cols-3 gap-2">
              {BAND_GRADIENTS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, gradient: g.value }))}
                  className={`h-14 rounded-lg border-2 transition ${
                    formData.gradient === g.value ? 'border-em' : 'border-transparent'
                  }`}
                  style={{ background: g.value }}
                  aria-label={g.label}
                  title={g.label}
                />
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink">Settings</h2>

            <label htmlFor="sortOrder" className="mb-1.5 block text-sm font-medium text-ink">
              Sort order
            </label>
            <Input
              id="sortOrder"
              type="number"
              min={0}
              value={formData.sortOrder}
              onChange={(e) => setFormData((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
            />
            <p className="mt-1 text-xs text-ink-3">Lower numbers appear first</p>

            <label htmlFor="isActive" className="mt-4 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-bdr accent-em"
              />
              <span className="text-sm text-ink">Active (visible to customers)</span>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
