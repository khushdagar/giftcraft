'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatRupees } from '@/lib/utils';

interface ShippingEstimate {
  zoneName: string;
  stateCode: string;
  flatRate: number;
  etaMinDays: number;
  etaMaxDays: number;
}

export function DeliveryEstimator() {
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
      return res.json();
    },
    enabled: !!submitted,
  });

  const handleCheck = () => {
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setSubmitted(pincode);
    }
  };

  return (
    <div className="rounded-md bg-elevated p-5 border border-bdr">
      <div className="flex items-start gap-3">
        <Truck className="h-5 w-5 text-em-700 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-ink">Check delivery</p>
          <p className="text-xs text-ink-2 mt-1">Enter your pincode to see delivery zones and rates</p>

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
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-2">Zone:</span>
                <span className="text-sm font-semibold text-ink">{estimate.zoneName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-2">Shipping:</span>
                <span className="text-sm font-semibold tabnum">{formatRupees(estimate.flatRate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-2">Delivery:</span>
                <span className="text-sm font-semibold text-ink">
                  {estimate.etaMinDays}–{estimate.etaMaxDays} days
                </span>
              </div>
            </div>
          )}

          {error && submitted && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-red-50 p-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-600">Shipping not available for this pincode</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
