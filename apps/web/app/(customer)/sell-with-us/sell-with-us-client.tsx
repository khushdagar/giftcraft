'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { FieldError } from '@/components/ui/field-error';
import {
  collectErrors,
  validateEmail,
  validateGstin,
  validateName,
  validateNumber,
  validatePhone,
} from '@/lib/validation';

const EMPTY = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  whatsapp: '',
  city: '',
  state: '',
  address: '',
  type: '',
  gst: '',
  paymentTerms: '',
  avgLeadDays: '',
  minOrderQty: '',
  productsServices: '',
  notes: '',
};

export default function SellWithUsPage() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});

  const validate = (data: typeof form) =>
    collectErrors({
      name: validateName(data.name, 'Company name'),
      contactName: validateName(data.contactName, 'Contact person'),
      email: validateEmail(data.email),
      phone: validatePhone(data.phone),
      whatsapp: validatePhone(data.whatsapp, { required: false }),
      city: validateName(data.city, 'City', { required: false }),
      state: validateName(data.state, 'State', { required: false }),
      gst: validateGstin(data.gst),
      avgLeadDays: validateNumber(data.avgLeadDays, 'Lead time', {
        required: false,
        min: 1,
        max: 365,
      }),
      minOrderQty: validateNumber(data.minOrderQty, 'Min order qty', {
        required: false,
        min: 1,
        max: 1000000,
      }),
    });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    const value = name === 'gst' ? e.target.value.toUpperCase() : e.target.value;
    setForm((p) => ({ ...p, [name]: value }));
    setFieldErrors((p) => ({ ...p, [name]: undefined }));
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const name = e.target.name as keyof ReturnType<typeof validate>;
    setFieldErrors((p) => ({ ...p, [name]: validate(form)[name] }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const toNum = (v: string) => (v.trim() === '' ? null : Number(v));
      const payload = {
        ...form,
        avgLeadDays: toNum(form.avgLeadDays),
        minOrderQty: toNum(form.minOrderQty),
      };
      const res = await fetch('/api/vendors/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-em/10">
          <CheckCircle2 className="h-9 w-9 text-em" />
        </div>
        <h1 className="font-display text-3xl font-black tracking-tight text-ink">Application received</h1>
        <p className="mt-3 text-base text-ink-2">
          Thanks for your interest in supplying GIVOO. Our sourcing team will review your details
          and reach out if there&apos;s a fit. You can close this page.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-2xl bg-em px-8 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-em-600"
        >
          Back to Home
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-3">For Business</p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-ink sm:text-5xl">
          Sell With Us
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-2">
          Are you a manufacturer, brand, or supplier? Partner with GIVOO to reach India&apos;s fastest
          growing corporate gifting platform. Tell us about your business and we&apos;ll be in touch.
        </p>
      </div>

      {/* Form card */}
      <form onSubmit={onSubmit} className="rounded-md border-2 border-bdr bg-white p-6 sm:p-8 space-y-6">
        {error && (
          <div className="flex items-start gap-3 rounded-md border-2 border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Company Name *" name="name" value={form.name} onChange={onChange} onBlur={onBlur} error={fieldErrors.name} maxLength={120} required placeholder="e.g., Borosil" />
          <Field label="Contact Person *" name="contactName" value={form.contactName} onChange={onChange} onBlur={onBlur} error={fieldErrors.contactName} maxLength={100} required placeholder="Your name" />
          <Field label="Email *" name="email" type="email" value={form.email} onChange={onChange} onBlur={onBlur} error={fieldErrors.email} required placeholder="you@company.com" />
          <Field label="Phone *" name="phone" type="tel" value={form.phone} onChange={onChange} onBlur={onBlur} error={fieldErrors.phone} maxLength={14} required placeholder="+91 XXXXXXXXXX" />
          <Field label="WhatsApp" name="whatsapp" type="tel" value={form.whatsapp} onChange={onChange} onBlur={onBlur} error={fieldErrors.whatsapp} maxLength={14} placeholder="+91 XXXXXXXXXX" />
          <Field label="What do you supply?" name="type" value={form.type} onChange={onChange} maxLength={200} placeholder="e.g., Drinkware, Apparel, Packaging" />
          <Field label="City" name="city" value={form.city} onChange={onChange} onBlur={onBlur} error={fieldErrors.city} maxLength={60} placeholder="e.g., Delhi" />
          <Field label="State" name="state" value={form.state} onChange={onChange} onBlur={onBlur} error={fieldErrors.state} maxLength={60} placeholder="e.g., Delhi" />
          <Field label="GST Number" name="gst" value={form.gst} onChange={onChange} onBlur={onBlur} error={fieldErrors.gst} maxLength={15} placeholder="Optional" />
          <Field label="Payment Terms" name="paymentTerms" value={form.paymentTerms} onChange={onChange} maxLength={200} placeholder="e.g., 50% advance" />
          <Field label="Avg Lead Time (days)" name="avgLeadDays" type="number" value={form.avgLeadDays} onChange={onChange} onBlur={onBlur} error={fieldErrors.avgLeadDays} placeholder="e.g., 10" />
          <Field label="Min Order Qty" name="minOrderQty" type="number" value={form.minOrderQty} onChange={onChange} onBlur={onBlur} error={fieldErrors.minOrderQty} placeholder="e.g., 50" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink">Address</label>
          <textarea
            name="address"
            value={form.address}
            onChange={onChange}
            rows={2}
            placeholder="Street address, building, area, PIN"
            className="w-full rounded-md border-2 border-bdr p-3 text-sm outline-none focus:border-em"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink">Products / Services</label>
          <textarea
            name="productsServices"
            value={form.productsServices}
            onChange={onChange}
            rows={3}
            placeholder="Describe the products or services you offer, capacity, MOQ, etc."
            className="w-full rounded-md border-2 border-bdr p-3 text-sm outline-none focus:border-em"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink">Anything else?</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            rows={2}
            placeholder="Website, catalogue link, or any other details"
            className="w-full rounded-md border-2 border-bdr p-3 text-sm outline-none focus:border-em"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-em px-8 py-4 text-lg font-bold text-white transition hover:-translate-y-0.5 hover:bg-em-600 disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Submit Application'}
        </button>
        <p className="text-center text-xs text-ink-3">
          By submitting, you agree to be contacted by the GIVOO sourcing team.
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  type = 'text',
  required = false,
  placeholder,
  error,
  maxLength,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-ink">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={!!error}
        className={`w-full rounded-md border-2 p-3 text-sm outline-none ${
          error ? 'border-red-400' : 'border-bdr focus:border-em'
        }`}
      />
      <FieldError message={error} />
    </div>
  );
}
