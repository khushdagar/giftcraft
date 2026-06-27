'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface OccasionFormProps {
  mode?: 'create' | 'edit';
  occasion?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    gradient: string | null;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
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
  const [formData, setFormData] = useState({
    name: occasion?.name || '',
    slug: occasion?.slug || '',
    icon: occasion?.icon || '🎁',
    gradient: occasion?.gradient || 'from-orange-400 to-yellow-400',
    description: occasion?.description || '',
    sortOrder: occasion?.sortOrder || 0,
    isActive: occasion?.isActive ?? true,
  });

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
