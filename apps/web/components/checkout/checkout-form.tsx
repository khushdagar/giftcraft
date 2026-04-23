'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRupees } from '@/lib/utils';
import { INDIAN_STATES, NEFT_DETAILS } from '@/lib/constants';
import { RazorpayButton } from './razorpay-button';

interface CheckoutFormProps {
  quoteId: string;
  userEmail: string;
  userName: string;
  pricing: any;
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

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
    designation: '',
    pan: '',
    gstin: '',
    poNumber: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [gstinError, setGstinError] = useState<string | null>(null);
  const [showBankTransfer, setShowBankTransfer] = useState(false);

  const handleGstinChange = (value: string) => {
    const sanitized = value.toUpperCase();
    setFormData({ ...formData, gstin: sanitized });

    if (sanitized && !GSTIN_REGEX.test(sanitized)) {
      setGstinError('Invalid GSTIN format');
    } else {
      setGstinError(null);
    }
  };

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

        {/* Designation */}
        <div>
          <label className="text-xs font-semibold text-ink-3 block mb-2">
            Designation (Optional)
          </label>
          <Input
            type="text"
            placeholder="e.g., Manager, Director"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            className="rounded-gc"
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

        {/* PAN */}
        <div>
          <label className="text-xs font-semibold text-ink-3 block mb-2">
            PAN (Optional)
          </label>
          <Input
            type="text"
            placeholder="AAAAA0000A"
            value={formData.pan}
            onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
            className="rounded-gc"
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
            onChange={(e) => handleGstinChange(e.target.value)}
            className="rounded-gc"
          />
          {gstinError && <p className="text-xs text-red-600 mt-1">{gstinError}</p>}
        </div>

        {/* PO Number */}
        <div>
          <label className="text-xs font-semibold text-ink-3 block mb-2">
            PO Number (Optional)
          </label>
          <Input
            type="text"
            placeholder="e.g., PO-2024-001"
            value={formData.poNumber}
            onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
            className="rounded-gc"
          />
        </div>

        {/* Address Fields */}
        <div className="border-t border-bdr pt-4 mt-4">
          <p className="text-xs font-semibold text-ink-3 mb-4">Delivery Address *</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Input
              type="text"
              placeholder="Address Line 1 *"
              value={formData.address1}
              onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
              className="rounded-gc"
              required
            />
            <Input
              type="text"
              placeholder="Address Line 2 (Optional)"
              value={formData.address2}
              onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
              className="rounded-gc"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Input
              type="text"
              placeholder="City *"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="rounded-gc"
              required
            />
            <select
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="rounded-gc border-2 border-bdr px-3 py-2 bg-white text-sm text-ink"
              required
            >
              <option value="">Select State *</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Input
              type="text"
              placeholder="Pincode (6 digits) *"
              value={formData.pincode}
              maxLength={6}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setFormData({ ...formData, pincode: val });
              }}
              className="rounded-gc"
              required
            />
          </div>
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
          (2.36% payment gateway fee + 18% GST)
        </p>
      </div>

      {/* Bank Transfer Option */}
      <div>
        <button
          onClick={() => setShowBankTransfer(!showBankTransfer)}
          className="w-full text-left rounded-gc border-2 border-bdr p-4 hover:bg-elevated transition"
        >
          <p className="text-sm font-semibold text-ink">
            {showBankTransfer ? '▼' : '▶'} Enterprise Bank Transfer (NEFT)
          </p>
        </button>
        {showBankTransfer && (
          <div className="mt-2 rounded-gc bg-elevated p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-ink-3 mb-2">Bank Details</p>
              <div className="bg-white rounded-gc p-3 space-y-2 text-sm border border-bdr">
                <div className="flex justify-between">
                  <span className="text-ink-3">Account Name:</span>
                  <span className="font-semibold text-ink">{NEFT_DETAILS.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-3">Account Number:</span>
                  <span className="font-semibold text-ink font-mono">{NEFT_DETAILS.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-3">IFSC Code:</span>
                  <span className="font-semibold text-ink font-mono">{NEFT_DETAILS.ifsc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-3">Bank Name:</span>
                  <span className="font-semibold text-ink">{NEFT_DETAILS.bankName}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-3 block mb-2">
                Attach PO (Optional)
              </label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.png"
                className="rounded-gc"
              />
              <p className="text-[10px] text-ink-3 mt-1">
                PDF, DOC, or image — max 5MB
              </p>
            </div>

            <p className="text-xs text-ink-2">
              For large orders, we offer bank transfer with NET 30 terms.
            </p>
            <p className="text-xs text-ink-3">
              Questions? Contact: <a href="mailto:finance@giftcraft.in" className="text-em font-semibold">finance@giftcraft.in</a>
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
