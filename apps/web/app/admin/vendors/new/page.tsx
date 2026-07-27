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
    code: '',
    name: '',
    slug: '',
    type: '',
    productsServices: '',
    contactName: '',
    email: '',
    phone: '',
    whatsapp: '',
    city: '',
    state: '',
    address: '',
    gst: '',
    paymentTerms: '',
    avgLeadDays: '',
    minOrderQty: '',
    qualityRating: '',
    reliabilityRating: '',
    creditDays: '',
    lastUsedAt: '',
    onboardingStatus: 'pending',
    onboardedAt: '',
    notes: '',
  });
  const [checklist, setChecklist] = useState({
    gstKycReceived: false,
    bankDetailsReceived: false,
    agreementSigned: false,
    samplesReceived: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      const toNum = (v: string) => (v.trim() === '' ? null : Number(v));
      const payload = {
        ...formData,
        avgLeadDays: toNum(formData.avgLeadDays),
        minOrderQty: toNum(formData.minOrderQty),
        creditDays: toNum(formData.creditDays),
        qualityRating: toNum(formData.qualityRating),
        reliabilityRating: toNum(formData.reliabilityRating),
        lastUsedAt: formData.lastUsedAt || null,
        onboardedAt: formData.onboardedAt || null,
        ...checklist,
      };
      const response = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        <h1 className="text-3xl font-normal tracking-tight text-ink">Create New Vendor</h1>
        <p className="mt-2 text-sm text-ink-2">Add a new supplier to the GIVOO network</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-normal text-ink mb-2">Vendor Name *</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., PrintPro Solutions"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-normal text-ink mb-2">Slug *</label>
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
            <label className="block text-sm font-normal text-ink mb-2">Vendor Code</label>
            <Input
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g., V001"
            />
          </div>
          <div>
            <label className="block text-sm font-normal text-ink mb-2">Type</label>
            <Input
              name="type"
              value={formData.type}
              onChange={handleChange}
              placeholder="e.g., Packaging - Boxes, Brand - Drinkware"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Products / Services</label>
          <Textarea
            name="productsServices"
            value={formData.productsServices}
            onChange={handleChange}
            placeholder="What does this vendor supply? e.g., Steel bottles, flasks, mugs"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-normal text-ink mb-2">Contact Name *</label>
            <Input
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              placeholder="e.g., John Smith"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-normal text-ink mb-2">Email *</label>
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
            <label className="block text-sm font-normal text-ink mb-2">Phone *</label>
            <Input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 XXXXXXXXXX"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-normal text-ink mb-2">WhatsApp</label>
            <Input
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="+91 XXXXXXXXXX"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">GST Number</label>
          <Input
            name="gst"
            value={formData.gst}
            onChange={handleChange}
            placeholder="27XXXXXXXXX1Z5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-normal text-ink mb-2">City *</label>
            <Input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g., Delhi"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-normal text-ink mb-2">State *</label>
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
          <label className="block text-sm font-normal text-ink mb-2">Address</label>
          <Textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Street address, building name, etc."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Payment Terms</label>
          <Input
            name="paymentTerms"
            value={formData.paymentTerms}
            onChange={handleChange}
            placeholder="e.g., 50% advance, 50% on delivery"
          />
        </div>

        {/* Sourcing */}
        <div className="border-t border-bdr pt-6">
          <h2 className="text-sm font-medium text-ink mb-4">Sourcing</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-normal text-ink mb-2">Avg Lead Time (days)</label>
              <Input type="number" name="avgLeadDays" value={formData.avgLeadDays} onChange={handleChange} placeholder="e.g., 10" />
            </div>
            <div>
              <label className="block text-sm font-normal text-ink mb-2">Min Order Qty</label>
              <Input type="number" name="minOrderQty" value={formData.minOrderQty} onChange={handleChange} placeholder="e.g., 50" />
            </div>
            <div>
              <label className="block text-sm font-normal text-ink mb-2">Credit Days</label>
              <Input type="number" name="creditDays" value={formData.creditDays} onChange={handleChange} placeholder="e.g., 0" />
            </div>
            <div>
              <label className="block text-sm font-normal text-ink mb-2">Quality (1-5)</label>
              <Input type="number" min={1} max={5} name="qualityRating" value={formData.qualityRating} onChange={handleChange} placeholder="1-5" />
            </div>
            <div>
              <label className="block text-sm font-normal text-ink mb-2">Reliability (1-5)</label>
              <Input type="number" min={1} max={5} name="reliabilityRating" value={formData.reliabilityRating} onChange={handleChange} placeholder="1-5" />
            </div>
            <div>
              <label className="block text-sm font-normal text-ink mb-2">Last Used</label>
              <Input type="date" name="lastUsedAt" value={formData.lastUsedAt} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Onboarding checklist */}
        <div className="border-t border-bdr pt-6">
          <h2 className="text-sm font-medium text-ink mb-4">Onboarding</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-normal text-ink mb-2">Onboarding Status</label>
              <select
                name="onboardingStatus"
                value={formData.onboardingStatus}
                onChange={handleChange}
                className="w-full border border-bdr rounded-md p-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="to_approach">To Approach</option>
                <option value="onboarding">Onboarding</option>
                <option value="onboarded">Onboarded</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-normal text-ink mb-2">Date Onboarded</label>
              <Input type="date" name="onboardedAt" value={formData.onboardedAt} onChange={handleChange} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([
              ['gstKycReceived', 'GST / KYC Received'],
              ['bankDetailsReceived', 'Bank Details Received'],
              ['agreementSigned', 'Agreement / Terms Agreed'],
              ['samplesReceived', 'Samples / Catalog Received'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist[key]}
                  onChange={(e) => setChecklist((p) => ({ ...p, [key]: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-normal text-ink">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Notes</label>
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
            className="rounded-2xl bg-em px-8 py-2 font-normal hover:bg-em-600"
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
