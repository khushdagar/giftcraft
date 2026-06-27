'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { toast } from '@/lib/stores/toast-store';

// SIMPLIFIED SCHEMA
const CategorySchema = z.object({
  name: z.string().min(1, 'Category name required'),
  slug: z.string().min(1, 'Slug required'),
  description: z.string().optional(),
});

type CategoryFormData = z.infer<typeof CategorySchema>;

export function CategoryFormSimplified({
  mode,
  initialData,
}: {
  mode: 'create' | 'edit';
  initialData?: any;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<CategoryFormData>({
    resolver: zodResolver(CategorySchema),
    defaultValues: {
      name: initialData?.name || '',
      slug: initialData?.slug || '',
      description: initialData?.description || '',
    },
  });

  // Auto-generate slug from name
  const nameValue = watch('name');
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  const onSubmit = async (data: CategoryFormData) => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...data,
        slug: generateSlug(data.name),
      };

      const url = mode === 'create'
        ? '/api/admin/categories'
        : `/api/admin/categories/${initialData.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save category');
      }

      toast.success(`Category ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      router.push('/admin/categories');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      toast.error(error || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-normal text-ink mb-2">
          {mode === 'create' ? 'New Category' : 'Edit Category'}
        </h1>
        <p className="text-ink-2">Keep it simple and clear</p>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-md p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Category Name */}
      <div>
        <label className="block text-sm font-normal text-ink mb-2">
          Name <span className="text-red-600">*</span>
        </label>
        <Input
          {...register('name')}
          placeholder="e.g., Corporate Gifts"
          className="text-base"
        />
        {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Auto Slug */}
      <div>
        <label className="block text-sm font-normal text-ink mb-2">
          URL Slug (auto-generated)
        </label>
        <Input
          value={generateSlug(nameValue)}
          disabled
          className="text-base bg-gray-50 text-ink-3"
          placeholder="corporate-gifts"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-normal text-ink mb-2">
          Description (optional)
        </label>
        <textarea
          {...register('description')}
          placeholder="What's this category about?"
          rows={3}
          className="w-full px-4 py-2 rounded-md border-2 border-bdr focus:border-navy-800 focus:outline-none resize-none"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-6">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-normal py-3"
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Category' : 'Update Category'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="rounded-2xl"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
