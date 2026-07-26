'use client';

import { compressAndUpload } from '@/hooks/use-compressed-upload';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { X, Upload } from 'lucide-react';

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
    sortOrder: number;
    isActive: boolean;
    isCollection?: boolean;
    tags?: string[];
  };
}

// Popular emoji icons for occasions
const EMOJI_OPTIONS = ['🎁', '🪔', '💒', '🎂', '💝', '💼', '🎉', '🎊', '👰', '🏆', '✨', '🌟', '💐', '🎈', '🍰'];

// Popular Tailwind gradients
const GRADIENT_OPTIONS = [
  { name: 'Orange to Yellow', value: 'from-orange-400 to-yellow-400' },
  { name: 'Blue to Cyan', value: 'from-blue-400 to-cyan-400' },
  { name: 'Green to Emerald', value: 'from-green-400 to-emerald-400' },
  { name: 'Purple to Pink', value: 'from-purple-400 to-pink-400' },
  { name: 'Red to Orange', value: 'from-red-400 to-orange-400' },
  { name: 'Indigo to Purple', value: 'from-indigo-400 to-purple-400' },
  { name: 'Rose to Pink', value: 'from-rose-400 to-pink-400' },
  { name: 'Amber to Orange', value: 'from-amber-400 to-orange-400' },
  { name: 'Teal to Cyan', value: 'from-teal-400 to-cyan-400' },
  { name: 'Violet to Purple', value: 'from-violet-400 to-purple-400' },
];

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
    icon: occasion?.icon || '🎁',
    imageUrl: occasion?.imageUrl || '',
    gradient: occasion?.gradient || 'from-orange-400 to-yellow-400',
    description: occasion?.description || '',
    sortOrder: occasion?.sortOrder || 0,
    isActive: occasion?.isActive ?? true,
    isCollection: occasion?.isCollection ?? false,
    tags: occasion?.tags || ([] as string[]),
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
      const data = await compressAndUpload(file, { folder: 'occasions' });
      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      setImagePreview(data.url);
      toast.success('Image uploaded successfully');
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

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
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

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-6">
        <h2 className="text-lg font-normal text-ink">Basic Information</h2>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">
            Occasion Name *
          </label>
          <Input
            type="text"
            required
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g., Diwali"
            className="rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">
            Slug (auto-generated)
          </label>
          <Input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="e.g., diwali"
            className="rounded-lg"
          />
          <p className="text-xs text-ink-2 mt-1">URL-friendly identifier</p>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g., Light up your relationships with Diwali gifts"
            rows={3}
            className="rounded-lg"
          />
        </div>
      </div>

      {/* Icon & Styling */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-6">
        <h2 className="text-lg font-normal text-ink">Icon & Styling</h2>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">
            Occasion Image (optional)
          </label>
          <p className="text-xs text-ink-2 mb-3">
            Shown on the occasion tile in the customer UI. When set, it replaces the
            colour gradient below. PNG, JPG, GIF up to 5MB.
          </p>
          <div className="space-y-4">
            {imagePreview ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-bdr bg-gray-50">
                <Image src={imagePreview} alt="Occasion preview" fill className="object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-bdr rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-em mb-2" />
                  <p className="text-sm text-ink font-medium">Click to upload image</p>
                  <p className="text-xs text-ink-2">PNG, JPG, GIF up to 5MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={imageLoading}
                  className="hidden"
                />
              </label>
            )}
            {imageLoading && (
              <p className="text-sm text-ink-2 text-center">Uploading image…</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-3">
            Choose Icon
          </label>
          <div className="grid grid-cols-8 gap-2">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setFormData({ ...formData, icon: emoji })}
                className={`text-3xl p-3 rounded-lg border-2 transition-all ${
                  formData.icon === emoji
                    ? 'border-em bg-em-50'
                    : 'border-bdr hover:border-em-200'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-2 mt-2">Selected: {formData.icon}</p>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-3">
            Choose Color Gradient
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {GRADIENT_OPTIONS.map((grad) => (
              <button
                key={grad.value}
                type="button"
                onClick={() => setFormData({ ...formData, gradient: grad.value })}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  formData.gradient === grad.value
                    ? 'border-slate-900 ring-2 ring-em'
                    : 'border-bdr hover:border-slate-300'
                }`}
              >
                <div
                  className={`h-12 rounded mb-2 bg-gradient-to-r ${grad.value}`}
                />
                {grad.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-6">
        <h2 className="text-lg font-normal text-ink">Settings</h2>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">
            Sort Order
          </label>
          <Input
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
            placeholder="0"
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
            id="isCollection"
            checked={formData.isCollection}
            onChange={(e) => setFormData({ ...formData, isCollection: e.target.checked })}
            className="w-5 h-5 rounded cursor-pointer accent-amber-500"
          />
          <label htmlFor="isCollection" className="text-sm font-normal text-ink cursor-pointer flex-1">
            Curated Collection (shows in homepage "Curated collections", not as an occasion tile)
          </label>
        </div>
      </div>

      {/* Tags — drive tag-based product membership */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-4">
        <h2 className="text-lg font-normal text-ink">Product Tags</h2>
        <p className="text-xs text-ink-2 -mt-2">
          Any product whose tags include one of these is automatically pulled in — no manual linking needed.
          For collections use e.g. <code>budget-friendly</code>, <code>premium-executive</code>, <code>eco-friendly</code>.
        </p>

        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-em-50 border border-em-200 text-sm text-ink"
              >
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-ink-2 hover:text-red-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
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
            className="rounded-lg"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 border-2 border-bdr hover:border-slate-300 text-ink font-normal rounded-lg transition-colors whitespace-nowrap"
          >
            Add Tag
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t border-bdr">
        <button
          type="submit"
          disabled={loading || deleting || !formData.name || !formData.slug}
          className="px-6 py-3 bg-em hover:bg-em-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-normal rounded-lg transition-colors"
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Occasion' : 'Update Occasion'}
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
            {deleting ? 'Deleting...' : 'Delete Occasion'}
          </button>
        )}
      </div>
    </form>
  );
}
