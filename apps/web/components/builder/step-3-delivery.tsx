'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ShippingZone {
  zoneName: string;
  stateCode: string;
  flatRate: number;
  etaMinDays: number;
  etaMaxDays: number;
}

export function Step3Delivery() {
  const { packQuantity, pincode, setPincode, shippingZone, setShippingZone } = useBuilderStore();
  const [pincodeInput, setPincodeInput] = useState(pincode || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEstimate = async () => {
    if (!pincodeInput || !/^\d{6}$/.test(pincodeInput)) {
      setError('Please enter a valid 6-digit pincode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/shipping/estimate?pincode=${pincodeInput}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to determine delivery zone');
        setShippingZone(null);
        return;
      }

      const zone: ShippingZone = data;
      setShippingZone(zone);
      setPincode(pincodeInput);
    } catch (err) {
      setError('Failed to estimate shipping. Please try again.');
      setShippingZone(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincodeInput(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="overline text-ink-3">STEP 03</p>
        <h2 className="text-3xl font-black mt-1">Delivery Details</h2>
      </div>

      {/* Quantity Confirmation */}
      <div className="rounded-gc-l bg-em-50 border border-em-300 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-em-700 mb-2">
          Your Pack Quantity
        </p>
        <p className="text-2xl font-black text-em-700">
          {packQuantity.toLocaleString()} packs
        </p>
      </div>

      {/* Delivery Estimator */}
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
              onChange={handlePincodeChange}
              maxLength={6}
              className="flex-1 rounded-gc text-center font-semibold text-lg"
            />
            <Button
              onClick={handleEstimate}
              disabled={!pincodeInput || pincodeInput.length !== 6 || loading}
              variant="em"
              className="rounded-gc-l"
            >
              {loading ? 'Checking...' : 'Check'}
            </Button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {shippingZone && (
            <div className="rounded-gc bg-sky-50 border border-sky-200 p-3 space-y-2">
              <div>
                <p className="text-xs text-sky-700 font-semibold">Delivery Zone</p>
                <p className="text-sm font-semibold text-sky-900 mt-1">{shippingZone.zoneName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-sky-600">Shipping Cost</p>
                  <p className="text-lg font-black text-sky-900 mt-1">
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

      {/* Info Box */}
      <div className="rounded-gc bg-blue-50 border border-blue-200 p-4">
        <p className="text-xs font-semibold text-blue-900 mb-1">ℹ️ Shipping Information</p>
        <p className="text-xs text-blue-800 leading-relaxed">
          Flat-rate shipping to your zone. Once you place the order, our team will confirm the exact delivery date based on production timelines.
        </p>
      </div>

      {/* Note */}
      <div className="rounded-gc bg-amber-50 border border-amber-200 p-4">
        <p className="text-xs font-semibold text-amber-900 mb-1">💡 What's Next?</p>
        <p className="text-xs text-amber-800 leading-relaxed">
          In the next step, you'll review your complete order with itemized pricing and place your order.
        </p>
      </div>
    </div>
  );
}
