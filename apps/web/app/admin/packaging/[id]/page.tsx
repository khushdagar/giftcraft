'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Packaging {
  id: string;
  name: string;
  slug: string;
  price: number;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export default function EditPackagingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Packaging | null>(null);

  useEffect(() => {
    fetchPackaging();
  }, [id]);

  const fetchPackaging = async () => {
    try {
      const res = await fetch(`/api/admin/packaging/${id}`);
      if (res.ok) {
        const data = await res.json();
        setFormData(data);
      }
    } catch (error) {
      console.error('Error fetching packaging:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!formData) return;
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value) : type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/packaging/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/admin/packaging');
      } else {
        alert('Error updating packaging');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating packaging');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!formData) {
    return <div className="text-center py-8">Packaging not found</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/packaging" className="text-blue-600 hover:underline">← Back to Packaging</Link>
        <h1 className="text-3xl font-normal mt-4">Edit: {formData.name}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-md border p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Slug *</label>
          <input
            type="text"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Price (₹)</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Image URL</label>
          <input
            type="url"
            name="imageUrl"
            value={formData.imageUrl || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="font-normal text-sm mb-4">Box Dimensions (cm)</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Length (L)</label>
              <input
                type="number"
                name="lengthCm"
                value={formData.lengthCm || 0}
                onChange={handleChange}
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Width (W)</label>
              <input
                type="number"
                name="widthCm"
                value={formData.widthCm || 0}
                onChange={handleChange}
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Height (H)</label>
              <input
                type="number"
                name="heightCm"
                value={formData.heightCm || 0}
                onChange={handleChange}
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Display Order</label>
          <input
            type="number"
            name="sortOrder"
            value={formData.sortOrder}
            onChange={handleChange}
            min="1"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            id="isActive"
            className="rounded"
          />
          <label htmlFor="isActive" className="text-sm font-medium">
            Active (Show in builder)
          </label>
        </div>

        <div className="flex gap-3 pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href="/admin/packaging" className="px-6 py-2 border rounded-md hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
