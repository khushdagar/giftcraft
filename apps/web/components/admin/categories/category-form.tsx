'use client';

import { compressAndUpload } from '@/hooks/use-compressed-upload';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { X, Upload, ArrowLeft, ImageIcon, Package } from 'lucide-react';
import { RichTextField } from '@/components/admin/rich-text-field';
import { FaqRepeaterField, type FaqEntry } from '@/components/admin/faq-repeater-field';
import { MediaLibraryModal } from '@/components/admin/media-library-modal';
import { slugify } from '@/lib/slug';

interface CategoryProduct {
  product: {
    id: string;
    name: string;
    sku: string;
    status: string;
    images: { url: string }[];
  };
}

interface CategoryFormProps {
  mode?: 'create' | 'edit';
  parentCategories: Array<{ id: string; name: string }>;
  category?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    contentBelow: string | null;
    faqs?: unknown;
    metaTitle?: string | null;
    metaDescription?: string | null;
    parentId: string | null;
    sortOrder: number;
    imageUrl: string | null;
  };
  products?: CategoryProduct[];
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-rose-100 text-rose-700',
  seasonal: 'bg-amber-100 text-amber-700',
};

export function CategoryForm({ mode = 'create', parentCategories, category, products = [] }: CategoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [productSort, setProductSort] = useState<'az' | 'za'>('az');
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    contentBelow: category?.contentBelow || '',
    metaTitle: category?.metaTitle || '',
    metaDescription: category?.metaDescription || '',
    parentId: category?.parentId || '',
    sortOrder: category?.sortOrder || 0,
    imageUrl: category?.imageUrl || '',
  });
  const [imagePreview, setImagePreview] = useState<string>(category?.imageUrl || '');
  const [faqs, setFaqs] = useState<FaqEntry[]>(
    Array.isArray(category?.faqs) ? (category!.faqs as FaqEntry[]) : []
  );


  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      // Only auto-fill the slug while creating, so we don't clobber a custom one.
      slug: mode === 'create' ? slugify(name) : prev.slug,
    }));
  };

  const sortedProducts = useMemo(() => {
    const copy = [...products];
    copy.sort((a, b) =>
      productSort === 'az'
        ? a.product.name.localeCompare(b.product.name)
        : b.product.name.localeCompare(a.product.name)
    );
    return copy;
  }, [products, productSort]);

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
      const data = await compressAndUpload(file, { folder: 'categories' });
      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      setImagePreview(data.url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setImageLoading(false);
    }
  };

  const handlePickExisting = (picked: { url: string }[]) => {
    const url = picked[0]?.url;
    if (!url) return;
    setFormData((prev) => ({ ...prev, imageUrl: url }));
    setImagePreview(url);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setImagePreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Category name is required');
    if (!formData.slug.trim()) return toast.error('Slug is required');

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        contentBelow: formData.contentBelow || null,
        faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
        metaTitle: formData.metaTitle || null,
        metaDescription: formData.metaDescription || null,
        parentId: formData.parentId || null,
        sortOrder: formData.sortOrder,
        imageUrl: formData.imageUrl || null,
      };
      const url = mode === 'create' ? '/api/admin/categories' : `/api/admin/categories/${category?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${mode} category`);
      }
      toast.success(mode === 'create' ? 'Category created' : 'Category updated');
      router.push('/admin/categories');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} category`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    if (!confirm('Delete this category? Products are kept and simply un-categorised.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Category deleted');
      router.push('/admin/categories');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Top bar: back + title + actions */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/categories"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-bdr text-ink-2 transition hover:bg-gray-50"
          aria-label="Back to categories"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="flex-1 truncate text-xl font-semibold tracking-tight text-ink">
          {mode === 'create' ? 'Create category' : formData.name || 'Edit category'}
        </h1>
        {mode === 'edit' && (
          <Button type="button" variant="outline" onClick={handleDelete} disabled={deleting}
            className="border-rose-200 text-rose-600 hover:bg-rose-50">
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        )}
        <Button type="submit" variant="em" disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Title + description */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">Title</label>
            <Input id="name" value={formData.name} onChange={handleNameChange}
              placeholder="e.g., Corporate Gifts" required />

            <label htmlFor="slug" className="mb-1.5 mt-4 block text-sm font-medium text-ink">Handle (URL slug)</label>
            <Input id="slug" value={formData.slug}
              onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
              placeholder="corporate-gifts" />

            <label className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Description <span className="font-normal text-ink-3">— shows above the product grid</span>
            </label>
            <RichTextField
              value={formData.description}
              onChange={(html) => setFormData((p) => ({ ...p, description: html }))}
              placeholder="Describe this category for shoppers…"
              minHeight={130}
              uploadFolder="categories"
            />

            {/* Long-form SEO copy lives below the grid so it never pushes the
                products down the page. */}
            <label className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Content below products <span className="font-normal text-ink-3">— optional, shows under the product grid</span>
            </label>
            <RichTextField
              value={formData.contentBelow}
              onChange={(html) => setFormData((p) => ({ ...p, contentBelow: html }))}
              placeholder="Buying guide, sizing, branding options, FAQs…"
              minHeight={180}
              uploadFolder="categories"
            />
          </div>

          {/* FAQs */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-ink">FAQs</h2>
            <p className="mb-3 text-xs text-ink-3">
              Shown below the product grid and included as FAQ structured data for search engines.
            </p>
            <FaqRepeaterField value={faqs} onChange={setFaqs} uploadFolder="categories" />
          </div>

          {/* Collection items (edit mode only) */}
          {mode === 'edit' && (
            <div className="rounded-xl border border-bdr bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-bdr px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">
                  Collection items <span className="font-normal text-ink-3">({products.length})</span>
                </h2>
                {products.length > 0 && (
                  <select
                    value={productSort}
                    onChange={(e) => setProductSort(e.target.value as 'az' | 'za')}
                    className="rounded-lg border border-bdr px-2 py-1 text-xs text-ink-2 focus:outline-none"
                  >
                    <option value="az">Alphabetical: A–Z</option>
                    <option value="za">Alphabetical: Z–A</option>
                  </select>
                )}
              </div>

              {products.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Package className="mx-auto mb-2 h-6 w-6 text-ink-3" />
                  <p className="text-sm text-ink-2">No products in this category yet.</p>
                  <p className="mt-1 text-xs text-ink-3">Assign products to this category from the product editor.</p>
                </div>
              ) : (
                <ul className="divide-y divide-bdr">
                  {sortedProducts.map(({ product }) => (
                    <li key={product.id}>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="flex items-center gap-3 px-5 py-2.5 transition hover:bg-gray-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-bdr bg-gray-50">
                          {product.images[0]?.url ? (
                            <Image src={product.images[0].url} alt="" width={40} height={40} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-ink-3" />
                          )}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{product.name}</span>
                        <span className="hidden font-mono text-xs text-ink-3 sm:inline">{product.sku}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_STYLES[product.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {product.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SEO */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink">SEO metadata</h2>

            <label htmlFor="metaTitle" className="mb-1.5 block text-sm font-medium text-ink">
              Meta title
            </label>
            <Input
              id="metaTitle"
              value={formData.metaTitle}
              onChange={(e) => setFormData((p) => ({ ...p, metaTitle: e.target.value }))}
              placeholder={`${formData.name || 'Category'} — Bulk Corporate Gifts`}
            />

            <label htmlFor="metaDescription" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Meta description
            </label>
            <textarea
              id="metaDescription"
              rows={3}
              value={formData.metaDescription}
              onChange={(e) => setFormData((p) => ({ ...p, metaDescription: e.target.value }))}
              placeholder="Leave blank to fall back to the description above."
              className="w-full rounded-lg border border-bdr px-3 py-2 text-sm text-ink focus:border-em focus:outline-none"
            />
            <p className="mt-1 text-xs text-ink-3">Used for the page &lt;title&gt;, meta description and social previews.</p>
          </div>

          {/* Category image */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink">Category image</h2>
            {imagePreview ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-bdr bg-gray-50">
                <Image src={imagePreview} alt="Category preview" fill className="object-cover" />
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

            {/* Reuse an image already uploaded elsewhere instead of re-uploading. */}
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-bdr px-3 py-2 text-sm font-medium text-ink transition hover:bg-gray-50"
            >
              <ImageIcon className="h-4 w-4 text-em" />
              {imagePreview ? 'Replace from library' : 'Select existing image'}
            </button>
          </div>

          {/* Organization */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink">Organization</h2>

            <label htmlFor="parentId" className="mb-1.5 block text-sm font-medium text-ink">Parent category</label>
            <select
              id="parentId"
              value={formData.parentId}
              onChange={(e) => setFormData((p) => ({ ...p, parentId: e.target.value }))}
              className="w-full rounded-lg border border-bdr px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-em"
            >
              <option value="">None (top-level)</option>
              {parentCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <label htmlFor="sortOrder" className="mb-1.5 mt-4 block text-sm font-medium text-ink">Sort order</label>
            <Input
              id="sortOrder"
              type="number"
              min={0}
              value={formData.sortOrder}
              onChange={(e) => setFormData((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>
      </div>

      {libraryOpen && (
        <MediaLibraryModal
          multiple={false}
          title="Select category image"
          onClose={() => setLibraryOpen(false)}
          onConfirm={handlePickExisting}
        />
      )}
    </form>
  );
}
