'use client';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FieldError } from '@/components/ui/field-error';
import {
  collectErrors,
  validateEmail,
  validateGstin,
  validateName,
  validatePhone,
} from '@/lib/validation';

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
    const { name } = e.target;
    // GST is stored uppercase; phone fields drop characters the format rejects.
    const value =
      name === 'gst'
        ? e.target.value.toUpperCase()
        : name === 'phone' || name === 'whatsapp'
          ? e.target.value.replace(/[^\d+\s-]/g, '')
          : e.target.value;
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

  const fieldErrors = {
    contactName: formData.contactName.trim()
      ? validateName(formData.contactName, 'Contact name')
      : null,
    email: formData.email.trim() ? validateEmail(formData.email) : null,
    phone: formData.phone.trim() ? validatePhone(formData.phone) : null,
    whatsapp: validatePhone(formData.whatsapp, { required: false }),
    gst: validateGstin(formData.gst),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const blocking = collectErrors({
      contactName: validateName(formData.contactName, 'Contact name'),
      email: validateEmail(formData.email),
      phone: validatePhone(formData.phone),
      whatsapp: validatePhone(formData.whatsapp, { required: false }),
      gst: validateGstin(formData.gst),
    });
    const firstError = Object.values(blocking)[0];
    if (firstError) {
      toast.error(firstError);
      return;
    }

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
              maxLength={100}
              aria-invalid={!!fieldErrors.contactName}
              className={fieldErrors.contactName ? 'border-red-400' : ''}
              placeholder="e.g., John Smith"
              required
            />
            <FieldError message={fieldErrors.contactName ?? undefined} />
          </div>
          <div>
            <label className="block text-sm font-normal text-ink mb-2">Email *</label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.email}
              className={fieldErrors.email ? 'border-red-400' : ''}
              placeholder="contact@vendor.com"
              required
            />
            <FieldError message={fieldErrors.email ?? undefined} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-normal text-ink mb-2">Phone *</label>
            <Input
              name="phone"
              type="tel"
              maxLength={14}
              value={formData.phone}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.phone}
              className={fieldErrors.phone ? 'border-red-400' : ''}
              placeholder="+91 XXXXXXXXXX"
              required
            />
            <FieldError message={fieldErrors.phone ?? undefined} />
          </div>
          <div>
            <label className="block text-sm font-normal text-ink mb-2">WhatsApp</label>
            <Input
              name="whatsapp"
              type="tel"
              maxLength={14}
              value={formData.whatsapp}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.whatsapp}
              className={fieldErrors.whatsapp ? 'border-red-400' : ''}
              placeholder="+91 XXXXXXXXXX"
            />
            <FieldError message={fieldErrors.whatsapp ?? undefined} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">GST Number</label>
          <Input
            name="gst"
            value={formData.gst}
            maxLength={15}
            onChange={handleChange}
            aria-invalid={!!fieldErrors.gst}
            className={fieldErrors.gst ? 'border-red-400' : ''}
            placeholder="27XXXXXXXXX1Z5"
          />
          <FieldError message={fieldErrors.gst ?? undefined} />
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
