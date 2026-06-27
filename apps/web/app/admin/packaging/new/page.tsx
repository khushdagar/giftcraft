'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload } from 'lucide-react';

export default function NewPackagingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price: 0,
    description: '',
    imageUrl: '',
    sortOrder: 1,
    isActive: true,
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value) : type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/packaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/admin/packaging');
      } else {
        alert('Error creating packaging');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating packaging');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/packaging" className="text-blue-600 hover:underline">← Back to Packaging</Link>
        <h1 className="text-3xl font-normal mt-4">Add Packaging Option</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-md border p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Premium Rigid Box"
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
            placeholder="e.g., premium-rigid-box"
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
            placeholder="0"
            className="w-full px-3 py-2 border rounded-md"
          />
          <p className="text-xs text-gray-600 mt-1">Set to 0 for free packaging</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="e.g., Magnetic closure, ribbon pull"
            rows={3}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Image URL</label>
          <input
            type="url"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            placeholder="https://..."
            className="w-full px-3 py-2 border rounded-md"
          />
          <p className="text-xs text-gray-600 mt-1">Upload image to Digital Ocean Spaces and paste URL here</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="font-normal text-sm mb-4">Box Dimensions (cm)</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Length (L)</label>
              <input
                type="number"
                name="lengthCm"
                value={formData.lengthCm}
                onChange={handleChange}
                placeholder="0"
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
                value={formData.widthCm}
                onChange={handleChange}
                placeholder="0"
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
                value={formData.heightCm}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">Used to auto-suggest packaging based on products added</p>
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
          <p className="text-xs text-gray-600 mt-1">Lower numbers appear first in the slider</p>
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
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Packaging'}
          </button>
          <Link href="/admin/packaging" className="px-6 py-2 border rounded-md hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
