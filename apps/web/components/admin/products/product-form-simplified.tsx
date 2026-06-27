'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { toast } from '@/lib/stores/toast-store';

// SIMPLIFIED SCHEMA - ONLY MANDATORY FIELDS
const ProductSchema = z.object({
  name: z.string().min(1, 'Product name required'),
  sku: z.string().min(1, 'SKU required'),
  sellPrice: z.number().min(1, 'Selling price required'),
  categoryIds: z.union([z.string(), z.array(z.string())]).transform((val) =>
    Array.isArray(val) ? val : val ? [val] : []
  ).refine((val) => val.length > 0, 'Select at least one category'),
  image: z.instanceof(File).optional(),
});

type ProductFormData = z.infer<typeof ProductSchema>;

export function ProductFormSimplified({
  mode,
  initialData,
}: {
  mode: 'create' | 'edit';
  initialData?: any;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState(initialData?.images?.[0]?.url || '');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ProductFormData>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      name: initialData?.name || '',
      sku: initialData?.sku || '',
      sellPrice: initialData?.priceTiers?.[0]?.sellPrice || 0,
      categoryIds: initialData?.categories?.map((c: any) => c.categoryId) || [],
    },
  });

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/admin/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();

      // Ensure categoryIds is an array
      const categoryIds = Array.isArray(data.categoryIds) ? data.categoryIds : [data.categoryIds].filter(Boolean);

      formData.append('data', JSON.stringify({
        name: data.name,
        slug: data.name.toLowerCase().replace(/\s+/g, '-'),
        sku: data.sku,
        categoryIds: categoryIds,
        priceTiers: [
          { tier: 1, minQty: 25, maxQty: 49, costPrice: data.sellPrice * 0.4, sellPrice: data.sellPrice },
          { tier: 2, minQty: 50, maxQty: 99, costPrice: data.sellPrice * 0.4, sellPrice: data.sellPrice * 0.9 },
          { tier: 3, minQty: 100, maxQty: null, costPrice: data.sellPrice * 0.4, sellPrice: data.sellPrice * 0.8 },
        ],
        status: 'active',
        hsnId: '6912',
      }));

      if (data.image) {
        formData.append('images', data.image);
      }

      const url = mode === 'create'
        ? '/api/admin/products'
        : `/api/admin/products/${initialData.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';
      const response = await fetch(url, { method, body: formData });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      toast.success(`Product ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      router.push('/admin/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      toast.error(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-normal text-ink mb-2">
          {mode === 'create' ? 'Add New Product' : 'Edit Product'}
        </h1>
        <p className="text-ink-2">Fill in the essential details to get started</p>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-md p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Product Name */}
      <div>
        <label className="block text-sm font-normal text-ink mb-2">
          Product Name <span className="text-red-600">*</span>
        </label>
        <Input
          {...register('name')}
          placeholder="e.g., Premium Corporate Mug"
          className="text-base"
        />
        {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* SKU & Price in Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-normal text-ink mb-2">
            SKU <span className="text-red-600">*</span>
          </label>
          <Input
            {...register('sku')}
            placeholder="e.g., MUG-001"
            className="text-base"
          />
          {errors.sku && <p className="text-red-600 text-xs mt-1">{errors.sku.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">
            Price (₹) <span className="text-red-600">*</span>
          </label>
          <Input
            {...register('sellPrice', { valueAsNumber: true })}
            type="number"
            placeholder="299"
            className="text-base"
          />
          {errors.sellPrice && <p className="text-red-600 text-xs mt-1">{errors.sellPrice.message}</p>}
        </div>
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-normal text-ink mb-2">
          Category <span className="text-red-600">*</span>
        </label>
        <select
          {...register('categoryIds')}
          className="w-full px-4 py-3 rounded-md border-2 border-gray-200 focus:border-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-100 bg-white text-base"
        >
          <option value="">Select a category...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryIds && <p className="text-red-600 text-xs mt-1">{errors.categoryIds.message}</p>}
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-normal text-ink mb-2">
          Product Image
        </label>
        {imagePreview && (
          <div className="mb-4 rounded-md overflow-hidden border-2 border-bdr">
            <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
          </div>
        )}
        <label className="block w-full px-4 py-3 rounded-md border-2 border-dashed border-gray-300 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition text-center">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setValue('image', file);
                const reader = new FileReader();
                reader.onload = (event) => setImagePreview(event.target?.result as string);
                reader.readAsDataURL(file);
              }
            }}
            className="hidden"
          />
          <span className="text-sm font-normal text-ink">
            {imagePreview ? '📸 Change Image' : '📸 Choose Image'}
          </span>
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 pt-6">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-normal py-3"
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Update Product'}
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
