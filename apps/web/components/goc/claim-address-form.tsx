'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { z } from 'zod';

const addressSchema = z.object({
  claimerName: z.string().min(2, 'Name must be at least 2 characters'),
  claimerEmail: z.string().email('Please enter a valid email'),
  claimerPhone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  addressLine1: z.string().min(3, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
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
      className="bg-emerald-50 rounded-md border-2 border-em-200 p-6 space-y-4"
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
