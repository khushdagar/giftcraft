'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { INDIAN_STATES } from '@/lib/constants';
import { computeOrderShipping, perPackWeightKg, perPackVolumetricKg } from '@/lib/shipping';
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

  // Persist the address to the store on every change so it survives step
  // navigation / reload and flows into the quote — no manual "Save" needed.
  const updateAddress = (patch: Partial<typeof formAddress>) => {
    setFormAddress((prev) => {
      const next = { ...prev, ...patch };
      setAddress(next);
      return next;
    });
  };

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

  // Estimated delivery — auto-calculated, not chosen by the customer:
  //   max product (vendor) lead time + packaging buffer + shipping ETA.
  // The shipping leg uses the resolved zone's REAL ETA (etaMin/etaMax by pincode)
  // once a pincode is entered; before that it falls back to a default range.
  const PACKAGING_DAYS = 4;
  const DEFAULT_SHIPPING_MIN = 4;
  const DEFAULT_SHIPPING_MAX = 7;
  const maxLeadTimeDays = products.length
    ? Math.max(...products.map((p) => p.leadTimeDays || 14))
    : 14;
  const shippingMinDays = shippingZone?.etaMinDays ?? DEFAULT_SHIPPING_MIN;
  const shippingMaxDays = shippingZone?.etaMaxDays ?? DEFAULT_SHIPPING_MAX;
  const totalDaysMin = maxLeadTimeDays + PACKAGING_DAYS + shippingMinDays;
  const totalDaysMax = maxLeadTimeDays + PACKAGING_DAYS + shippingMaxDays;

  const { minDate, maxDate } = useMemo(() => {
    const min = new Date();
    min.setDate(min.getDate() + totalDaysMin);
    const max = new Date();
    max.setDate(max.getDate() + totalDaysMax);
    return { minDate: min, maxDate: max };
  }, [totalDaysMin, totalDaysMax]);

  // Date window. Commit the conservative (latest) date to the order.
  const committedDeliveryStr = maxDate.toISOString().split('T')[0];
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  const formattedEstimate =
    totalDaysMin === totalDaysMax
      ? fmtDate(maxDate)
      : `${fmtDate(minDate)} – ${fmtDate(maxDate)}`;

  // Persist the committed estimate into the store so it flows into the quote/order
  useEffect(() => {
    if (committedDeliveryStr && delivDate !== committedDeliveryStr) {
      setDelivDate(committedDeliveryStr);
    }
  }, [committedDeliveryStr, delivDate, setDelivDate]);

  const runEstimate = async (pin: string) => {
    setLoadingShipping(true);
    setShippingError(null);

    try {
      const totalWeightKg = perPackWeightKg(
        products.map((p) => ({ weightG: p.weightG, quantity: 1 })),
      ) * packQuantity;
      // Volumetric weight (L×W×H/5000) — couriers bill the greater of this and
      // dead weight, so send it too or bulky-but-light packs are undercharged.
      const totalVolumetricKg = perPackVolumetricKg(
        products.map((p) => ({
          dimensionL: p.dimensionL,
          dimensionW: p.dimensionW,
          dimensionH: p.dimensionH,
          quantity: 1,
        })),
      ) * packQuantity;
      const subtotal = products.reduce((s, p) => s + (Number(p.sellPrice) || 0), 0) * packQuantity;
      const params = new URLSearchParams({
        pincode: pin,
        weightKg: String(totalWeightKg),
        volumetricKg: String(totalVolumetricKg),
        packQuantity: String(packQuantity),
        subtotal: String(subtotal),
        mode: deliveryMode,
      });
      const res = await fetch(`/api/shipping/estimate?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setShippingError(data.error || 'Unable to determine delivery zone');
        setShippingZone(null);
        return;
      }

      setShippingZone(data);
      setPincode(pin);
    } catch (err) {
      setShippingError('Failed to estimate shipping. Please try again.');
      setShippingZone(null);
    } finally {
      setLoadingShipping(false);
    }
  };

  const handleEstimateShipping = () => {
    if (!pincodeInput || !/^\d{6}$/.test(pincodeInput)) {
      setShippingError('Please enter a valid 6-digit pincode');
      return;
    }
    runEstimate(pincodeInput);
  };

  // Re-quote the live courier rate when the delivery mode changes after a
  // pincode has already been checked (single vs individual ship differently).
  useEffect(() => {
    if (pincode && /^\d{6}$/.test(pincode)) {
      runEstimate(pincode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryMode]);

  // Auto-fetch the live courier rate from the delivery ADDRESS pincode (single
  // delivery) so the charge reflects the customer's real address without a
  // separate "Check" step. Runs once per valid 6-digit pincode.
  useEffect(() => {
    if (deliveryMode !== 'single') return;
    const pin = formAddress.pincode;
    if (/^\d{6}$/.test(pin) && pin !== pincode && !loadingShipping) {
      runEstimate(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formAddress.pincode, deliveryMode]);

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

        // Skip header, parse data rows and filter invalid rows
        const allRecipients = lines.slice(1).map((line) => {
          const [name, email, phone, address] = line.split(',').map((v) => v.trim());
          return { name, email, phone, address };
        });

        // Filter and cast to ensure name and address are non-empty strings
        const recipients = allRecipients.filter(
          (r): r is { name: string; email: string | undefined; phone: string | undefined; address: string } =>
            r.name !== '' && r.address !== ''
        );

        if (recipients.length === 0) {
          setCsvError('No valid recipients found. Ensure each row has Name and Address columns.');
          return;
        }

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

  // Shipping charge: prefer the quoted cost from the estimate API (Shiprocket
  // real-time courier rate, or zone fallback). Recompute locally only as a
  // safety net before a pincode has been checked.
  // Billable per-pack weight = greater of dead weight and volumetric weight,
  // matching how the courier (and the estimate API) actually charges.
  const perPackKg = Math.max(
    perPackWeightKg(products.map((p) => ({ weightG: p.weightG, quantity: 1 }))),
    perPackVolumetricKg(
      products.map((p) => ({
        dimensionL: p.dimensionL,
        dimensionW: p.dimensionW,
        dimensionH: p.dimensionH,
        quantity: 1,
      })),
    ),
  );
  const localCalc = computeOrderShipping({
    products: products.map((p) => ({
      weightG: p.weightG,
      quantity: 1,
      sellPrice: p.sellPrice,
      dimensionL: p.dimensionL,
      dimensionW: p.dimensionW,
      dimensionH: p.dimensionH,
    })),
    zone: shippingZone,
    packQuantity,
    deliveryMode,
  });
  const totalDeliveryCharge = shippingZone?.shippingCost ?? localCalc.shippingCost;
  const deliveryRatePerPack = shippingZone?.perPackCost ?? localCalc.perPackCost;
  // The delivery charge is only known once a pincode has been resolved into a
  // real courier/zone rate. Until then we show no amount (no default fallback).
  const hasRate = !!shippingZone;
  const courierName = shippingZone?.courierName ?? null;

  // Live address validation (single-location delivery). Mirrors the Step 4 gate
  // so any problem — e.g. a 5-digit pincode — is shown here, not silently failed.
  const pincodeInvalid =
    formAddress.pincode.length > 0 && !/^\d{6}$/.test(formAddress.pincode);
  const addressMissing: string[] = [];
  if (!formAddress.name.trim()) addressMissing.push('Name');
  if (!formAddress.address1.trim()) addressMissing.push('Address Line 1');
  if (!formAddress.city.trim()) addressMissing.push('City');
  if (!formAddress.state) addressMissing.push('State');
  if (!/^\d{6}$/.test(formAddress.pincode)) addressMissing.push('a 6-digit Pincode');
  if (!formAddress.phone.trim()) addressMissing.push('Phone');
  const addressComplete = addressMissing.length === 0;

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
            className={`rounded-md border-2 p-4 text-left transition ${
              deliveryMode === 'single'
                ? 'border-em bg-em-50'
                : 'border-bdr hover:border-em-300 bg-white'
            }`}
          >
            <p className={`font-semibold ${deliveryMode === 'single' ? 'text-em-700' : 'text-ink'}`}>
              Single Location
            </p>
            <p className={`text-xs mt-1 ${deliveryMode === 'single' ? 'text-em-600' : 'text-ink-3'}`}>
              Deliver all {packQuantity} packs to one address · one consolidated shipment
            </p>
          </button>

          {/* Individual Delivery */}
          <button
            onClick={() => setDeliveryMode('individual')}
            className={`rounded-md border-2 p-4 text-left transition ${
              deliveryMode === 'individual'
                ? 'border-em bg-em-50'
                : 'border-bdr hover:border-em-300 bg-white'
            }`}
          >
            <p className={`font-semibold ${deliveryMode === 'individual' ? 'text-em-700' : 'text-ink'}`}>
              Individual Delivery
            </p>
            <p className={`text-xs mt-1 ${deliveryMode === 'individual' ? 'text-em-600' : 'text-ink-3'}`}>
              Deliver to multiple recipients · each pack ships separately
            </p>
          </button>
        </div>
      </div>

      {/* Section C: Pincode Estimator */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          Delivery Location
        </p>
        <div className="rounded-md border-2 border-bdr bg-white p-4 space-y-3">
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
                className="rounded-md text-center font-semibold"
              />
            </div>
            <Button
              onClick={handleEstimateShipping}
              disabled={!pincodeInput || pincodeInput.length !== 6 || loadingShipping}
              variant="em"
              className="rounded-md flex-shrink-0"
              size="sm"
            >
              {loadingShipping ? 'Checking...' : 'Check'}
            </Button>
          </div>

          {shippingError && <p className="text-xs text-red-600">{shippingError}</p>}

          {shippingZone && (
            <p className="text-xs text-em">✓ Delivery available to this pincode.</p>
          )}
        </div>
      </div>

      {/* Address Form - Single Delivery */}
      {deliveryMode === 'single' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Delivery Address
          </p>
          <div className="rounded-md border-2 border-bdr bg-white p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Name *"
                value={formAddress.name}
                onChange={(e) => updateAddress({ name: e.target.value })}
                className="rounded-md border-2"
              />
              <Input
                placeholder="Company (optional)"
                value={formAddress.company}
                onChange={(e) => updateAddress({ company: e.target.value })}
                className="rounded-md border-2"
              />
            </div>

            <Input
              placeholder="Address Line 1 *"
              value={formAddress.address1}
              onChange={(e) => updateAddress({ address1: e.target.value })}
              className="rounded-md border-2"
            />

            <Input
              placeholder="Address Line 2 (optional)"
              value={formAddress.address2}
              onChange={(e) => updateAddress({ address2: e.target.value })}
              className="rounded-md border-2"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="City *"
                value={formAddress.city}
                onChange={(e) => updateAddress({ city: e.target.value })}
                className="rounded-md border-2"
              />
              <select
                value={formAddress.state}
                onChange={(e) => updateAddress({ state: e.target.value })}
                className="rounded-md border-2 border-bdr px-3 py-2 bg-white"
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
              <div>
                <Input
                  placeholder="Pincode (6 digits) *"
                  value={formAddress.pincode}
                  maxLength={6}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    updateAddress({ pincode: val });
                  }}
                  className={`rounded-md border-2 ${pincodeInvalid ? 'border-red-400' : ''}`}
                />
                {pincodeInvalid && (
                  <p className="mt-1 text-xs text-red-600">
                    Pincode must be exactly 6 digits.
                  </p>
                )}
              </div>
              <Input
                placeholder="Phone *"
                value={formAddress.phone}
                onChange={(e) => updateAddress({ phone: e.target.value })}
                className="rounded-md border-2"
              />
            </div>

            {/* Live status so the customer always knows if the address is usable */}
            {addressComplete ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-em-700">
                <CheckCircle className="h-3.5 w-3.5" /> Address complete — saved automatically.
              </p>
            ) : (
              <p className="text-xs text-amber-700">
                Still needed to continue: {addressMissing.join(', ')}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delivery Charge — only shown once a pincode resolves to a live rate */}
      <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
        <p className="text-xs font-semibold text-amber-700 mb-1">Delivery Charge</p>
        {hasRate ? (
          <>
            <p className="text-sm font-black text-amber-900 tabnum">
              {formatRupees(totalDeliveryCharge)}
              <span className="font-medium text-amber-700">
                {' '}({(perPackKg * packQuantity).toFixed(2)} kg{courierName ? ` · via ${courierName}` : ''})
              </span>
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {deliveryMode === 'single'
                ? `All ${packQuantity} packs delivered to a single location.`
                : `Each pack ships separately to a different recipient (≈${formatRupees(deliveryRatePerPack)}/pack).`}
            </p>
          </>
        ) : (
          <p className="text-sm text-amber-700">
            {loadingShipping
              ? 'Calculating delivery charge…'
              : 'Enter your delivery pincode to see the courier charge.'}
          </p>
        )}
      </div>

      {/* Section D: Individual Recipients CSV Upload */}
      {deliveryMode === 'individual' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Recipients List
          </p>
          <div className="rounded-md border-2 border-bdr bg-white p-4 space-y-3">
            <div className="text-xs text-ink-3 mb-3">
              <p className="font-semibold mb-2">CSV Format: Name,Email,Phone,Address</p>
              <p className="text-[10px]">Example:</p>
              <code className="text-[10px] bg-gray-100 p-2 rounded block">
                Raj Kumar,raj@company.com,9876543210,123 Main St
              </code>
            </div>

            <label className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-bdr bg-elevated p-8 cursor-pointer hover:border-em transition">
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
              <div className="rounded-md bg-green-50 border border-green-200 p-3 flex items-start gap-2">
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

      {/* Estimated Delivery Date — auto-calculated from lead times */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          Estimated Delivery
        </p>
        <div className="rounded-md border-2 border-bdr bg-white p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-em flex-shrink-0" />
            <div>
              <p className="text-xs text-ink-3">Your estimated delivery date</p>
              <p className="text-base font-black text-ink mt-0.5">{formattedEstimate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
        <p className="text-xs font-semibold text-blue-900 mb-1">ℹ️ What's Next?</p>
        <p className="text-xs text-blue-800 leading-relaxed">
          In the final step, you'll review your complete order with itemized pricing and place your order.
        </p>
      </div>
    </div>
  );
}
