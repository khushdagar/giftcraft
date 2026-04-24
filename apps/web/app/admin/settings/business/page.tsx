'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Building2 } from 'lucide-react';

interface BusinessSettings {
  companyName: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
}

export default function BusinessSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState<BusinessSettings>({
    companyName: process.env.NEXT_PUBLIC_APP_NAME || 'GiftCraft',
    gstin: process.env.NEXT_PUBLIC_SELLER_GSTIN || '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
  });

  const handleChange = (field: keyof BusinessSettings, value: string) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'business',
          data: settings,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/admin/settings" className="text-sm text-em hover:underline mb-4 block">
          ← Back to Settings
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-5 w-5 text-em-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Business</p>
        </div>
        <h1 className="text-3xl font-bold text-ink">Company Information</h1>
        <p className="text-sm text-ink-2 mt-2">Configure your business details and tax information</p>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        {success && (
          <div className="mb-6 p-4 rounded-md bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-green-700">✓ Settings saved successfully</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-bdr rounded-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Company Name</label>
              <Input
                type="text"
                value={settings.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="rounded-md"
                required
              />
            </div>

            {/* GSTIN */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">GSTIN</label>
              <Input
                type="text"
                value={settings.gstin}
                onChange={(e) => handleChange('gstin', e.target.value)}
                placeholder="07XXXXXXXXX1Z5"
                className="rounded-md"
              />
              <p className="text-xs text-ink-3 mt-1">15-character GST Identification Number</p>
            </div>

            {/* PAN */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">PAN</label>
              <Input
                type="text"
                value={settings.pan}
                onChange={(e) => handleChange('pan', e.target.value)}
                placeholder="AAAPP1234A"
                className="rounded-md"
              />
              <p className="text-xs text-ink-3 mt-1">Permanent Account Number</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Email</label>
              <Input
                type="email"
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="rounded-md"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Phone</label>
              <Input
                type="tel"
                value={settings.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="rounded-md"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">City</label>
              <Input
                type="text"
                value={settings.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="rounded-md"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">State</label>
              <Input
                type="text"
                value={settings.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="rounded-md"
              />
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Pincode</label>
              <Input
                type="text"
                value={settings.pincode}
                onChange={(e) => handleChange('pincode', e.target.value.slice(0, 6))}
                maxLength={6}
                className="rounded-md"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Address</label>
            <Textarea
              value={settings.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={3}
              className="rounded-md"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-bdr">
            <Button type="submit" disabled={loading} className="rounded-md">
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            <Link href="/admin/settings">
              <Button type="button" variant="outline" className="rounded-md">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
