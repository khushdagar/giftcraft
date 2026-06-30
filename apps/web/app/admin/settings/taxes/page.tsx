'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { DollarSign, Trash2 } from 'lucide-react';

interface HsnCode {
  id: string;
  code: string;
  description: string;
  defaultGstRate: string;
}

export default function TaxesSettingsPage() {
  const router = useRouter();
  const [codes, setCodes] = useState<HsnCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    defaultGstRate: '',
  });

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const res = await fetch('/api/admin/taxes');
      if (!res.ok) throw new Error('Failed to fetch HSN codes');
      const data = await res.json();
      setCodes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading HSN codes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (!formData.code || !formData.description || !formData.defaultGstRate) {
        throw new Error('Please fill all required fields');
      }

      const body = {
        code: formData.code,
        description: formData.description,
        defaultGstRate: parseFloat(formData.defaultGstRate),
      };

      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/admin/taxes/${editingId}` : '/api/admin/taxes';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save HSN code');
      }

      setSuccess(true);
      setFormData({
        code: '',
        description: '',
        defaultGstRate: '',
      });
      setEditingId(null);
      await fetchCodes();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (hsn: HsnCode) => {
    setEditingId(hsn.id);
    setFormData({
      code: hsn.code,
      description: hsn.description,
      defaultGstRate: hsn.defaultGstRate.toString(),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this HSN code?')) return;

    try {
      const res = await fetch(`/api/admin/taxes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setSuccess(true);
      await fetchCodes();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting HSN code');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      code: '',
      description: '',
      defaultGstRate: '',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/admin/settings" className="text-sm text-em hover:underline mb-4 block">
          ← Back to Settings
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-5 w-5 text-em-400" />
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Configuration</p>
        </div>
        <h1 className="text-3xl font-normal text-ink">Tax Codes</h1>
        <p className="text-sm text-ink-2 mt-2">Manage HSN codes and GST rates for products</p>
      </div>

      {/* Content */}
      <div className="max-w-6xl space-y-6">
        {success && (
          <div className="p-4 rounded-md bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-green-700">✓ HSN code saved successfully</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white border border-bdr rounded-md p-6">
          <h2 className="text-lg font-normal text-ink mb-4">{editingId ? 'Edit HSN Code' : 'Add New HSN Code'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">HSN Code *</label>
                <Input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="e.g., 6204"
                  className="rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">GST Rate (%) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.defaultGstRate}
                  onChange={(e) => handleChange('defaultGstRate', e.target.value)}
                  placeholder="18.00"
                  className="rounded-md"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-2">Description *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="e.g., Garments, shirts, trousers, coats..."
                rows={2}
                className="rounded-md"
                required
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-bdr">
              <Button type="submit" disabled={saving} className="rounded-md">
                {saving ? 'Saving...' : editingId ? 'Update Code' : 'Add Code'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel} className="rounded-md">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Codes List */}
        {loading ? (
          <p className="text-ink-2">Loading HSN codes...</p>
        ) : codes.length === 0 ? (
          <p className="text-ink-2">No HSN codes configured yet.</p>
        ) : (
          <div className="bg-white border border-bdr rounded-md overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-elevated border-b border-bdr">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink uppercase">HSN Code</th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink uppercase">GST Rate</th>
                  <th className="px-6 py-3 text-right text-xs font-normal text-ink uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bdr">
                {codes.map((hsn) => (
                  <tr key={hsn.id} className="hover:bg-elevated transition">
                    <td className="px-6 py-4 text-sm font-medium text-ink">{hsn.code}</td>
                    <td className="px-6 py-4 text-sm text-ink-2">{hsn.description}</td>
                    <td className="px-6 py-4 text-sm font-medium text-ink">{hsn.defaultGstRate}%</td>
                    <td className="px-6 py-4 text-sm text-right space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(hsn)}
                        className="rounded-md"
                      >
                        Edit
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDelete(hsn.id)}
                        className="inline-flex items-center justify-center px-3 py-1 rounded-md text-sm text-red-700 hover:bg-red-50 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
