'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderStore } from '@/store/builder';
import { INDIAN_STATES } from '@/lib/constants';
import { computePricing } from '@giftcraft/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DeliveryFormData {
  recipientName: string;
  companyName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
}

export function Step4Review() {
  const router = useRouter();
  const {
    deliveryMode,
    address,
    delivDate,
    setAddress,
    setDelivDate,
    setCurrentStep,
    products,
    packQuantity,
    packaging,
    addons,
    sleeve,
    shippingZone,
    coupon,
  } = useBuilderStore();

  const [formData, setFormData] = useState<DeliveryFormData>({
    recipientName: address?.name || '',
    companyName: address?.company || '',
    address1: address?.address1 || '',
    address2: address?.address2 || '',
    city: address?.city || '',
    state: address?.state || '',
    pincode: address?.pincode || '',
  });

  const [loading, setLoading] = useState(false);

  // Calculate delivery confidence
  const getDeliveryConfidence = () => {
    if (!delivDate) return null;
    const selectedDate = new Date(delivDate);
    const today = new Date();
    const daysUntil = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 7) return { level: 'tight', color: 'text-red-600', label: 'Very Tight' };
    if (daysUntil < 14) return { level: 'moderate', color: 'text-amber-600', label: 'Moderate' };
    return { level: 'comfortable', color: 'text-green-600', label: 'Comfortable' };
  };

  const handleAddressChange = (field: keyof DeliveryFormData, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setAddress({
      name: updated.recipientName,
      company: updated.companyName,
      address1: updated.address1,
      address2: updated.address2,
      city: updated.city,
      state: updated.state,
      pincode: updated.pincode,
      phone: address?.phone || '',
    });
  };

  const handleDateChange = (date: string) => {
    setDelivDate(date);
  };

  // Calculate pricing for quote creation
  const shippingRatePerPack = deliveryMode === 'single' ? 90 : 140;
  const shippingFlat = shippingRatePerPack * packQuantity;

  const pricing = useMemo(() => {
    const productsForPricing = products.map((p) => ({
      sellPrice: p.sellPrice,
      quantity: p.quantity,
      hsnCode: p.hsnCode || '4820',
      gstRate: p.gstRate || 18,
    }));

    return computePricing({
      products: productsForPricing,
      packagingPerUnit: packaging?.price || 0,
      addonsPerUnit: addons.reduce((sum, a) => sum + a.price, 0) + (sleeve ? 60 : 0),
      packQuantity,
      shippingFlat,
      discount: coupon?.discountAmount || 0,
      sellerStateCode: 'DL',
      buyerStateCode: shippingZone?.stateCode || 'DL',
      razorpayFeePct: 2.36,
      razorpayFeeGstPct: 18,
    });
  }, [products, packQuantity, packaging, addons, sleeve, shippingFlat, coupon, shippingZone]);

  const handleProceedToCheckout = async () => {
    setLoading(true);
    try {
      const quoteRes = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          packQuantity,
          packaging,
          addons,
          sleeve,
          shippingZone,
          pricing,
          deliveryMode,
          discount: coupon?.discountAmount || 0,
        }),
      });

      if (!quoteRes.ok) {
        throw new Error('Failed to create quote');
      }

      const quote = await quoteRes.json();
      router.push(`/checkout?quoteId=${quote.id}`);
    } catch (error) {
      console.error('Error creating quote:', error);
      alert('Failed to proceed. Please try again.');
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const confidence = getDeliveryConfidence();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="overline text-ink-3">STEP 04</p>
        <h2 className="text-3xl font-black mt-1">Review & Order</h2>
      </div>

      {/* Delivery Mode Display */}
      <div className="rounded-gc-l bg-em-50 border-2 border-em-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">
          Delivery Mode
        </p>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-em text-white flex items-center justify-center flex-shrink-0 mt-1">
            ✓
          </div>
          <div>
            <p className="text-sm font-black text-ink">
              {deliveryMode === 'single' ? 'Single Location Shipping' : 'Individual Delivery'}
            </p>
            <p className="text-xs text-ink-3 mt-1">
              {deliveryMode === 'single'
                ? 'All packs delivered to one address'
                : 'Each pack to a different recipient'}
            </p>
          </div>
        </div>
      </div>

      {/* Delivery Address Form */}
      <div className="bg-white rounded-gc-l border-2 border-bdr p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
          Delivery Address
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="text"
            placeholder="Recipient Name *"
            value={formData.recipientName}
            onChange={(e) => handleAddressChange('recipientName', e.target.value)}
            className="rounded-gc"
            required
          />
          <Input
            type="text"
            placeholder="Company Name"
            value={formData.companyName}
            onChange={(e) => handleAddressChange('companyName', e.target.value)}
            className="rounded-gc"
          />
        </div>

        <Input
          type="text"
          placeholder="Address Line 1 *"
          value={formData.address1}
          onChange={(e) => handleAddressChange('address1', e.target.value)}
          className="rounded-gc"
          required
        />

        <Input
          type="text"
          placeholder="Address Line 2 (Optional)"
          value={formData.address2}
          onChange={(e) => handleAddressChange('address2', e.target.value)}
          className="rounded-gc"
        />

        <div className="grid grid-cols-3 gap-2">
          <Input
            type="text"
            placeholder="City *"
            value={formData.city}
            onChange={(e) => handleAddressChange('city', e.target.value)}
            className="rounded-gc"
            required
          />
          <select
            value={formData.state}
            onChange={(e) => handleAddressChange('state', e.target.value)}
            className="rounded-gc border-2 border-bdr px-3 py-2 bg-white text-sm text-ink"
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
              handleAddressChange('pincode', val);
            }}
            className="rounded-gc"
            required
          />
        </div>
      </div>

      {/* Preferred Delivery Date */}
      <div className="bg-white rounded-gc-l border-2 border-bdr p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
          Preferred Delivery Date
        </p>

        <div className="flex items-start gap-4">
          <div className="flex-1">
            <Input
              type="date"
              value={delivDate || ''}
              onChange={(e) => handleDateChange(e.target.value)}
              min={today}
              className="rounded-gc"
            />
            <p className="text-xs text-ink-3 mt-2">Select your preferred delivery date</p>
          </div>

          {confidence && (
            <div className="flex flex-col items-end">
              <div className={`text-xs font-semibold ${confidence.color} mb-1`}>
                {confidence.label}
              </div>
              <div className={`w-12 h-2 rounded-full ${
                confidence.level === 'tight' ? 'bg-red-200' :
                confidence.level === 'moderate' ? 'bg-amber-200' :
                'bg-green-200'
              }`} />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <Button
          onClick={() => setCurrentStep(3)}
          variant="outline"
          className="gap-2 rounded-gc-l"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Delivery
        </Button>
        <Button
          onClick={handleProceedToCheckout}
          disabled={loading || !formData.recipientName || !formData.address1 || !formData.city || !formData.state || !formData.pincode}
          variant="em"
          className="gap-2 rounded-gc-l"
        >
          {loading ? 'Processing...' : 'Next: Review & Quote'}
          {!loading && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
