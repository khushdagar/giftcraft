'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatRupees } from '@/lib/utils';
import { INDIAN_STATES } from '@/lib/constants';
import { printingTechniqueLabel } from '@/lib/printing';
import { FieldError } from '@/components/ui/field-error';
import {
  validateName,
  validatePan,
  validatePhone,
  validatePincode,
  validateRequired,
  validateText,
} from '@/lib/validation';
import { RazorpayButton } from './razorpay-button';

interface CheckoutFormProps {
  quoteId: string;
  userEmail: string;
  userName: string;
  pricing: any;
  payload: any;
  onPathChange?: (path: 'mockup' | 'pricelock') => void;
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const TIMELINE_STEPS = [
  { number: 1, label: 'Order Confirmed', description: 'We create an order confirmation via email with Order ID' },
  { number: 2, label: 'Mockup Creation (1-2 business days)', description: 'Our design team creates branded mockups showing your logo on each product. You\'ll receive an approval link email' },
  { number: 3, label: 'Design Approval', description: 'Review the mockups, request changes if needed, and approve when satisfied. Digital approval via email' },
  { number: 4, label: 'Full Payment', description: 'Once mockups are approved, complete the remaining payment to begin production' },
  { number: 5, label: 'Production & QC', description: 'Products are produced, branded, and quality-checked. You\'ll receive QC photos for review' },
  { number: 6, label: 'Packed & Shipped', description: 'Gift packs are beautifully packaged and dispatched in your chosen delivery timeline' },
  { number: 7, label: 'Delivery & Invoice', description: 'Gifts are delivered. GST-compliant invoice emailed automatically' },
];

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

  // Field-level errors surface only after the field is blurred once.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));
  const showIf = (field: string, message: string | null) =>
    touched[field] ? message ?? undefined : undefined;

  const errors = {
    companyName: showIf('companyName', validateName(formData.companyName, 'Company name')),
    pan: showIf('pan', validatePan(formData.pan)),
    address1: showIf('address1', validateText(formData.address1, 'Address line 1', { min: 5, max: 200 })),
    city: showIf('city', validateName(formData.city, 'City')),
    state: showIf('state', validateRequired(formData.state, 'State')),
    pincode: showIf('pincode', validatePincode(formData.pincode)),
    contactName: showIf('contactName', validateName(formData.contactName, 'Full name')),
    phone: showIf('phone', validatePhone(formData.phone)),
  };

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
      {/* Order Summary */}
      <div className="bg-white rounded-gc-l border-2 border-bdr p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Order Summary</p>
          <p className="text-xs text-ink-3 hover:underline cursor-pointer">Edit Order</p>
        </div>

        <div className="space-y-3 pb-4 border-b border-bdr">
          {products.map((product: any) => (
            <div key={product.id} className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">{product.name}</p>
                {/* No fallback: a product with no technique shouldn't be told
                    it's screen printed on the page where money changes hands. */}
                {printingTechniqueLabel(product.printingTechnique) && (
                  <p className="text-xs text-ink-3 mt-0.5">
                    {printingTechniqueLabel(product.printingTechnique)}
                  </p>
                )}
              </div>
              <p className="text-sm font-black text-ink flex-shrink-0">{formatRupees(product.sellPrice * product.quantity)}</p>
            </div>
          ))}
        </div>

        {(packaging || addons.length > 0) && (
          <div className="space-y-2 pb-4 border-b border-bdr">
            {packaging && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-2">{packaging.name}</span>
                <span className="font-semibold text-ink">+{formatRupees(packaging.price * payload.packQuantity)}</span>
              </div>
            )}
            {addons.map((addon: any) => (
              <div key={addon.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-2">{addon.name}</span>
                <span className="font-semibold text-ink">+{formatRupees(addon.price * payload.packQuantity)}</span>
              </div>
            ))}
          </div>
        )}

        {shippingZone && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">{shippingZone.zoneName} • {payload.packQuantity} packs</span>
            <span className="font-semibold text-ink">
              {pricing?.shipping > 0 ? formatRupees(pricing.shipping) : 'FREE'}
            </span>
          </div>
        )}
      </div>

      {/* Billing Information */}
      <div className="bg-white rounded-gc-l border-2 border-bdr p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Billing Information</p>

        <div>
          <Input
            type="text"
            placeholder="Company Name *"
            maxLength={120}
            value={formData.companyName}
            aria-invalid={!!errors.companyName}
            onBlur={() => touch('companyName')}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className={`rounded-gc ${errors.companyName ? 'border-red-400' : ''}`}
            required
          />
          <FieldError message={errors.companyName} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              type="text"
              placeholder="GSTIN (Optional)"
              maxLength={15}
              value={formData.gstin}
              aria-invalid={!!gstinError}
              onChange={(e) => handleGstinChange(e.target.value)}
              className={`rounded-gc ${gstinError ? 'border-red-400' : ''}`}
            />
            <FieldError message={gstinError ?? undefined} />
          </div>
          <div>
            <Input
              type="text"
              placeholder="PAN (Optional)"
              maxLength={10}
              value={formData.pan}
              aria-invalid={!!errors.pan}
              onBlur={() => touch('pan')}
              onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
              className={`rounded-gc ${errors.pan ? 'border-red-400' : ''}`}
            />
            <FieldError message={errors.pan} />
          </div>
        </div>

        <Input
          type="text"
          placeholder="PO Number (Optional for enterprises)"
          value={formData.poNumber}
          onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
          className="rounded-gc"
        />

        <div className="border-t border-bdr pt-4">
          <p className="text-xs font-semibold text-ink-3 mb-3">Billing Address</p>

          <div className="mb-3">
            <Input
              type="text"
              placeholder="Address Line 1 *"
              maxLength={200}
              value={formData.address1}
              aria-invalid={!!errors.address1}
              onBlur={() => touch('address1')}
              onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
              className={`rounded-gc ${errors.address1 ? 'border-red-400' : ''}`}
              required
            />
            <FieldError message={errors.address1} />
          </div>

          <Input
            type="text"
            placeholder="Address Line 2 (Optional)"
            value={formData.address2}
            onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
            className="rounded-gc mb-3"
          />

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <Input
                type="text"
                placeholder="City *"
                maxLength={60}
                value={formData.city}
                aria-invalid={!!errors.city}
                onBlur={() => touch('city')}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className={`rounded-gc ${errors.city ? 'border-red-400' : ''}`}
                required
              />
              <FieldError message={errors.city} />
            </div>
            <div>
              <select
                value={formData.state}
                aria-invalid={!!errors.state}
                onBlur={() => touch('state')}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className={`w-full rounded-gc border-2 px-3 py-2 bg-white text-sm text-ink ${
                  errors.state ? 'border-red-400' : 'border-bdr'
                }`}
                required
              >
                <option value="">State *</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              <FieldError message={errors.state} />
            </div>
            <div>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Pincode *"
                value={formData.pincode}
                maxLength={6}
                aria-invalid={!!errors.pincode}
                onBlur={() => touch('pincode')}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setFormData({ ...formData, pincode: val });
                }}
                className={`rounded-gc ${errors.pincode ? 'border-red-400' : ''}`}
                required
              />
              <FieldError message={errors.pincode} />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Person */}
      <div className="bg-white rounded-gc-l border-2 border-bdr p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Contact Person</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              type="text"
              placeholder="Full Name *"
              maxLength={100}
              value={formData.contactName}
              aria-invalid={!!errors.contactName}
              onBlur={() => touch('contactName')}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              className={`rounded-gc ${errors.contactName ? 'border-red-400' : ''}`}
              required
            />
            <FieldError message={errors.contactName} />
          </div>
          <Input
            type="text"
            placeholder="Designation (Optional)"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            className="rounded-gc"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="email"
            placeholder="Email"
            value={formData.email}
            className="rounded-gc bg-gray-50"
            disabled
          />
          <div>
            <Input
              type="tel"
              inputMode="tel"
              maxLength={14}
              placeholder="Phone *"
              value={formData.phone}
              aria-invalid={!!errors.phone}
              onBlur={() => touch('phone')}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value.replace(/[^\d+\s-]/g, '') })
              }
              className={`rounded-gc ${errors.phone ? 'border-red-400' : ''}`}
              required
            />
            <FieldError message={errors.phone} />
          </div>
        </div>
      </div>

      {/* Path Selection */}
      <div className="bg-white rounded-gc-l border-2 border-bdr p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">How would you like to proceed?</p>

        <div className="grid grid-cols-2 gap-4">
          {/* Mockup Path */}
          <button
            type="button"
            onClick={() => handlePathChange('mockup')}
            className={`text-left rounded-gc-l border-2 p-5 transition ${
              selectedPath === 'mockup'
                ? 'border-em-600 bg-em-50'
                : 'border-bdr bg-white hover:bg-elevated'
            }`}
          >
            <div className="flex items-start gap-2 mb-3">
              <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 border-2 ${
                selectedPath === 'mockup' ? 'border-em-600 bg-em-600' : 'border-bdr'
              }`} />
              <div className="flex-1">
                <p className="font-bold text-sm text-ink">Confirm Order & Get Mockups</p>
                <p className="text-xs text-ink-3 mt-0.5">Work with mockups before producing</p>
              </div>
            </div>
            <p className="text-lg font-black text-em mb-3">₹0 now</p>
            <ul className="space-y-1 ml-7">
              <li className="text-xs text-ink-2 flex items-center gap-1.5">
                <span className="text-em text-sm">✓</span> We create branded mockups (1-2 days)
              </li>
              <li className="text-xs text-ink-2 flex items-center gap-1.5">
                <span className="text-em text-sm">✓</span> You review & approve
              </li>
              <li className="text-xs text-ink-2 flex items-center gap-1.5">
                <span className="text-em text-sm">✓</span> Free revisions (2 times)
              </li>
              <li className="text-xs text-ink-2 flex items-center gap-1.5">
                <span className="text-em text-sm">✓</span> Full payment after approval
              </li>
            </ul>
            {selectedPath === 'mockup' && (
              <p className="text-xs text-em font-semibold mt-3">RECOMMENDED</p>
            )}
          </button>

          {/* Price Lock Path */}
          <button
            type="button"
            onClick={() => handlePathChange('pricelock')}
            className={`text-left rounded-gc-l border-2 p-5 transition ${
              selectedPath === 'pricelock'
                ? 'border-gold-700 bg-gold-50'
                : 'border-bdr bg-white hover:bg-elevated'
            }`}
          >
            <div className="flex items-start gap-2 mb-3">
              <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 border-2 ${
                selectedPath === 'pricelock' ? 'border-gold-700 bg-gold-700' : 'border-bdr'
              }`} />
              <div className="flex-1">
                <p className="font-bold text-sm text-ink">Lock Prices with 10% Advance</p>
                <p className="text-xs text-ink-3 mt-0.5">Secure your price now, production starts immediately</p>
              </div>
            </div>
            <p className="text-lg font-black text-dark mb-1">{formatRupees(advanceAmount)}</p>
            <p className="text-xs text-ink-3 mb-3">only 10% advance</p>
            <ul className="space-y-1 ml-7">
              <li className="text-xs text-ink-2 flex items-center gap-1.5">
                <span className="text-gold-700 text-sm">✓</span> Price locked today
              </li>
              <li className="text-xs text-ink-2 flex items-center gap-1.5">
                <span className="text-gold-700 text-sm">✓</span> Production starts immediately
              </li>
              <li className="text-xs text-ink-2 flex items-center gap-1.5">
                <span className="text-gold-700 text-sm">✓</span> Pay balance before delivery
              </li>
              <li className="text-xs text-ink-2 flex items-center gap-1.5">
                <span className="text-gold-700 text-sm">✓</span> Faster delivery (usually 1 week)
              </li>
            </ul>
          </button>
        </div>
      </div>

      {/* What Happens Next */}
      <div className="bg-white rounded-gc-l border-2 border-bdr p-6">
        <div className="flex items-center gap-2 mb-5">
          <svg className="w-5 h-5 text-em" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 100-2H6a4 4 0 00-4 4v10a1 1 0 001 1h1a1 1 0 100-2H2V5z" clipRule="evenodd" />
          </svg>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">What Happens Next</p>
        </div>

        <div className="space-y-1.5">
          {TIMELINE_STEPS.map((step) => {
            const getStepColor = (stepNum: number) => {
              if (stepNum === 1) return 'bg-em text-white';
              if (stepNum === 2) return 'bg-orange-500 text-white';
              if (stepNum === 3) return 'bg-amber-500 text-white';
              if (stepNum === 4) return 'bg-amber-400 text-white';
              return 'bg-gray-200 text-gray-500 border border-gray-300';
            };
            const isActive = step.number <= 4;

            return (
              <div key={step.number} className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                  <div className={`w-7 h-7 rounded-full ${getStepColor(step.number)} flex items-center justify-center text-xs font-black`}>
                    {step.number}
                  </div>
                  {step.number < 7 && (
                    <div className={`w-0.5 h-8 ${isActive ? 'bg-bdr' : 'bg-gray-200'} mt-0.5`} />
                  )}
                </div>
                <div className="pb-1 pt-0.5">
                  <p className="text-sm font-bold text-ink leading-tight">{step.label}</p>
                  <p className="text-xs text-ink-3 mt-0.5 leading-snug">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </form>
  );
}
