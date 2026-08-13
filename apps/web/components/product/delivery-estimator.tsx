'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck, AlertCircle, CalendarCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatRupees } from '@/lib/utils';
import { deliveryWindowDays } from '@/lib/shipping';

interface ShippingEstimate {
  zoneName: string;
  stateCode: string;
  ratePerKg: number;
  minCharge: number;
  flatRate: number;
  etaMinDays: number;
  etaMaxDays: number;
}

// The product's vendor lead time feeds the date estimate: order today →
// production + assembly/QC + courier transit → the delivery window shown.
export function DeliveryEstimator({ leadTimeDays }: { leadTimeDays?: number }) {
  const [pincode, setPincode] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data: estimate, isLoading, error } = useQuery<ShippingEstimate | null>({
    queryKey: ['shipping', submitted],
    queryFn: async () => {
      if (!submitted) return null;
      const res = await fetch(`/api/shipping/estimate?pincode=${submitted}`);
      if (!res.ok) {
        throw new Error('Shipping not available for this pincode');
      }
      const data = await res.json();
      // Real-time serviceability gate (200 response with serviceable:false).
      if (data.serviceable === false) {
        throw new Error(
          data.reason === 'unserviceable'
            ? "Couriers don't currently deliver to this pincode."
            : "Delivery isn't available to this pincode yet."
        );
      }
      return data;
    },
    enabled: !!submitted,
  });

  const handleCheck = () => {
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setSubmitted(pincode);
    }
  };

  // "Order today, delivered by …" — same formula the builder's Delivery step
  // uses (lead time + assembly/QC + zone transit), so the two never disagree.
  const deliveryWindow = estimate
    ? deliveryWindowDays({
        leadTimeDays: leadTimeDays ?? 0,
        etaMinDays: estimate.etaMinDays,
        etaMaxDays: estimate.etaMaxDays,
      })
    : null;
  const deliveryDates = (() => {
    if (!deliveryWindow) return null;
    const fmt = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    };
    return `${fmt(deliveryWindow.min)} – ${fmt(deliveryWindow.max)}`;
  })();

  return (
    <div className="rounded-md bg-elevated p-5 border border-bdr">
      <div className="flex items-start gap-3">
        <Truck className="h-5 w-5 text-em-700 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-ink">Check delivery date</p>
          <p className="text-xs text-ink-2 mt-1">Enter your pincode to see when an order placed today would arrive</p>

          <div className="mt-3 flex gap-2">
            <Input
              placeholder="110001"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.slice(0, 6))}
              maxLength={6}
              type="tel"
              className="w-28"
            />
            <Button variant="em" size="sm" onClick={handleCheck} disabled={pincode.length !== 6}>
              Check
            </Button>
          </div>

          {isLoading && (
            <div className="mt-2 text-xs text-ink-2">Checking...</div>
          )}

          {estimate && (
            <div className="mt-3 rounded-md bg-white p-3 space-y-2">
              {deliveryDates && (
                <div className="flex items-start gap-2 rounded-md bg-em/5 p-2">
                  <CalendarCheck className="h-4 w-4 text-em-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-ink-2">Order today, delivered</p>
                    <p className="text-sm font-semibold text-ink">{deliveryDates}</p>
                    <p className="text-[10px] text-ink-3 leading-snug mt-0.5">
                      Includes production, branding &amp; QC time
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-2">Zone:</span>
                <span className="text-sm font-semibold text-ink">{estimate.zoneName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-2">Shipping:</span>
                <span className="text-sm font-semibold tabnum">
                  {estimate.ratePerKg > 0
                    ? `${formatRupees(estimate.ratePerKg)}/kg`
                    : formatRupees(estimate.minCharge || estimate.flatRate)}
                </span>
              </div>
              <p className="text-[10px] text-ink-3 leading-snug">
                Final shipping is calculated by total weight in the gift builder.
              </p>
              {/* Total window (production + assembly/QC + courier), so this row
                  always agrees with the delivery dates shown above. */}
              {deliveryWindow && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-2">Delivery:</span>
                  <span className="text-sm font-semibold text-ink">
                    {deliveryWindow.min}–{deliveryWindow.max} days
                  </span>
                </div>
              )}
            </div>
          )}

          {error && submitted && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-red-50 p-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-600">
                {(error as Error).message || 'Shipping not available for this pincode'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
