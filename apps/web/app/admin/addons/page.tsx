'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

interface Addon {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
  description?: string;
  imageUrl?: string;
}

export default function AddonsPage() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAddons();
  }, []);

  const fetchAddons = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/addons');
      if (res.ok) {
        const data = await res.json();
        setAddons(data.addons || []);
      }
    } catch (error) {
      console.error('Error fetching addons:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/addons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        fetchAddons();
      }
    } catch (error) {
      console.error('Error updating addon:', error);
    }
  };

  const deleteAddon = async (id: string) => {
    if (!confirm('Delete this add-on?')) return;
    try {
      const res = await fetch(`/api/admin/addons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAddons();
      }
    } catch (error) {
      console.error('Error deleting addon:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-normal">Add-ons</h1>
          <p className="text-gray-600 mt-1">Manage thank-you cards, ribbons, and other add-ons</p>
        </div>
        <Link href="/admin/addons/new" className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
          <Plus className="h-5 w-5" />
          Add New
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : addons.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          <p className="text-gray-600">No add-ons yet</p>
          <Link href="/admin/addons/new" className="text-green-600 hover:underline mt-2 inline-block">
            Create the first one →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-md border overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-normal">Name</th>
                <th className="px-6 py-3 text-left text-sm font-normal">Price</th>
                <th className="px-6 py-3 text-left text-sm font-normal">Order</th>
                <th className="px-6 py-3 text-left text-sm font-normal">Status</th>
                <th className="px-6 py-3 text-right text-sm font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {addons.map((addon) => (
                <tr key={addon.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{addon.name}</p>
                      {addon.description && <p className="text-sm text-gray-600">{addon.description}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-normal">₹{addon.price}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{addon.sortOrder}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-normal ${addon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {addon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => toggleActive(addon.id, addon.isActive)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-sm"
                      title={addon.isActive ? 'Hide' : 'Show'}
                    >
                      {addon.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <Link href={`/admin/addons/${addon.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-sm">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                    <button onClick={() => deleteAddon(addon.id)} className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1 rounded text-sm">
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
