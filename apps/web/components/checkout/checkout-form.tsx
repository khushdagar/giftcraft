'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRupees } from '@/lib/utils';
import { RazorpayButton } from './razorpay-button';

interface CheckoutFormProps {
  quoteId: string;
  userEmail: string;
  userName: string;
  pricing: any;
}

export function CheckoutForm({
  quoteId,
  userEmail,
  userName,
  pricing,
}: CheckoutFormProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: userName,
    email: userEmail,
    phone: '',
    gstin: '',
    address: '',
  });

  const [showBankTransfer, setShowBankTransfer] = useState(false);

  return (
    <div className="space-y-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-ink-3">
        Billing Information
      </p>

      <div className="rounded-gc-l border-2 border-bdr bg-white p-5 space-y-4">
        {/* Company Name */}
        <div>
          <label className="text-xs font-semibold text-ink-3 block mb-2">
            Company Name *
          </label>
          <Input
            type="text"
            placeholder="Your company"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className="rounded-gc"
            required
          />
        </div>

        {/* Contact Name */}
        <div>
          <label className="text-xs font-semibold text-ink-3 block mb-2">
            Contact Name *
          </label>
          <Input
            type="text"
            placeholder="Your name"
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            className="rounded-gc"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="text-xs font-semibold text-ink-3 block mb-2">
            Email *
          </label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="rounded-gc"
            required
            disabled
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-semibold text-ink-3 block mb-2">
            Phone *
          </label>
          <Input
            type="tel"
            placeholder="+91"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="rounded-gc"
            required
          />
        </div>

        {/* GSTIN */}
        <div>
          <label className="text-xs font-semibold text-ink-3 block mb-2">
            GSTIN (Optional)
          </label>
          <Input
            type="text"
            placeholder="15AAAAA0000A1Z5"
            value={formData.gstin}
            onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
            className="rounded-gc"
          />
        </div>

        {/* Delivery Address */}
        <div>
          <label className="text-xs font-semibold text-ink-3 block mb-2">
            Delivery Address *
          </label>
          <textarea
            placeholder="Street, City, Pincode"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full rounded-gc border border-bdr px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-em"
            rows={3}
            required
          />
        </div>
      </div>

      {/* Razorpay Fee Note */}
      <div className="rounded-gc bg-gold-50 border-2 border-gold p-4">
        <p className="text-xs font-semibold text-gold-700 mb-1">
          Payment Processing Fee
        </p>
        <p className="text-sm text-gold-900 mb-2">
          {formatRupees(pricing?.razorpayFee || 0)} will be added to your total
        </p>
        <p className="text-[10px] text-gold-700">
          (2% payment gateway fee + 18% GST)
        </p>
      </div>

      {/* Bank Transfer Option */}
      <div>
        <button
          onClick={() => setShowBankTransfer(!showBankTransfer)}
          className="w-full text-left rounded-gc border-2 border-bdr p-4 hover:bg-elevated transition"
        >
          <p className="text-sm font-semibold text-ink">
            {showBankTransfer ? '▼' : '▶'} Enterprise Bank Transfer
          </p>
        </button>
        {showBankTransfer && (
          <div className="mt-2 rounded-gc bg-elevated p-4 space-y-2 text-sm">
            <p className="text-ink-2">
              For large orders, we offer bank transfer with NET 30 terms.
            </p>
            <p className="text-ink-3">
              Contact: <a href="mailto:finance@giftcraft.in" className="text-em font-semibold">finance@giftcraft.in</a>
            </p>
          </div>
        )}
      </div>

      {/* Razorpay Payment Button */}
      <RazorpayButton
        quoteId={quoteId}
        amount={pricing?.grandTotal || 0}
        email={formData.email}
        phone={formData.phone}
        companyName={formData.companyName}
      />
    </div>
  );
}
