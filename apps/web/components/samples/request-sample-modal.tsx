'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const addressSchema = z.object({
  addressLine1: z.string().min(3, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

interface RequestSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestSampleModal({
  isOpen,
  onClose,
  onSuccess,
}: RequestSampleModalProps) {
  const [step, setStep] = useState<'search' | 'address'>('search');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [formData, setFormData] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.data || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setStep('address');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    setErrors({});

    const validation = addressSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0];
        if (field) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/sample-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          ...validation.data,
          notes: formData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to request sample');
        return;
      }

      toast.success('Sample request submitted!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('search');
    setSelectedProduct(null);
    setSearchQuery('');
    setSearchResults([]);
    setFormData({
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      notes: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-md border-2 border-bdr max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-bdr sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-ink">Request a Sample</h2>
                <button
                  onClick={handleClose}
                  className="text-ink-2 hover:text-ink transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {step === 'search' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">
                        Search Product
                      </label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Search by name, brand..."
                          value={searchQuery}
                          onChange={handleSearch}
                          className="rounded-md border-2 border-bdr px-3 py-2 pl-10"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          🔍
                        </span>
                      </div>
                    </div>

                    {/* Results */}
                    {searchResults.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {searchResults.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            className="w-full text-left p-3 rounded-md border-2 border-gray-200 hover:border-navy-400 hover:bg-gray-50 transition"
                          >
                            <p className="font-semibold text-ink text-sm">{product.name}</p>
                            <p className="text-xs text-ink-2 mt-1">
                              ₹{product.basePrice}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchQuery && searchResults.length === 0 && !searching && (
                      <div className="text-center py-6">
                        <p className="text-sm text-ink-2">No products found</p>
                      </div>
                    )}

                    {searching && (
                      <div className="text-center py-6">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-navy-800"></div>
                      </div>
                    )}

                    {!searchQuery && (
                      <div className="text-center py-6">
                        <p className="text-sm text-ink-2">Type to search for products</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected Product */}
                    <div className="bg-gray-50 rounded-md border-2 border-gray-200 p-3">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-2">
                        Selected Product
                      </p>
                      <p className="font-bold text-ink">{selectedProduct.name}</p>
                      <button
                        onClick={() => {
                          setStep('search');
                          setSelectedProduct(null);
                        }}
                        className="text-xs text-navy-700 underline hover:text-navy-900 mt-1"
                      >
                        Change
                      </button>
                    </div>

                    {/* Address Form */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-ink mb-1">
                          Address Line 1
                        </label>
                        <Input
                          type="text"
                          name="addressLine1"
                          value={formData.addressLine1}
                          onChange={handleAddressChange}
                          placeholder="123 Main Street"
                          className={`rounded-md border-2 px-3 py-2 text-sm ${
                            errors.addressLine1
                              ? 'border-rose-300'
                              : 'border-bdr'
                          }`}
                        />
                        {errors.addressLine1 && (
                          <p className="text-xs text-rose-600 mt-1">
                            {errors.addressLine1}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-ink mb-1">
                          Address Line 2 (Optional)
                        </label>
                        <Input
                          type="text"
                          name="addressLine2"
                          value={formData.addressLine2}
                          onChange={handleAddressChange}
                          placeholder="Apt 456"
                          className="rounded-md border-2 border-bdr px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-ink mb-1">
                            City
                          </label>
                          <Input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleAddressChange}
                            placeholder="Delhi"
                            className={`rounded-md border-2 px-3 py-2 text-xs ${
                              errors.city ? 'border-rose-300' : 'border-bdr'
                            }`}
                          />
                          {errors.city && (
                            <p className="text-xs text-rose-600 mt-1">
                              {errors.city}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-ink mb-1">
                            State
                          </label>
                          <Input
                            type="text"
                            name="state"
                            value={formData.state}
                            onChange={handleAddressChange}
                            placeholder="DL"
                            className={`rounded-md border-2 px-3 py-2 text-xs ${
                              errors.state ? 'border-rose-300' : 'border-bdr'
                            }`}
                          />
                          {errors.state && (
                            <p className="text-xs text-rose-600 mt-1">
                              {errors.state}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-ink mb-1">
                          Pincode (6 digits)
                        </label>
                        <Input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleAddressChange}
                          placeholder="110001"
                          className={`rounded-md border-2 px-3 py-2 text-sm ${
                            errors.pincode ? 'border-rose-300' : 'border-bdr'
                          }`}
                        />
                        {errors.pincode && (
                          <p className="text-xs text-rose-600 mt-1">
                            {errors.pincode}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-ink mb-1">
                          Notes (Optional)
                        </label>
                        <Input
                          type="text"
                          name="notes"
                          value={formData.notes}
                          onChange={handleAddressChange}
                          placeholder="Any special requests?"
                          className="rounded-md border-2 border-bdr px-3 py-2 text-sm"
                        />
                      </div>

                      {/* Buttons */}
                      <div className="space-y-2 pt-4">
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="w-full bg-em hover:bg-em-700 text-white font-bold rounded-2xl py-2 disabled:opacity-50"
                        >
                          {submitting ? 'Submitting...' : 'Request Sample'}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setStep('search')}
                          variant="outline"
                          className="w-full border-bdr rounded-2xl font-bold"
                        >
                          Back
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
