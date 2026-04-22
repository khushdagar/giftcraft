'use client';

import React, { useState, useReducedMotion, useEffect } from 'react';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, X } from 'lucide-react';

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
  } = useBuilderStore();

  const [pincodeInput, setPincodeInput] = useState(pincode || '');
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

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

  const handleQuantityChange = (newQty: number) => {
    const min = Math.max(1, tiers[0]?.minQty || 1);
    setPackQuantity(Math.max(min, newQty));
  };

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

    setCsvFile(file);
    setCsvError(null);
    // TODO: Parse and validate CSV
  };

  const individualSurcharge = packQuantity * 50;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="overline text-ink-3">STEP 03</p>
        <h2 className="text-3xl font-black mt-1">Delivery Details</h2>
      </div>

      {/* Section A: Quantity + Tier Cards */}
      {tiers.length > 0 && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">
              Quantity & Pricing Tiers
            </p>

            {/* Quantity input */}
            <div className="rounded-gc-l border-2 border-bdr bg-white p-5 mb-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handleQuantityChange(packQuantity - 10)}
                  disabled={packQuantity <= (tiers[0]?.minQty || 1)}
                  variant="outline"
                  size="sm"
                  className="rounded-gc-p"
                >
                  −10
                </Button>
                <Input
                  type="number"
                  value={packQuantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || packQuantity)}
                  className="flex-1 text-center font-black text-2xl rounded-gc"
                  min="1"
                />
                <Button
                  onClick={() => handleQuantityChange(packQuantity + 10)}
                  variant="outline"
                  size="sm"
                  className="rounded-gc-p"
                >
                  +10
                </Button>
                <Button
                  onClick={() => handleQuantityChange(packQuantity + 50)}
                  variant="outline"
                  size="sm"
                  className="rounded-gc-p"
                >
                  +50
                </Button>
              </div>
              <p className="text-xs text-ink-2 mt-2">packs total</p>
            </div>

            {/* Tier cards grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {tiers.map((tier) => {
                const isActive =
                  packQuantity >= tier.minQty &&
                  (tier.maxQty === null || packQuantity <= tier.maxQty);

                return (
                  <div
                    key={tier.tier}
                    className={`rounded-gc border-2 p-4 transition ${
                      isActive
                        ? 'bg-gold-50 border-gold border-l-4 border-l-gold'
                        : 'bg-elevated border-bdr'
                    }`}
                  >
                    {isActive && (
                      <Badge variant="gold" className="mb-2">
                        YOUR TIER
                      </Badge>
                    )}
                    <p className={`text-sm font-semibold ${isActive ? 'text-gold-700' : 'text-ink'}`}>
                      Tier {tier.tier}
                    </p>
                    <p className={`text-xs ${isActive ? 'text-gold-600' : 'text-ink-3'} mt-1`}>
                      {tier.minQty.toLocaleString()}
                      {tier.maxQty ? ` – ${tier.maxQty.toLocaleString()}` : '+ packs'}
                    </p>
                    <p
                      className={`text-lg font-black tabnum mt-3 ${
                        isActive ? 'text-gold-700' : 'text-ink'
                      }`}
                    >
                      <AnimatedNumber
                        value={tier.sellPrice}
                        formatter={(n) => formatRupees(n)}
                      />
                      <span className="text-xs">/pack</span>
                    </p>

                    {/* Savings vs tier 1 */}
                    {tier.tier > 1 && tiers[0] && tier.sellPrice < tiers[0].sellPrice && (
                      <Badge
                        variant="gold"
                        className="mt-2 text-[10px]"
                      >
                        Save {formatRupees(tiers[0].sellPrice - tier.sellPrice)}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
              Deliver all {packQuantity} packs to one address
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
              +₹50/pack · Deliver to multiple recipients
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
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter pincode"
              value={pincodeInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPincodeInput(val);
              }}
              maxLength={6}
              className="flex-1 rounded-gc text-center font-semibold text-lg"
            />
            <Button
              onClick={handleEstimateShipping}
              disabled={!pincodeInput || pincodeInput.length !== 6 || loadingShipping}
              variant="em"
              className="rounded-gc-l"
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

      {/* Individual Delivery Surcharge Note */}
      {deliveryMode === 'individual' && (
        <div className="rounded-gc bg-amber-50 border border-amber-200 p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">Individual Delivery Surcharge</p>
          <p className="text-sm font-black text-amber-900 tabnum">
            +{formatRupees(individualSurcharge)}
          </p>
          <p className="text-xs text-amber-600 mt-1">
            ₹50 per pack for individual recipient deliveries
          </p>
        </div>
      )}

      {/* Section D: Individual Recipients CSV Upload */}
      {deliveryMode === 'individual' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Recipients List
          </p>
          <div className="rounded-gc-l border-2 border-bdr bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <a
                href="#"
                className="text-sm font-semibold text-em hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: Generate and download CSV template
                  alert('CSV template download coming soon');
                }}
              >
                Download CSV Template
              </a>
            </div>

            <label className="flex flex-col items-center justify-center rounded-gc border-2 border-dashed border-bdr bg-elevated p-8 cursor-pointer hover:border-em transition">
              <Upload className="h-6 w-6 text-ink-3 mb-2" />
              <p className="text-sm font-semibold text-ink-2">
                {csvFile ? csvFile.name : 'Upload recipients CSV'}
              </p>
              <p className="text-xs text-ink-3 mt-1">Name • Email • Phone • Address required</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </label>

            {csvError && <p className="text-xs text-red-600">{csvError}</p>}
            {csvFile && (
              <button
                onClick={() => setCsvFile(null)}
                className="text-xs text-ink-3 hover:text-red-600 flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear file
              </button>
            )}
          </div>
        </div>
      )}

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
