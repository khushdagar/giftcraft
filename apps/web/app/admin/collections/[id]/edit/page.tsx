'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  heroImage?: string;
  sortOrder: number;
  isActive: boolean;
}

export default function EditCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const collectionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<Collection>({
    id: '',
    name: '',
    slug: '',
    description: '',
    heroImage: '',
    sortOrder: 0,
    isActive: true,
  });

  // Redirect if not admin
  if (session?.user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Unauthorized</p>
        <Link href="/admin/collections" className="text-blue-600 hover:underline mt-4 block">
          Back to Collections
        </Link>
      </div>
    );
  }

  // Fetch collection data
  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const res = await fetch(`/api/admin/collections`);
        if (!res.ok) throw new Error('Failed to fetch');

        const collections = await res.json();
        const collection = collections.find((c: any) => c.id === collectionId);

        if (!collection) {
          setError('Collection not found');
          setLoading(false);
          return;
        }

        setFormData({
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          description: collection.description || '',
          heroImage: collection.heroImage || '',
          sortOrder: collection.sortOrder || 0,
          isActive: collection.isActive,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load collection');
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [collectionId]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
          heroImage: formData.heroImage || undefined,
          sortOrder: Number(formData.sortOrder),
          isActive: formData.isActive,
          productIds: [], // Keep existing products
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update collection');
      }

      router.push('/admin/collections');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete collection');
      }

      router.push('/admin/collections');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error && loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/admin/collections">
          <Button variant="outline" className="rounded-lg">
            Back to Collections
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/collections" className="text-blue-600 hover:underline text-sm">
            ← Back to Collections
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Edit Collection</h1>
          <p className="text-sm text-gray-600 mt-1">{formData.slug}</p>
        </div>

        {error && !loading && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection Name *
            </label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={handleNameChange}
              className="rounded-lg"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug (auto-generated)
            </label>
            <Input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">URL-friendly identifier</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="rounded-lg"
            />
          </div>

          {/* Hero Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hero Image URL
            </label>
            <Input
              type="url"
              value={formData.heroImage}
              onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Image URL for collection banner</p>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort Order
            </label>
            <Input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Active (visible to customers)</span>
            </label>
          </div>

          {/* Note about products */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> To manage products in this collection, use the API or update directly.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <Button
              type="submit"
              disabled={saving || deleting || !formData.name || !formData.slug}
              className="rounded-lg"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Link href="/admin/collections">
              <Button type="button" variant="outline" className="rounded-lg">
                Cancel
              </Button>
            </Link>
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleting}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
