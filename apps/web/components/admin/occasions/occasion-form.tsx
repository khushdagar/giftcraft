'use client';

import { compressAndUpload } from '@/hooks/use-compressed-upload';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { X, Upload, ArrowLeft } from 'lucide-react';
import { RichTextField } from '@/components/admin/rich-text-field';
import { FaqRepeaterField, type FaqEntry } from '@/components/admin/faq-repeater-field';
import { slugify } from '@/lib/slug';

interface OccasionFormProps {
  mode?: 'create' | 'edit';
  occasion?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    imageUrl?: string | null;
    gradient: string | null;
    description: string | null;
    contentBelow?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    faqs?: unknown;
    packName?: string | null;
    packDescription?: string | null;
    packContentBelow?: string | null;
    packMetaTitle?: string | null;
    packMetaDescription?: string | null;
    packFaqs?: unknown;
    sortOrder: number;
    isActive: boolean;
    isCollection?: boolean;
    tags?: string[];
  };
}

export function OccasionForm({ mode = 'create', occasion }: OccasionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(occasion?.imageUrl || '');
  const [formData, setFormData] = useState({
    name: occasion?.name || '',
    slug: occasion?.slug || '',
    // Icon and gradient are legacy styling fields — no longer editable here,
    // but preserved on save so existing customer tiles don't change.
    icon: occasion?.icon || '🎁',
    imageUrl: occasion?.imageUrl || '',
    gradient: occasion?.gradient || 'from-orange-400 to-yellow-400',
    description: occasion?.description || '',
    contentBelow: occasion?.contentBelow || '',
    metaTitle: occasion?.metaTitle || '',
    metaDescription: occasion?.metaDescription || '',
    packName: occasion?.packName || '',
    packDescription: occasion?.packDescription || '',
    packContentBelow: occasion?.packContentBelow || '',
    packMetaTitle: occasion?.packMetaTitle || '',
    packMetaDescription: occasion?.packMetaDescription || '',
    sortOrder: occasion?.sortOrder || 0,
    isActive: occasion?.isActive ?? true,
    isCollection: occasion?.isCollection ?? false,
    tags: occasion?.tags || ([] as string[]),
  });
  const [faqs, setFaqs] = useState<FaqEntry[]>(
    Array.isArray(occasion?.faqs) ? (occasion!.faqs as FaqEntry[]) : []
  );
  const [packFaqs, setPackFaqs] = useState<FaqEntry[]>(
    Array.isArray(occasion?.packFaqs) ? (occasion!.packFaqs as FaqEntry[]) : []
  );

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
      const data = await compressAndUpload(file, { folder: 'occasions' });
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

  const addTag = () => {
    const val = tagInput.trim().toLowerCase();
    if (!val) return;
    if (!formData.tags.includes(val)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, val] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };


  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: mode === 'create' ? slugify(name) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Occasion name is required');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('Slug is required');
      return;
    }

    setLoading(true);
    try {
      const url = mode === 'create'
        ? '/api/admin/occasions'
        : `/api/admin/occasions/${occasion?.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const payload = {
        ...formData,
        faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
        packFaqs: packFaqs.filter((f) => f.question.trim() && f.answer.trim()),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${mode} occasion`);
      }

      toast.success(`Occasion ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      router.push('/admin/occasions');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} occasion`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure? This will not delete linked products, but remove the occasion classification.')) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/occasions/${occasion?.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete occasion');
      }

      toast.success('Occasion deleted successfully!');
      router.push('/admin/occasions');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete occasion');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Sticky top bar: back + title + actions (sits below the 64px admin topbar) */}
      <div className="sticky top-16 z-10 -mx-4 -mt-4 mb-6 flex items-center gap-3 border-b border-bdr bg-gray-50 px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8">
        <Link
          href="/admin/occasions"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-bdr text-ink-2 transition hover:bg-white"
          aria-label="Back to occasions"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="flex-1 truncate text-xl font-semibold tracking-tight text-ink">
          {mode === 'create' ? 'New occasion' : formData.name || 'Edit occasion'}
        </h1>
        {mode === 'edit' && (
          <Button type="button" variant="outline" onClick={handleDelete} disabled={deleting || loading}
            className="border-rose-200 text-rose-600 hover:bg-rose-50">
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        )}
        <Button type="submit" variant="em" disabled={loading || deleting}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Title + slug */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">Title</label>
            <Input id="name" required value={formData.name} onChange={handleNameChange}
              placeholder="e.g., Diwali" />

            <label htmlFor="slug" className="mb-1.5 mt-4 block text-sm font-medium text-ink">Handle (URL slug)</label>
            <Input id="slug" value={formData.slug}
              onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
              placeholder="diwali" />
            <p className="mt-1 text-xs text-ink-3">
              Shared by both pages below — /occasion/{formData.slug || '…'} and /curated-packs/occasions/{formData.slug || '…'}
            </p>
          </div>

          {/* Product page — /occasion/[slug]. This occasion's regular, non-pack products. */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">Product page</h2>
            <p className="mt-1 text-xs text-ink-3">
              /occasion/{formData.slug || '…'} — shown when browsing regular products under this occasion.
            </p>

            <label className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Description <span className="font-normal text-ink-3">— shows above the product grid</span>
            </label>
            <RichTextField
              value={formData.description}
              onChange={(html) => setFormData((p) => ({ ...p, description: html }))}
              placeholder="e.g., Light up your relationships with Diwali gifts"
              minHeight={130}
              uploadFolder="occasions"
            />

            <label className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Content below products <span className="font-normal text-ink-3">— optional, shows under the product grid</span>
            </label>
            <RichTextField
              value={formData.contentBelow}
              onChange={(html) => setFormData((p) => ({ ...p, contentBelow: html }))}
              placeholder="Gifting guide, budget tips, delivery timelines…"
              minHeight={150}
              uploadFolder="occasions"
            />

            <label htmlFor="metaTitle" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Meta title
            </label>
            <Input
              id="metaTitle"
              value={formData.metaTitle}
              onChange={(e) => setFormData((p) => ({ ...p, metaTitle: e.target.value }))}
              placeholder={`${formData.name || 'Occasion'} Gifts — Bulk Corporate Gifting`}
            />

            <label htmlFor="metaDescription" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Meta description
            </label>
            <textarea
              id="metaDescription"
              rows={3}
              value={formData.metaDescription}
              onChange={(e) => setFormData((p) => ({ ...p, metaDescription: e.target.value }))}
              placeholder="Leave blank to fall back to the generated description."
              className="w-full rounded-lg border border-bdr px-3 py-2 text-sm text-ink focus:border-em focus:outline-none"
            />
            <p className="mt-1 text-xs text-ink-3">Used for the page &lt;title&gt;, meta description and social previews.</p>

            <label className="mb-1.5 mt-4 block text-sm font-medium text-ink">FAQs</label>
            <p className="mb-2 text-xs text-ink-3">
              Shown below the product grid and included as FAQ structured data for search engines.
            </p>
            <FaqRepeaterField value={faqs} onChange={setFaqs} uploadFolder="occasions" />
          </div>

          {/* Curated pack page — /curated-packs/occasions/[slug]. Independent copy from the
              product page above: the same occasion tags both regular products and curated
              packs, but the two pages would otherwise render identical text — thin/duplicate
              content for search engines. */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">Curated pack page</h2>
            <p className="mt-1 text-xs text-ink-3">
              /curated-packs/occasions/{formData.slug || '…'} — shown when browsing curated gift
              packs under this occasion. Kept separate from the product page above so both pages
              have their own copy for SEO.
            </p>

            <label htmlFor="packName" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Title override <span className="font-normal text-ink-3">— optional, shown as the H1 on this page instead of the Title above</span>
            </label>
            <Input
              id="packName"
              value={formData.packName}
              onChange={(e) => setFormData((p) => ({ ...p, packName: e.target.value }))}
              placeholder={formData.name || 'Occasion'}
            />

            <label htmlFor="packDescription" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Description <span className="font-normal text-ink-3">— shows above the pack grid</span>
            </label>
            <textarea
              id="packDescription"
              rows={3}
              value={formData.packDescription}
              onChange={(e) => setFormData((p) => ({ ...p, packDescription: e.target.value }))}
              placeholder={`Curated packs ready for ${formData.name || 'this occasion'} — customise any of them with your branding.`}
              className="w-full rounded-lg border border-bdr px-3 py-2 text-sm text-ink focus:border-em focus:outline-none"
            />

            <label className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Content below packs <span className="font-normal text-ink-3">— optional, shows under the pack grid</span>
            </label>
            <RichTextField
              value={formData.packContentBelow}
              onChange={(html) => setFormData((p) => ({ ...p, packContentBelow: html }))}
              placeholder="Gifting guide, budget tips, delivery timelines…"
              minHeight={150}
              uploadFolder="occasions"
            />

            <label htmlFor="packMetaTitle" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Meta title
            </label>
            <Input
              id="packMetaTitle"
              value={formData.packMetaTitle}
              onChange={(e) => setFormData((p) => ({ ...p, packMetaTitle: e.target.value }))}
              placeholder={`${formData.name || 'Occasion'} Gift Packs`}
            />

            <label htmlFor="packMetaDescription" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Meta description
            </label>
            <textarea
              id="packMetaDescription"
              rows={3}
              value={formData.packMetaDescription}
              onChange={(e) => setFormData((p) => ({ ...p, packMetaDescription: e.target.value }))}
              placeholder="Leave blank to fall back to the generated description."
              className="w-full rounded-lg border border-bdr px-3 py-2 text-sm text-ink focus:border-em focus:outline-none"
            />
            <p className="mt-1 text-xs text-ink-3">Used for the page &lt;title&gt;, meta description and social previews.</p>

            <label className="mb-1.5 mt-4 block text-sm font-medium text-ink">FAQs</label>
            <p className="mb-2 text-xs text-ink-3">
              Shown below the pack grid and included as FAQ structured data for search engines.
            </p>
            <FaqRepeaterField value={packFaqs} onChange={setPackFaqs} uploadFolder="occasions" />
          </div>

          {/* Tags — drive tag-based product membership */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">Product tags</h2>
            <p className="mt-1 text-xs text-ink-3">
              Any product whose tags include one of these is automatically pulled in — no manual linking needed.
            </p>

            {formData.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-bdr bg-gray-50 px-3 py-1 text-sm text-ink"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-ink-2 hover:text-rose-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <Input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="e.g., budget-friendly"
              />
              <Button type="button" variant="outline" onClick={addTag} className="whitespace-nowrap">
                Add tag
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Occasion image */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink">Occasion image</h2>
            {imagePreview ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-bdr bg-gray-50">
                <Image src={imagePreview} alt="Occasion preview" fill className="object-cover" />
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
                <p className="text-sm font-medium text-ink">{imageLoading ? 'Uploading…' : 'Add image'}</p>
                <p className="text-xs text-ink-3">PNG, JPG up to 5MB</p>
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={imageLoading} className="hidden" />
              </label>
            )}
          </div>

          {/* Settings */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink">Settings</h2>

            <label htmlFor="sortOrder" className="mb-1.5 block text-sm font-medium text-ink">Sort order</label>
            <Input
              id="sortOrder"
              type="number"
              min={0}
              value={formData.sortOrder}
              onChange={(e) => setFormData((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
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

            <label htmlFor="isCollection" className="mt-3 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                id="isCollection"
                checked={formData.isCollection}
                onChange={(e) => setFormData((p) => ({ ...p, isCollection: e.target.checked }))}
                className="h-4 w-4 rounded border-bdr accent-em"
              />
              <span className="text-sm text-ink">Curated collection (shows in homepage collections, not as an occasion tile)</span>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
