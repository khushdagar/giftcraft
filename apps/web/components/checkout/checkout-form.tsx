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
const PAYMENT_METHODS = [
  { id: 'razorpay', label: 'Credit / Debit Card, UPI, Net Banking', icon: '💳' },
  { id: 'emi', label: 'EMI (Coming Soon)', icon: '📅', disabled: true },
  { id: 'bank', label: 'Bank Transfer (NEFT)', icon: '🏦' },
];

export function CheckoutForm({
  quoteId,
  userEmail,
  userName,
  pricing,
}: CheckoutFormProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: userName,
    designation: '',
    email: userEmail,
    phone: '',
    pan: '',
    gstin: '',
    poNumber: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGstinChange = (value: string) => {
    const sanitized = value.toUpperCase();
    setFormData({ ...formData, gstin: sanitized });

    if (sanitized && !GSTIN_REGEX.test(sanitized)) {
      setGstinError('Invalid GSTIN format (15 characters)');
    } else {
      setGstinError(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name required';
    if (!formData.contactName.trim()) newErrors.contactName = 'Contact name required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number required';
    if (!formData.address1.trim()) newErrors.address1 = 'Address required';
    if (!formData.city.trim()) newErrors.city = 'City required';
    if (!formData.state.trim()) newErrors.state = 'State required';
    if (!formData.pincode.trim() || formData.pincode.length !== 6) newErrors.pincode = 'Valid 6-digit pincode required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); validateForm(); }}>
      {/* Company Information */}
      <div className="rounded-gc-l border-2 border-bdr bg-white p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
            Company Information
          </p>
          <Input
            type="text"
            placeholder="Company Name *"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className="rounded-gc"
            required
          />
          {errors.companyName && <p className="text-xs text-red-600 mt-1">{errors.companyName}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              type="text"
              placeholder="GSTIN (Optional)"
              value={formData.gstin}
              onChange={(e) => handleGstinChange(e.target.value)}
              className="rounded-gc"
            />
            {gstinError && <p className="text-xs text-red-600 mt-1">{gstinError}</p>}
          </div>
          <Input
            type="text"
            placeholder="PAN (Optional)"
            value={formData.pan}
            onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
            className="rounded-gc"
          />
        </div>

        <Input
          type="text"
          placeholder="PO Number (Optional)"
          value={formData.poNumber}
          onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
          className="rounded-gc"
        />
      </div>

      {/* Contact Person */}
      <div className="rounded-gc-l border-2 border-bdr bg-white p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          Contact Person
        </p>

        <Input
          type="text"
          placeholder="Name *"
          value={formData.contactName}
          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
          className="rounded-gc"
          required
        />
        {errors.contactName && <p className="text-xs text-red-600 mt-1">{errors.contactName}</p>}

        <Input
          type="text"
          placeholder="Designation (Optional)"
          value={formData.designation}
          onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
          className="rounded-gc"
        />

        <Input
          type="email"
          placeholder="Email"
          value={formData.email}
          className="rounded-gc bg-gray-50"
          disabled
        />

        <Input
          type="tel"
          placeholder="Phone Number *"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="rounded-gc"
          required
        />
        {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
      </div>

      {/* Delivery Address */}
      <div className="rounded-gc-l border-2 border-bdr bg-white p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
          Delivery Address
        </p>

        <Input
          type="text"
          placeholder="Address Line 1 *"
          value={formData.address1}
          onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
          className="rounded-gc"
          required
        />
        {errors.address1 && <p className="text-xs text-red-600 mt-1">{errors.address1}</p>}

        <Input
          type="text"
          placeholder="Address Line 2 (Optional)"
          value={formData.address2}
          onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
          className="rounded-gc"
        />

        <div className="grid grid-cols-2 gap-3">
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
        {errors.pincode && <p className="text-xs text-red-600 mt-1">{errors.pincode}</p>}
      </div>

      {/* Payment Method Selection */}
      <div className="rounded-gc-l border-2 border-bdr bg-white p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
          Payment Method
        </p>

        <div className="space-y-3">
          {PAYMENT_METHODS.map((method) => (
            <label
              key={method.id}
              className={`flex items-center gap-4 p-4 rounded-gc border-2 cursor-pointer transition ${
                paymentMethod === method.id
                  ? 'border-dark bg-elevated'
                  : 'border-bdr bg-white hover:bg-elevated'
              } ${method.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={paymentMethod === method.id}
                onChange={(e) => !method.disabled && setPaymentMethod(e.target.value)}
                disabled={method.disabled}
                className="w-5 h-5"
              />
              <span className="text-lg">{method.icon}</span>
              <span className="text-sm font-semibold text-ink">{method.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Payment Gateway Fee Info */}
      {paymentMethod === 'razorpay' && (
        <div className="rounded-gc bg-gold-50 border-2 border-gold p-4">
          <p className="text-xs font-semibold text-gold-700 mb-1">Payment Processing Fee</p>
          <p className="text-sm font-black text-dark">
            +{formatRupees(pricing?.razorpayFee || 0)}
          </p>
          <p className="text-xs text-gold-700 mt-1">2.36% gateway fee + 18% GST on fee</p>
        </div>
      )}

      {/* Bank Transfer Details */}
      {paymentMethod === 'bank' && (
        <div className="rounded-gc bg-elevated border-2 border-bdr p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-ink-2 mb-3">Bank Details</p>
            <div className="bg-white rounded-gc p-4 space-y-3 border border-bdr text-sm">
              <div className="flex justify-between">
                <span className="text-ink-3">Account Name</span>
                <span className="font-semibold text-ink">{NEFT_DETAILS.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Account Number</span>
                <span className="font-semibold text-ink font-mono">{NEFT_DETAILS.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">IFSC</span>
                <span className="font-semibold text-ink font-mono">{NEFT_DETAILS.ifsc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Bank</span>
                <span className="font-semibold text-ink">{NEFT_DETAILS.bankName}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-3 block mb-2">Attach PO</label>
            <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="rounded-gc" />
            <p className="text-xs text-ink-3 mt-1">PDF, DOC, or image — max 5MB</p>
          </div>

          <p className="text-xs text-ink-2">
            Questions? <a href="mailto:finance@giftcraft.in" className="text-em font-semibold">finance@giftcraft.in</a>
          </p>
        </div>
      )}

      {/* Submit Button */}
      {paymentMethod === 'razorpay' ? (
        <RazorpayButton
          quoteId={quoteId}
          amount={pricing?.grandTotal || 0}
          email={formData.email}
          phone={formData.phone}
          companyName={formData.companyName}
        />
      ) : (
        <Button className="w-full" disabled>
          Submit for {paymentMethod === 'bank' ? 'Bank Transfer' : 'Payment'}
        </Button>
      )}
    </form>
  );
}
