'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

interface Packaging {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
  description?: string;
  imageUrl?: string;
}

export default function PackagingPage() {
  const [packaging, setPackaging] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackaging();
  }, []);

  const fetchPackaging = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/packaging');
      if (res.ok) {
        const data = await res.json();
        setPackaging(data.packaging || []);
      }
    } catch (error) {
      console.error('Error fetching packaging:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/packaging/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        fetchPackaging();
      }
    } catch (error) {
      console.error('Error updating packaging:', error);
    }
  };

  const deletePackaging = async (id: string) => {
    if (!confirm('Delete this packaging option?')) return;
    try {
      const res = await fetch(`/api/admin/packaging/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPackaging();
      }
    } catch (error) {
      console.error('Error deleting packaging:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Packaging Options</h1>
          <p className="text-gray-600 mt-1">Manage boxes, sleeves, and packaging choices</p>
        </div>
        <Link href="/admin/packaging/new" className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
          <Plus className="h-5 w-5" />
          Add Packaging
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : packaging.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          <p className="text-gray-600">No packaging options yet</p>
          <Link href="/admin/packaging/new" className="text-green-600 hover:underline mt-2 inline-block">
            Create the first one →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-md border">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Order</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {packaging.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{pkg.name}</p>
                      {pkg.description && <p className="text-sm text-gray-600">{pkg.description}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {pkg.price === 0 ? <span className="text-green-600 font-semibold">Free</span> : <span className="font-semibold">₹{pkg.price}</span>}
                  </td>
                  <td className="px-6 py-4 text-sm">{pkg.sortOrder}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${pkg.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {pkg.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => toggleActive(pkg.id, pkg.isActive)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-sm"
                      title={pkg.isActive ? 'Hide' : 'Show'}
                    >
                      {pkg.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <Link href={`/admin/packaging/${pkg.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-sm">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                    <button onClick={() => deletePackaging(pkg.id)} className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1 rounded text-sm">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
