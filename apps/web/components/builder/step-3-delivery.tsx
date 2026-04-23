'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { INDIAN_STATES, DELIVERY_RATES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';

interface PriceTier {
  tier: number;
  minQty: number;
  maxQty: number | null;
  sellPrice: number;
}

// AnimatedNumber component (copy pattern from pricing-block.tsx)
function AnimatedNumber({
  value,
  formatter = (n: number) => n.toString(),
}: {
  value: number;
  formatter?: (n: number) => string;
}) {
  const reduce = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);

  // Animate when value changes
  useEffect(() => {
    if (reduce) {
      setDisplayValue(value);
      return;
    }

    const start = value - displayValue;
    if (Math.abs(start) < 1) {
      setDisplayValue(value);
      return;
    }

    const duration = 400;
    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      setDisplayValue(Math.round(displayValue + start * eased));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, displayValue, reduce]);

  return <>{formatter(displayValue)}</>;
}

export function Step3Delivery() {
  const {
    packQuantity,
    setPackQuantity,
    products,
    deliveryMode,
    setDeliveryMode,
    pincode,
    setPincode,
    shippingZone,
    setShippingZone,
    address,
    setAddress,
    csvRecipients,
    setCsvRecipients,
    csvRecipientCount,
    setCsvRecipientCount,
    delivDate,
    setDelivDate,
  } = useBuilderStore();

  const [pincodeInput, setPincodeInput] = useState(pincode || '');
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Address form state (single delivery)
  const [formAddress, setFormAddress] = useState(
    address || { name: '', company: '', address1: '', address2: '', city: '', state: '', pincode: '', phone: '' }
  );
  const [addressError, setAddressError] = useState<string | null>(null);

  // Calculate tier pricing from products
  const allTiers: PriceTier[] = [];
  products.forEach((p) => {
    if (p.priceTiers) {
      p.priceTiers.forEach((tier) => {
        if (!allTiers.find((t) => t.tier === tier.tier)) {
          allTiers.push(tier);
        }
      });
    }
  });

  const tiers = allTiers.sort((a, b) => a.tier - b.tier);
  const activeTier = tiers.find(
    (t) => packQuantity >= t.minQty && (t.maxQty === null || packQuantity <= t.maxQty)
  );

  // Calculate next tier and nudge
  const nextTier = useMemo(() => {
    const activeIdx = tiers.findIndex((t) => t === activeTier);
    return activeIdx >= 0 && activeIdx < tiers.length - 1 ? tiers[activeIdx + 1] : null;
  }, [activeTier, tiers]);

  const nextTierGap = useMemo(() => {
    if (!nextTier) return null;
    return nextTier.minQty - packQuantity;
  }, [nextTier, packQuantity]);

  const shouldShowNudge = nextTierGap && nextTierGap > 0 && nextTierGap <= 5;

  const handleQuantityChange = (newQty: number) => {
    const min = Math.max(1, tiers[0]?.minQty || 1);
    setPackQuantity(Math.max(min, newQty));
  };

  // Delivery date helper
  const today = new Date().toISOString().split('T')[0];
  const maxLeadTimeDays = Math.max(...products.map((p) => p.leadTimeDays || 14));
  // Allow selection up to 90 days in the future (production window + buffer)
  const allowedDeliveryDays = Math.max(maxLeadTimeDays, 90);
  const maxDeliveryDate = new Date();
  maxDeliveryDate.setDate(maxDeliveryDate.getDate() + allowedDeliveryDays);
  const maxDeliveryDateStr = maxDeliveryDate.toISOString().split('T')[0];

  // Confidence indicator for delivery date
  const deliveryConfidence = useMemo(() => {
    if (!delivDate) return null;
    const selectedDate = new Date(delivDate);
    const daysUntil = Math.ceil((selectedDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    // Minimum 3 weeks (21 days) needed for: 1-2 days mockup creation + 1-2 days approval + production time
    if (daysUntil < 21) return 'impossible'; // too soon (less than 3 weeks)
    if (daysUntil <= maxLeadTimeDays + 7) return 'high'; // plenty of time
    if (daysUntil <= maxLeadTimeDays + 14) return 'medium'; // within range
    return 'low'; // risky but possible
  }, [delivDate, maxLeadTimeDays]);

  // Validate address form
  const isAddressValid = useMemo(() => {
    if (deliveryMode !== 'single') return true;
    return (
      formAddress.name.trim() &&
      formAddress.address1.trim() &&
      formAddress.city.trim() &&
      formAddress.state &&
      formAddress.pincode.trim() &&
      /^\d{6}$/.test(formAddress.pincode)
    );
  }, [formAddress, deliveryMode]);

  const handleEstimateShipping = async () => {
    if (!pincodeInput || !/^\d{6}$/.test(pincodeInput)) {
      setShippingError('Please enter a valid 6-digit pincode');
      return;
    }

    setLoadingShipping(true);
    setShippingError(null);

    try {
      const res = await fetch(`/api/shipping/estimate?pincode=${pincodeInput}`);
      const data = await res.json();

      if (!res.ok) {
        setShippingError(data.error || 'Unable to determine delivery zone');
        setShippingZone(null);
        return;
      }

      setShippingZone(data);
      setPincode(pincodeInput);
    } catch (err) {
      setShippingError('Failed to estimate shipping. Please try again.');
      setShippingZone(null);
    } finally {
      setLoadingShipping(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setCsvError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.trim().split('\n');

        if (lines.length < 2) {
          setCsvError('CSV must have at least a header and one recipient row');
          return;
        }

        // Skip header, parse data rows
        const recipients = lines.slice(1).map((line) => {
          const [name, email, phone, address] = line.split(',').map((v) => v.trim());
          return { name, email, phone, address };
        });

        setCsvRecipients(recipients);
        setCsvRecipientCount(recipients.length);
        setCsvFile(file);
        setCsvError(null);
      } catch (err) {
        setCsvError('Failed to parse CSV. Please check the format.');
      }
    };

    reader.readAsText(file);
  };

  // Delivery rate per pack based on mode
  const deliveryRatePerPack = deliveryMode === 'single' ? DELIVERY_RATES.single : DELIVERY_RATES.individual;
  const totalDeliveryCharge = deliveryRatePerPack * packQuantity;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="overline text-ink-3">STEP 03</p>
        <h2 className="text-3xl font-black mt-1">Delivery Details</h2>
      </div>

      {/* Section B: Delivery Mode Selection */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          Delivery Method
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Single Location */}
          <button
            onClick={() => setDeliveryMode('single')}
            className={`rounded-gc border-2 p-4 text-left transition ${
              deliveryMode === 'single'
                ? 'border-em bg-em-50'
                : 'border-bdr hover:border-em-300 bg-white'
            }`}
          >
            <p className={`font-semibold ${deliveryMode === 'single' ? 'text-em-700' : 'text-ink'}`}>
              Single Location
            </p>
            <p className={`text-xs mt-1 ${deliveryMode === 'single' ? 'text-em-600' : 'text-ink-3'}`}>
              Deliver all {packQuantity} packs to one address · ₹{DELIVERY_RATES.single}/pack
            </p>
          </button>

          {/* Individual Delivery */}
          <button
            onClick={() => setDeliveryMode('individual')}
            className={`rounded-gc border-2 p-4 text-left transition ${
              deliveryMode === 'individual'
                ? 'border-em bg-em-50'
                : 'border-bdr hover:border-em-300 bg-white'
            }`}
          >
            <p className={`font-semibold ${deliveryMode === 'individual' ? 'text-em-700' : 'text-ink'}`}>
              Individual Delivery
            </p>
            <p className={`text-xs mt-1 ${deliveryMode === 'individual' ? 'text-em-600' : 'text-ink-3'}`}>
              Deliver to multiple recipients · ₹{DELIVERY_RATES.individual}/pack
            </p>
          </button>
        </div>
      </div>

      {/* Section C: Pincode Estimator */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          Delivery Location
        </p>
        <div className="rounded-gc-l border-2 border-bdr bg-white p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <div className="max-w-xs flex-1">
              <Input
                type="text"
                placeholder="Enter pincode"
                value={pincodeInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPincodeInput(val);
                }}
                maxLength={6}
                className="rounded-gc text-center font-semibold"
              />
            </div>
            <Button
              onClick={handleEstimateShipping}
              disabled={!pincodeInput || pincodeInput.length !== 6 || loadingShipping}
              variant="em"
              className="rounded-gc-l flex-shrink-0"
              size="sm"
            >
              {loadingShipping ? 'Checking...' : 'Check'}
            </Button>
          </div>

          {shippingError && <p className="text-xs text-red-600">{shippingError}</p>}

          {shippingZone && (
            <div className="rounded-gc bg-sky-50 border border-sky-200 p-3 space-y-2">
              <div>
                <p className="text-xs text-sky-700 font-semibold">Delivery Zone</p>
                <p className="text-sm font-semibold text-sky-900 mt-1">{shippingZone.zoneName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-sky-600">Shipping</p>
                  <p className="text-lg font-black text-sky-900 mt-1 tabnum">
                    {formatRupees(shippingZone.flatRate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-sky-600">Delivery in</p>
                  <p className="text-lg font-black text-sky-900 mt-1">
                    {shippingZone.etaMinDays}–{shippingZone.etaMaxDays} days
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Address Form - Single Delivery */}
      {deliveryMode === 'single' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Delivery Address
          </p>
          <div className="rounded-gc-l border-2 border-bdr bg-white p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Name *"
                value={formAddress.name}
                onChange={(e) => setFormAddress({ ...formAddress, name: e.target.value })}
                className="rounded-gc border-2"
              />
              <Input
                placeholder="Company (optional)"
                value={formAddress.company}
                onChange={(e) => setFormAddress({ ...formAddress, company: e.target.value })}
                className="rounded-gc border-2"
              />
            </div>

            <Input
              placeholder="Address Line 1 *"
              value={formAddress.address1}
              onChange={(e) => setFormAddress({ ...formAddress, address1: e.target.value })}
              className="rounded-gc border-2"
            />

            <Input
              placeholder="Address Line 2 (optional)"
              value={formAddress.address2}
              onChange={(e) => setFormAddress({ ...formAddress, address2: e.target.value })}
              className="rounded-gc border-2"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="City *"
                value={formAddress.city}
                onChange={(e) => setFormAddress({ ...formAddress, city: e.target.value })}
                className="rounded-gc border-2"
              />
              <select
                value={formAddress.state}
                onChange={(e) => setFormAddress({ ...formAddress, state: e.target.value })}
                className="rounded-gc border-2 border-bdr px-3 py-2 bg-white"
              >
                <option value="">Select State *</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Pincode (6 digits) *"
                value={formAddress.pincode}
                maxLength={6}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setFormAddress({ ...formAddress, pincode: val });
                }}
                className="rounded-gc border-2"
              />
              <Input
                placeholder="Phone *"
                value={formAddress.phone}
                onChange={(e) => setFormAddress({ ...formAddress, phone: e.target.value })}
                className="rounded-gc border-2"
              />
            </div>

            {addressError && <p className="text-xs text-red-600">{addressError}</p>}

            <Button
              onClick={() => {
                if (isAddressValid) {
                  setAddress(formAddress);
                  setAddressError(null);
                } else {
                  setAddressError('Please fill all required fields correctly');
                }
              }}
              variant="em"
              className="w-full rounded-gc-l"
            >
              Save Address
            </Button>
          </div>
        </div>
      )}

      {/* Delivery Charge Note */}
      <div className="rounded-gc bg-amber-50 border border-amber-200 p-4">
        <p className="text-xs font-semibold text-amber-700 mb-1">Delivery Charge</p>
        <p className="text-sm font-black text-amber-900 tabnum">
          {formatRupees(totalDeliveryCharge)} ({deliveryMode === 'single' ? DELIVERY_RATES.single : DELIVERY_RATES.individual}/pack × {packQuantity})
        </p>
        <p className="text-xs text-amber-600 mt-1">
          {deliveryMode === 'single'
            ? 'All packs delivered to single location'
            : 'Individual delivery to multiple recipients'}
        </p>
      </div>

      {/* Section D: Individual Recipients CSV Upload */}
      {deliveryMode === 'individual' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Recipients List
          </p>
          <div className="rounded-gc-l border-2 border-bdr bg-white p-4 space-y-3">
            <div className="text-xs text-ink-3 mb-3">
              <p className="font-semibold mb-2">CSV Format: Name,Email,Phone,Address</p>
              <p className="text-[10px]">Example:</p>
              <code className="text-[10px] bg-gray-100 p-2 rounded block">
                Raj Kumar,raj@company.com,9876543210,123 Main St
              </code>
            </div>

            <label className="flex flex-col items-center justify-center rounded-gc border-2 border-dashed border-bdr bg-elevated p-8 cursor-pointer hover:border-em transition">
              <Upload className="h-6 w-6 text-ink-3 mb-2" />
              <p className="text-sm font-semibold text-ink-2">
                {csvFile ? csvFile.name : 'Upload recipients CSV'}
              </p>
              <p className="text-xs text-ink-3 mt-1">One recipient per row</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </label>

            {csvError && <p className="text-xs text-red-600">{csvError}</p>}
            {csvFile && csvRecipientCount > 0 && (
              <div className="rounded-gc bg-green-50 border border-green-200 p-3 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-green-700">{csvRecipientCount} recipients detected</p>
                  <p className="text-xs text-green-600 mt-1">Ready to proceed with individual deliveries</p>
                </div>
              </div>
            )}
            {csvFile && (
              <button
                onClick={() => {
                  setCsvFile(null);
                  setCsvRecipients(null);
                  setCsvRecipientCount(0);
                  setCsvError(null);
                }}
                className="text-xs text-ink-3 hover:text-red-600 flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear file
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delivery Date & Confidence Indicator */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          Preferred Delivery Date
        </p>
        <div className="rounded-gc-l border-2 border-bdr bg-white p-4 space-y-3">
          <Input
            type="date"
            value={delivDate || ''}
            onChange={(e) => setDelivDate(e.target.value)}
            min={today}
            max={maxDeliveryDateStr}
            className="rounded-gc border-2"
          />

          {delivDate && (
            <div
              className={`rounded-gc p-3 flex items-start gap-3 border-2 ${
                deliveryConfidence === 'high'
                  ? 'bg-green-50 border-green-200'
                  : deliveryConfidence === 'medium'
                  ? 'bg-yellow-50 border-yellow-200'
                  : deliveryConfidence === 'impossible'
                  ? 'bg-red-100 border-red-400'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {deliveryConfidence === 'impossible' && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-700">❌ Not possible</p>
                    <p className="text-xs text-red-600 mt-1">Too tight! Choose a date at least 2-3 weeks away</p>
                  </div>
                </>
              )}
              {deliveryConfidence === 'high' && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-green-700">✓ High confidence</p>
                    <p className="text-xs text-green-600 mt-1">Plenty of time for production & delivery</p>
                  </div>
                </>
              )}
              {deliveryConfidence === 'medium' && (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-yellow-700">⚠️ Doable but tight</p>
                    <p className="text-xs text-yellow-600 mt-1">Within production timeline, limited buffer</p>
                  </div>
                </>
              )}
              {deliveryConfidence === 'low' && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-700">🔴 Risky deadline</p>
                    <p className="text-xs text-red-600 mt-1">May require expedited production (additional cost)</p>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-xs text-ink-3">
            Production window: {maxLeadTimeDays} days max
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-gc bg-blue-50 border border-blue-200 p-4">
        <p className="text-xs font-semibold text-blue-900 mb-1">ℹ️ What's Next?</p>
        <p className="text-xs text-blue-800 leading-relaxed">
          In the final step, you'll review your complete order with itemized pricing and place your order.
        </p>
      </div>
    </div>
  );
}
