'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  collectErrors,
  validateEmail,
  validateName,
  validateNumber,
  validatePhone,
  validateText,
} from '@/lib/validation';
import { FieldError, inputClass } from '@/components/ui/field-error';

interface EnquiryFormProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
  productId?: string;
}

export function EnquiryForm({ isOpen, onClose, productName, productId }: EnquiryFormProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    quantity: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});

  const validate = (data: typeof formData) =>
    collectErrors({
      companyName: validateName(data.companyName, 'Company name'),
      contactName: validateName(data.contactName, 'Contact name'),
      email: validateEmail(data.email),
      phone: validatePhone(data.phone),
      quantity: validateNumber(data.quantity, 'Quantity', { required: false, min: 1, max: 1000000 }),
      message: validateText(data.message, 'Message', { required: false, max: 2000 }),
    });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear the error as soon as the user starts fixing the field
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const name = e.target.name as keyof typeof formData;
    const errors = validate({ ...formData, [name]: e.target.value });
    setFieldErrors((prev) => ({ ...prev, [name]: errors[name] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors = validate(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: formData.quantity || undefined,
          productName,
          productId,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Something went wrong. Please try again.');
      }

      setSubmitted(true);
      setFieldErrors({});
      setTimeout(() => {
        setSubmitted(false);
        onClose();
        setFormData({
          companyName: '',
          contactName: '',
          email: '',
          phone: '',
          quantity: '',
          message: '',
        });
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 p-4">
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-md bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-bdr px-6 py-4">
          <h2 className="text-xl font-semibold text-ink">Get a Quick Quote</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-elevated transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {submitted ? (
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-em mb-2">Thank you!</p>
              <p className="text-sm text-ink-2">We'll get back to you shortly with a quote.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
             
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    aria-invalid={!!fieldErrors.companyName}
                    className={inputClass(fieldErrors.companyName)}
                    placeholder="TechCorp India"
                  />
                  <FieldError message={fieldErrors.companyName} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    aria-invalid={!!fieldErrors.contactName}
                    className={inputClass(fieldErrors.contactName)}
                    placeholder="Priya Sharma"
                  />
                  <FieldError message={fieldErrors.contactName} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    aria-invalid={!!fieldErrors.email}
                    className={inputClass(fieldErrors.email)}
                    placeholder="priya@techcorp.com"
                  />
                  <FieldError message={fieldErrors.email} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    aria-invalid={!!fieldErrors.phone}
                    className={inputClass(fieldErrors.phone)}
                    placeholder="+91 98765 43210"
                  />
                  <FieldError message={fieldErrors.phone} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min={1}
                    step={1}
                    value={formData.quantity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!fieldErrors.quantity}
                    className={inputClass(fieldErrors.quantity)}
                    placeholder="250"
                  />
                  <FieldError message={fieldErrors.quantity} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink mb-1">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    rows={4}
                    maxLength={2000}
                    aria-invalid={!!fieldErrors.message}
                    className={`${inputClass(fieldErrors.message)} resize-none`}
                    placeholder="Any specific requirements or questions?"
                  />
                  <FieldError message={fieldErrors.message} />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-full bg-em py-3 text-white font-semibold hover:bg-em/90 transition disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit Enquiry'}
                </button>
                
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
