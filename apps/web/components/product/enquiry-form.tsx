'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
                    required
                    className="w-full rounded-md border border-bdr px-4 py-2 text-sm focus:border-em focus:outline-none"
                    placeholder="TechCorp India"
                  />
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
                    required
                    className="w-full rounded-md border border-bdr px-4 py-2 text-sm focus:border-em focus:outline-none"
                    placeholder="Priya Sharma"
                  />
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
                    required
                    className="w-full rounded-md border border-bdr px-4 py-2 text-sm focus:border-em focus:outline-none"
                    placeholder="priya@techcorp.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-bdr px-4 py-2 text-sm focus:border-em focus:outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="w-full rounded-md border border-bdr px-4 py-2 text-sm focus:border-em focus:outline-none"
                    placeholder="250"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink mb-1">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full rounded-md border border-bdr px-4 py-2 text-sm focus:border-em focus:outline-none resize-none"
                    placeholder="Any specific requirements or questions?"
                  />
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
