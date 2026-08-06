'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { EMAIL_REGEX, PHONE_REGEX, PINCODE_REGEX } from '@/lib/validation';

const addressSchema = z.object({
  claimerName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .regex(/[a-zA-Z]/, 'Enter a valid name'),
  claimerEmail: z.string().trim().regex(EMAIL_REGEX, 'Enter a valid email address'),
  claimerPhone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, 'Enter a valid 10-digit mobile number'),
  addressLine1: z.string().trim().min(5, 'Address must be at least 5 characters').max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, 'City is required').max(60).regex(/[a-zA-Z]/, 'Enter a valid city'),
  state: z.string().trim().min(2, 'State is required').max(60).regex(/[a-zA-Z]/, 'Enter a valid state'),
  pincode: z.string().trim().regex(PINCODE_REGEX, 'Enter a valid 6-digit pincode'),
});

type AddressData = z.infer<typeof addressSchema>;

interface ClaimAddressFormProps {
  onSubmit: (data: AddressData) => Promise<void>;
  isSubmitting: boolean;
}

export function ClaimAddressForm({ onSubmit, isSubmitting }: ClaimAddressFormProps) {
  const [formData, setFormData] = useState<AddressData>({
    claimerName: '',
    claimerEmail: '',
    claimerPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  // Numeric-only fields reject stray characters at entry, so the user can never
  // type something the schema will later reject.
  const sanitize = (name: string, value: string) => {
    if (name === 'pincode') return value.replace(/\D/g, '').slice(0, 6);
    if (name === 'claimerPhone') return value.replace(/[^\d+]/g, '').slice(0, 13);
    return value;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const result = addressSchema.safeParse(formData);
    const message = result.success
      ? undefined
      : result.error.errors.find((err) => err.path[0] === name)?.message;
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[name] = message;
      else delete next[name];
      return next;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const value = sanitize(name, e.target.value);
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setErrors({});

    // Validate
    const result = addressSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0];
        if (field) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error: any) {
      setServerError(error.message || 'Failed to submit form');
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-md border border-bdr p-6 space-y-4 shadow-card"
    >
      <h3 className="text-lg font-bold text-em-700">Delivery Address</h3>

      {serverError && (
        <div className="p-3 rounded-md bg-rose-100 border border-rose-300 flex gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700">{serverError}</p>
        </div>
      )}

      <div className="space-y-3">
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-ink mb-1">
            Full Name
          </label>
          <Input
            type="text"
            name="claimerName"
            value={formData.claimerName}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="John Doe"
            className={`rounded-md border-2 px-3 py-2 text-sm ${
              errors.claimerName ? 'border-rose-300' : 'border-bdr'
            }`}
          />
          {errors.claimerName && (
            <p className="text-xs text-rose-600 mt-1">{errors.claimerName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-ink mb-1">
            Email
          </label>
          <Input
            type="email"
            name="claimerEmail"
            value={formData.claimerEmail}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="john@example.com"
            className={`rounded-md border-2 px-3 py-2 text-sm ${
              errors.claimerEmail ? 'border-rose-300' : 'border-bdr'
            }`}
          />
          {errors.claimerEmail && (
            <p className="text-xs text-rose-600 mt-1">{errors.claimerEmail}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-ink mb-1">
            Phone Number (10 digits)
          </label>
          <Input
            type="tel"
            name="claimerPhone"
            value={formData.claimerPhone}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="9876543210"
            className={`rounded-md border-2 px-3 py-2 text-sm ${
              errors.claimerPhone ? 'border-rose-300' : 'border-bdr'
            }`}
          />
          {errors.claimerPhone && (
            <p className="text-xs text-rose-600 mt-1">{errors.claimerPhone}</p>
          )}
        </div>

        {/* Address Line 1 */}
        <div>
          <label className="block text-sm font-semibold text-ink mb-1">
            Address Line 1
          </label>
          <Input
            type="text"
            name="addressLine1"
            value={formData.addressLine1}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="123 Main Street"
            className={`rounded-md border-2 px-3 py-2 text-sm ${
              errors.addressLine1 ? 'border-rose-300' : 'border-bdr'
            }`}
          />
          {errors.addressLine1 && (
            <p className="text-xs text-rose-600 mt-1">{errors.addressLine1}</p>
          )}
        </div>

        {/* Address Line 2 */}
        <div>
          <label className="block text-sm font-semibold text-ink mb-1">
            Address Line 2 (Optional)
          </label>
          <Input
            type="text"
            name="addressLine2"
            value={formData.addressLine2}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Apt 456, Building B"
            className="rounded-md border-2 border-bdr px-3 py-2 text-sm"
          />
        </div>

        {/* City & State Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">
              City
            </label>
            <Input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="New Delhi"
              className={`rounded-md border-2 px-3 py-2 text-sm ${
                errors.city ? 'border-rose-300' : 'border-bdr'
              }`}
            />
            {errors.city && (
              <p className="text-xs text-rose-600 mt-1">{errors.city}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1">
              State
            </label>
            <Input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="DL"
              className={`rounded-md border-2 px-3 py-2 text-sm ${
                errors.state ? 'border-rose-300' : 'border-bdr'
              }`}
            />
            {errors.state && (
              <p className="text-xs text-rose-600 mt-1">{errors.state}</p>
            )}
          </div>
        </div>

        {/* Pincode */}
        <div>
          <label className="block text-sm font-semibold text-ink mb-1">
            Pincode (6 digits)
          </label>
          <Input
            type="text"
            name="pincode"
            value={formData.pincode}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="110001"
            className={`rounded-md border-2 px-3 py-2 text-sm ${
              errors.pincode ? 'border-rose-300' : 'border-bdr'
            }`}
          />
          {errors.pincode && (
            <p className="text-xs text-rose-600 mt-1">{errors.pincode}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-em hover:bg-em-700 text-white font-bold rounded-2xl py-3 disabled:opacity-50 mt-6"
      >
        {isSubmitting ? 'Submitting...' : 'Claim Your Gift'}
      </Button>
    </motion.form>
  );
}
