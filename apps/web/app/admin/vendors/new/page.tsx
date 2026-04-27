'use client';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function NewVendorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    contactName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    address: '',
    gst: '',
    paymentTerms: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-generate slug from name
    if (name === 'name') {
      setFormData((prev) => ({
        ...prev,
        slug: value
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, ''),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to create vendor');
        return;
      }

      const { data } = await response.json();
      toast.success('Vendor created successfully');
      router.push(`/admin/vendors/${data.id}`);
    } catch (error) {
      toast.error('Error creating vendor');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-black tracking-tight text-ink">Create New Vendor</h1>
        <p className="mt-2 text-sm text-ink-2">Add a new supplier to the GiftCraft network</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Vendor Name *</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., PrintPro Solutions"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Slug *</label>
            <Input
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="auto-generated"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Contact Name *</label>
            <Input
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              placeholder="e.g., John Smith"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Email *</label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="contact@vendor.com"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Phone *</label>
            <Input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 XXXXXXXXXX"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">GST Number</label>
            <Input
              name="gst"
              value={formData.gst}
              onChange={handleChange}
              placeholder="27XXXXXXXXX1Z5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">City *</label>
            <Input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g., Delhi"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">State *</label>
            <Input
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="DL"
              maxLength={2}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Address</label>
          <Textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Street address, building name, etc."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Payment Terms</label>
          <Input
            name="paymentTerms"
            value={formData.paymentTerms}
            onChange={handleChange}
            placeholder="e.g., 50% advance, 50% on delivery"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Notes</label>
          <Textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any additional information about this vendor"
            rows={4}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-em px-8 py-2 font-bold hover:bg-em-600"
          >
            {loading ? 'Creating...' : 'Create Vendor'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="rounded-2xl"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
