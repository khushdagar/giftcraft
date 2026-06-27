'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { X, Upload } from 'lucide-react';

interface CategoryFormProps {
  mode?: 'create' | 'edit';
  parentCategories: Array<{ id: string; name: string }>;
  category?: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    sortOrder: number;
    imageUrl: string | null;
  };
}

export function CategoryForm({
  mode = 'create',
  parentCategories,
  category
}: CategoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    parentId: category?.parentId || '',
    sortOrder: category?.sortOrder || 0,
    imageUrl: category?.imageUrl || '',
  });
  const [imagePreview, setImagePreview] = useState<string>(category?.imageUrl || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'sortOrder' ? parseInt(value) : value,
    }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setImageLoading(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);
      formDataObj.append('folder', 'categories');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataObj,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        imageUrl: data.url,
      }));
      setImagePreview(data.url);
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setImageLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      imageUrl: '',
    }));
    setImagePreview('');
    toast.success('Image removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('Slug is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        parentId: formData.parentId || null,
        sortOrder: formData.sortOrder,
        imageUrl: formData.imageUrl || null,
      };

      const url = mode === 'create'
        ? '/api/admin/categories'
        : `/api/admin/categories/${category?.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';
      const successMessage = mode === 'create'
        ? 'Category created successfully'
        : 'Category updated successfully';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${mode} category`);
      }

      toast.success(successMessage);
      router.push('/admin/categories');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} category`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-md border-2 border-bdr bg-white p-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-ink mb-2">
          Category Name *
        </label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleNameChange}
          placeholder="e.g., Corporate Gifts"
          required
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-ink mb-2">
          Slug (auto-generated)
        </label>
        <Input
          id="slug"
          name="slug"
          value={formData.slug}
          onChange={handleChange}
          placeholder="e.g., corporate-gifts"
        />
      </div>

      <div>
        <label htmlFor="parentId" className="block text-sm font-medium text-ink mb-2">
          Parent Category (optional)
        </label>
        <select
          id="parentId"
          name="parentId"
          value={formData.parentId}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-md border border-bdr focus:outline-none focus:ring-2 focus:ring-em"
        >
          <option value="">None (Top-level category)</option>
          {parentCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sortOrder" className="block text-sm font-medium text-ink mb-2">
          Sort Order
        </label>
        <Input
          id="sortOrder"
          name="sortOrder"
          type="number"
          value={formData.sortOrder}
          onChange={handleChange}
          min="0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-2">
          Category Image (optional)
        </label>
        <div className="space-y-4">
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative w-full h-64 rounded-md overflow-hidden border-2 border-bdr bg-gray-50">
              <Image
                src={imagePreview}
                alt="Category preview"
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload Input */}
          {!imagePreview && (
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-bdr rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-em mb-2" />
                <p className="text-sm text-ink font-medium">Click to upload image</p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
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
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">Uploading image...</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-6">
        <Button type="submit" variant="em" disabled={loading}>
          {loading
            ? mode === 'create' ? 'Creating...' : 'Updating...'
            : mode === 'create' ? 'Create Category' : 'Update Category'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
