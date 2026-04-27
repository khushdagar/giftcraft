'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface CategoryFormProps {
  parentCategories: Array<{ id: string; name: string }>;
}

export function CategoryForm({ parentCategories }: CategoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parentId: '',
    sortOrder: 0,
  });

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
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create category');
      }

      toast.success('Category created successfully');
      router.push('/admin/categories');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create category');
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

      <div className="flex gap-3 pt-6">
        <Button type="submit" variant="em" disabled={loading}>
          {loading ? 'Creating...' : 'Create Category'}
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
