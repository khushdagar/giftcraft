'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Truck, Trash2 } from 'lucide-react';

interface ShippingZone {
  id: string;
  name: string;
  states: string[];
  ratePerKg: string;
  minCharge: string;
  freeShippingThreshold: string | null;
  individualSurchargePct: string;
  flatRate: string;
  etaMinDays: number;
  etaMaxDays: number;
  isActive: boolean;
}

export default function ShippingSettingsPage() {
  const router = useRouter();
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    states: '',
    ratePerKg: '',
    minCharge: '',
    freeShippingThreshold: '',
    individualSurchargePct: '',
    etaMinDays: '',
    etaMaxDays: '',
    isActive: true,
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/admin/shipping');
      if (!res.ok) throw new Error('Failed to fetch zones');
      const data = await res.json();
      setZones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading zones');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const statesArray = formData.states.split(',').map(s => s.trim()).filter(s => s);

      if (!formData.name || !formData.ratePerKg || !formData.minCharge || !formData.etaMinDays || !formData.etaMaxDays || statesArray.length === 0) {
        throw new Error('Please fill all required fields');
      }

      const minCharge = parseFloat(formData.minCharge);
      const body = {
        name: formData.name,
        states: statesArray,
        ratePerKg: parseFloat(formData.ratePerKg),
        minCharge,
        freeShippingThreshold: formData.freeShippingThreshold
          ? parseFloat(formData.freeShippingThreshold)
          : null,
        individualSurchargePct: formData.individualSurchargePct
          ? parseFloat(formData.individualSurchargePct)
          : 0,
        // Keep legacy flat rate in sync with the minimum charge.
        flatRate: minCharge,
        etaMinDays: parseInt(formData.etaMinDays),
        etaMaxDays: parseInt(formData.etaMaxDays),
        isActive: formData.isActive,
      };

      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/admin/shipping/${editingId}` : '/api/admin/shipping';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save zone');
      }

      setSuccess(true);
      setFormData({
        name: '',
        states: '',
        ratePerKg: '',
        minCharge: '',
        freeShippingThreshold: '',
        individualSurchargePct: '',
        etaMinDays: '',
        etaMaxDays: '',
        isActive: true,
      });
      setEditingId(null);
      await fetchZones();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (zone: ShippingZone) => {
    setEditingId(zone.id);
    setFormData({
      name: zone.name,
      states: zone.states.join(', '),
      ratePerKg: zone.ratePerKg?.toString() ?? '',
      minCharge: zone.minCharge?.toString() ?? zone.flatRate?.toString() ?? '',
      freeShippingThreshold: zone.freeShippingThreshold?.toString() ?? '',
      individualSurchargePct: zone.individualSurchargePct?.toString() ?? '',
      etaMinDays: zone.etaMinDays.toString(),
      etaMaxDays: zone.etaMaxDays.toString(),
      isActive: zone.isActive,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this shipping zone?')) return;

    try {
      const res = await fetch(`/api/admin/shipping/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setSuccess(true);
      await fetchZones();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting zone');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '',
      states: '',
      ratePerKg: '',
      minCharge: '',
      freeShippingThreshold: '',
      individualSurchargePct: '',
      etaMinDays: '',
      etaMaxDays: '',
      isActive: true,
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
          <Truck className="h-5 w-5 text-em-400" />
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Configuration</p>
        </div>
        <h1 className="text-3xl font-normal text-ink">Shipping Zones</h1>
        <p className="text-sm text-ink-2 mt-2">Define delivery zones, rates, and estimated delivery times</p>
      </div>

      {/* Content */}
      <div className="max-w-6xl space-y-6">
        {success && (
          <div className="p-4 rounded-md bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-green-700">✓ Zone saved successfully</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white border border-bdr rounded-md p-6">
          <h2 className="text-lg font-normal text-ink mb-4">{editingId ? 'Edit Zone' : 'Add New Zone'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Zone Name *</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., North India"
                  className="rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">States (comma-separated) *</label>
                <Input
                  type="text"
                  value={formData.states}
                  onChange={(e) => handleChange('states', e.target.value)}
                  placeholder="e.g., DL, HR, UP, PB"
                  className="rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Rate per kg (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.ratePerKg}
                  onChange={(e) => handleChange('ratePerKg', e.target.value)}
                  placeholder="40.00"
                  className="rounded-md"
                  required
                />
                <p className="text-xs text-ink-3 mt-1">Charged per kg of parcel weight.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Minimum charge (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.minCharge}
                  onChange={(e) => handleChange('minCharge', e.target.value)}
                  placeholder="50.00"
                  className="rounded-md"
                  required
                />
                <p className="text-xs text-ink-3 mt-1">Floor for any single shipment.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Free shipping above (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.freeShippingThreshold}
                  onChange={(e) => handleChange('freeShippingThreshold', e.target.value)}
                  placeholder="50000 (leave blank to disable)"
                  className="rounded-md"
                />
                <p className="text-xs text-ink-3 mt-1">Order subtotal at/above which shipping is free.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Individual delivery surcharge (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.individualSurchargePct}
                  onChange={(e) => handleChange('individualSurchargePct', e.target.value)}
                  placeholder="15"
                  className="rounded-md"
                />
                <p className="text-xs text-ink-3 mt-1">Extra % when each pack ships separately.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">ETA Min Days *</label>
                <Input
                  type="number"
                  value={formData.etaMinDays}
                  onChange={(e) => handleChange('etaMinDays', e.target.value)}
                  placeholder="2"
                  className="rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">ETA Max Days *</label>
                <Input
                  type="number"
                  value={formData.etaMaxDays}
                  onChange={(e) => handleChange('etaMaxDays', e.target.value)}
                  placeholder="5"
                  className="rounded-md"
                  required
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    className="rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-ink">Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-bdr">
              <Button type="submit" disabled={saving} className="rounded-md">
                {saving ? 'Saving...' : editingId ? 'Update Zone' : 'Add Zone'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel} className="rounded-md">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Zones List */}
        {loading ? (
          <p className="text-ink-2">Loading zones...</p>
        ) : zones.length === 0 ? (
          <p className="text-ink-2">No shipping zones configured yet.</p>
        ) : (
          <div className="bg-white border border-bdr rounded-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-elevated border-b border-bdr">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink uppercase">Zone Name</th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink uppercase">States</th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink uppercase">Rate / kg</th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink uppercase">Min · Free above</th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink uppercase">ETA</th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-normal text-ink uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bdr">
                {zones.map((zone) => (
                  <tr key={zone.id} className="hover:bg-elevated transition">
                    <td className="px-6 py-4 text-sm font-medium text-ink">{zone.name}</td>
                    <td className="px-6 py-4 text-sm text-ink-2">{zone.states.join(', ')}</td>
                    <td className="px-6 py-4 text-sm font-medium text-ink">₹{zone.ratePerKg ?? 0}/kg</td>
                    <td className="px-6 py-4 text-sm text-ink-2">
                      ₹{zone.minCharge ?? zone.flatRate} min
                      {zone.freeShippingThreshold ? ` · free ≥ ₹${zone.freeShippingThreshold}` : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-2">{zone.etaMinDays}-{zone.etaMaxDays} days</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-normal ${
                        zone.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {zone.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(zone)}
                        className="rounded-md"
                      >
                        Edit
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDelete(zone.id)}
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
