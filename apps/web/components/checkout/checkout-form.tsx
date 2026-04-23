'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatRupees } from '@/lib/utils';
import { INDIAN_STATES } from '@/lib/constants';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const TIMELINE_STEPS = [
  { number: 1, label: 'Order Confirmed', description: 'You\'ll receive an order confirmation via email and WhatsApp with Order ID.' },
  { number: 2, label: 'Mockup Creation (1–2 business days)', description: 'Our design team creates branded mockups showing your logo on each product. You\'ll receive an approval link via WhatsApp and email.' },
  { number: 3, label: 'Design Approval', description: 'Review the mockups, request changes if needed, and approve when satisfied. Digital approval is recorded with timestamp.' },
  { number: 4, label: 'Full Payment', description: 'Once mockups are approved, complete the full payment to begin production.' },
  { number: 5, label: 'Production & QC', description: 'Products are produced, branded, and quality-checked. You\'ll receive QC photos for review.' },
  { number: 6, label: 'Packed & Shipped', description: 'Gift packs assembled, packed in your chosen packaging, and shipped. Tracking link shared via WhatsApp.' },
  { number: 7, label: 'Delivery & Invoice', description: 'Gifts delivered. GST-compliant invoice with HSN codes emailed automatically.' },
];

interface CheckoutFormProps {
  quoteId: string;
  userEmail: string;
  userName: string;
  pricing: any;
  payload: any;
  onPathChange?: (path: 'mockup' | 'pricelock') => void;
}

export function CheckoutForm({
  quoteId,
  userEmail,
  userName,
  pricing,
  payload,
  onPathChange,
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

  const [selectedPath, setSelectedPath] = useState<'mockup' | 'pricelock'>('mockup');
  const [gstinError, setGstinError] = useState<string | null>(null);

  const handlePathChange = (path: 'mockup' | 'pricelock') => {
    setSelectedPath(path);
    onPathChange?.(path);
  };

  const handleGstinChange = (value: string) => {
    const sanitized = value.toUpperCase();
    setFormData({ ...formData, gstin: sanitized });
    if (sanitized && !GSTIN_REGEX.test(sanitized)) {
      setGstinError('Invalid GSTIN format (15 characters)');
    } else {
      setGstinError(null);
    }
  };

  const products = payload.products || [];
  const packaging = payload.packaging;
  const addons = payload.addons || [];
  const shippingZone = payload.shippingZone;
  const packQuantity = payload.packQuantity || 1;

  const grandTotal = pricing?.grandTotal || 0;
  const advanceAmount = Math.round(grandTotal * 0.1 * 100) / 100;

  return (
    <form className="space-y-6">
      {/* 1. ORDER SUMMARY */}
      <div className="bg-white rounded-3xl border-2 border-gray-300 shadow-sm p-7 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-600">🎁 Order Summary</p>
          <a href="/builder" className="text-xs font-bold text-green-700 hover:underline">Edit Order →</a>
        </div>

        {/* Product Items */}
        <div className="space-y-3 pb-4 border-b border-gray-300">
          {products.map((product: any) => (
            <div key={product.id} className="flex items-center gap-3">
              {/* Product Icon/Image */}
              <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">
                📦
              </div>

              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 line-clamp-1">{product.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{product.brand} · {product.printingTechnique || 'Screen Printed'}</p>
              </div>

              {/* Price with Quantity */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-gray-900 tabular-nums">{formatRupees(product.sellPrice * product.quantity)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Customizations */}
        {(packaging || addons.length > 0) && (
          <div className="space-y-2 pb-4 border-b border-gray-300">
            {packaging && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{packaging.name}</span>
                <span className="font-bold text-gray-900">+{formatRupees(packaging.price * packQuantity)}</span>
              </div>
            )}
            {addons.map((addon: any) => (
              <div key={addon.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{addon.name}</span>
                <span className="font-bold text-gray-900">+{formatRupees(addon.price * packQuantity)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Shipping */}
        {shippingZone && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{shippingZone.zoneName} • {packQuantity} packs</span>
            <span className="font-bold text-gray-900">{formatRupees(shippingZone.flatRate)}</span>
          </div>
        )}
      </div>

      {/* 2. BILLING INFORMATION */}
      <div className="bg-white rounded-3xl border-2 border-gray-300 shadow-sm p-7 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-4">💼 Billing Information</p>

        <Input
          type="text"
          placeholder="Company Name *"
          value={formData.companyName}
          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          className="rounded-2xl h-11 px-3 border-2 border-gray-300 text-sm"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              type="text"
              placeholder="GSTIN (for GST invoice)"
              value={formData.gstin}
              onChange={(e) => handleGstinChange(e.target.value)}
              maxLength={15}
              className="rounded-2xl h-11 px-3 border-2 border-gray-300 text-sm"
            />
            {gstinError && <p className="text-xs text-red-600 mt-1">{gstinError}</p>}
          </div>
          <Input
            type="text"
            placeholder="PAN (Optional)"
            value={formData.pan}
            onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
            className="rounded-2xl h-11 px-3 border-2 border-gray-300 text-sm"
          />
        </div>

        <Input
          type="text"
          placeholder="PO Number (Optional, for enterprise)"
          value={formData.poNumber}
          onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
          className="rounded-2xl h-11 px-3 border-2 border-gray-300 text-sm"
        />

        <div className="border-t border-gray-300 pt-4">
          <p className="text-xs font-bold text-gray-600 mb-3">Billing Address</p>

          <Input
            type="text"
            placeholder="Address Line 1 *"
            value={formData.address1}
            onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
            className="rounded-2xl h-11 px-3 border-2 border-gray-300 text-sm mb-3"
            required
          />

          <Input
            type="text"
            placeholder="Address Line 2 (Optional)"
            value={formData.address2}
            onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
            className="rounded-2xl h-11 px-3 border-2 border-gray-300 text-sm mb-3"
          />

          <div className="grid grid-cols-3 gap-2">
            <Input
              type="text"
              placeholder="City *"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="rounded-2xl h-11 px-3 border-2 border-gray-300 text-sm"
              required
            />
            <select
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="rounded-2xl h-11 px-3 border-2 border-gray-300 bg-white text-sm text-gray-900"
              required
            >
              <option value="">State *</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <Input
              type="text"
              placeholder="Pincode *"
              value={formData.pincode}
              maxLength={6}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setFormData({ ...formData, pincode: val });
              }}
              className="rounded-2xl h-11 px-3 border-2 border-gray-300 text-sm"
              required
            />
          </div>
        </div>
      </div>

      {/* 3. CONTACT PERSON */}
      <div className="bg-white rounded-3xl border-2 border-gray-300 shadow-sm p-7 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-4">🤝 Contact Person</p>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="text"
            placeholder="Full Name *"
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            className="rounded-2xl h-11 px-3 border-2 border-gray-300 text-sm"
            required
          />
          <Input
            type="text"
            placeholder="Designation (Optional)"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            className="rounded-2xl h-11 px-3 border-2 border-gray-300 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="email"
            placeholder="Email"
            value={formData.email}
            className="rounded-2xl h-11 px-3 border-2 border-gray-300 text-sm bg-gray-50"
            disabled
          />
          <Input
            type="tel"
            placeholder="Phone *"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="rounded-2xl h-11 px-3 border-2 border-gray-300 text-sm"
            required
          />
        </div>
      </div>

      {/* 4. HOW WOULD YOU LIKE TO PROCEED */}
      <div className="bg-white rounded-3xl border-2 border-gray-300 shadow-sm p-7 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-4">🎯 How would you like to proceed?</p>

        <div className="space-y-3">
          {/* Path A: Free Mockup */}
          <button
            type="button"
            onClick={() => handlePathChange('mockup')}
            className={`w-full text-left rounded-3xl border-2 p-5 transition ${
              selectedPath === 'mockup'
                ? 'border-green-700 bg-green-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-1 border-2 flex items-center justify-center ${
                  selectedPath === 'mockup' ? 'border-green-700 bg-green-700' : 'border-gray-300'
                }`}>
                  {selectedPath === 'mockup' && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">Confirm Order & Get Mockups</p>
                  <p className="text-xs text-gray-600 mt-1">Work with mockups before producing</p>
                </div>
              </div>
              <p className="text-2xl font-black text-green-700 whitespace-nowrap">₹0 now</p>
            </div>
            <ul className="space-y-1.5 ml-8">
              <li className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-green-700">✓</span> We create branded mockups (1-2 days)
              </li>
              <li className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-green-700">✓</span> You review & approve
              </li>
              <li className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-green-700">✓</span> Free revisions (2 times)
              </li>
              <li className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-green-700">✓</span> Full payment after approval
              </li>
            </ul>
            {selectedPath === 'mockup' && (
              <p className="text-xs text-green-700 font-bold mt-3">RECOMMENDED</p>
            )}
          </button>

          {/* Path B: Price Lock */}
          <button
            type="button"
            onClick={() => handlePathChange('pricelock')}
            className={`w-full text-left rounded-3xl border-2 p-5 transition ${
              selectedPath === 'pricelock'
                ? 'border-yellow-700 bg-yellow-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-1 border-2 flex items-center justify-center ${
                  selectedPath === 'pricelock' ? 'border-yellow-700 bg-yellow-700' : 'border-gray-300'
                }`}>
                  {selectedPath === 'pricelock' && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">Lock Prices with 10% Advance</p>
                  <p className="text-xs text-gray-600 mt-1">Secure your price now, production starts immediately</p>
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <p className="text-2xl font-black text-gray-900">{formatRupees(advanceAmount)}</p>
                <p className="text-xs text-gray-500 mt-1">only 10% advance</p>
              </div>
            </div>
            <ul className="space-y-1.5 ml-8">
              <li className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-yellow-700">✓</span> Price locked today
              </li>
              <li className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-yellow-700">✓</span> Production starts immediately
              </li>
              <li className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-yellow-700">✓</span> Pay balance before delivery
              </li>
              <li className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-yellow-700">✓</span> Faster delivery (usually 1 week)
              </li>
            </ul>
          </button>
        </div>

        {/* Payment Methods (shown for pricelock) */}
        {selectedPath === 'pricelock' && (
          <div className="mt-6 pt-6 border-t border-gray-300 space-y-4">
            <div className="rounded-2xl bg-yellow-50 border border-yellow-300 p-3">
              <p className="text-xs text-yellow-800 font-semibold">
                ⏰ Price Lock Guarantee: By paying 10% advance, your quoted prices are locked for 30 days regardless of any price changes. The remaining 90% is due only after you approve the mockups.
              </p>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-600 mb-3">Select Payment Method for Advance</p>
              <div className="space-y-2">
                {[
                  { value: 'upi', label: 'UPI', desc: 'Google Pay, PhonePe, Paytm, BHIM' },
                  { value: 'netbanking', label: 'Net Banking', desc: 'All major Indian banks' },
                  { value: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay, Amex' },
                  { value: 'emi', label: 'EMI Options', desc: 'Credit card EMI, Bajaj Finserv' },
                  { value: 'bank', label: 'Bank Transfer (Enterprise)', desc: 'Upload signed PO · NET-15/30/45 terms' },
                ].map((method) => (
                  <label key={method.value} className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-2xl cursor-pointer hover:border-green-700 transition">
                    <input type="radio" name="payment" value={method.value} defaultChecked={method.value === 'upi'} className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{method.label}</p>
                      <p className="text-xs text-gray-600">{method.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-300 p-3">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">ℹ️ Payment Processing Fee:</span> ~2% + 18% GST charged by Razorpay and included in your total.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5. WHAT HAPPENS NEXT */}
      <div className="bg-white rounded-3xl border-2 border-gray-300 shadow-sm p-7">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-6">📋 What Happens Next</p>

        <div className="space-y-6">
          {TIMELINE_STEPS.map((step, idx) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-black">
                  {step.number}
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div className="w-0.5 h-12 bg-gray-300 mt-2" />
                )}
              </div>
              <div className="pb-4">
                <p className="text-sm font-bold text-gray-900">{step.label}</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}
