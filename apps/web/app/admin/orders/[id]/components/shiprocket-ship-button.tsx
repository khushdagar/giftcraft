'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';

interface ShiprocketShipButtonProps {
  orderId: string;
  awbCode?: string;
  courierName?: string;
  trackingUrl?: string;
}

export function ShiprocketShipButton({
  orderId,
  awbCode,
  courierName,
  trackingUrl,
}: ShiprocketShipButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (awbCode && courierName) {
    return (
      <div className="rounded-md border-2 border-bdr bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">Shipment</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-2">AWB Code</span>
            <span className="font-semibold text-ink">{awbCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-2">Courier</span>
            <span className="font-semibold text-ink">{courierName}</span>
          </div>
        </div>
        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block text-center px-4 py-2 rounded-md border border-em text-em hover:bg-em-50 transition text-sm font-semibold"
          >
            Track Shipment
          </a>
        )}
      </div>
    );
  }

  const handleShip = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/ship`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to create shipment');
        return;
      }

      toast.success('Shipment created successfully');
      router.refresh();
    } catch (error) {
      toast.error('Error creating shipment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-md border-2 border-bdr bg-canvas p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">Ready to Ship</p>
      <Button
        onClick={handleShip}
        disabled={loading}
        className="w-full rounded-2xl bg-em px-4 py-2 font-bold hover:bg-em-600 flex items-center justify-center gap-2"
      >
        <Truck className="w-4 h-4" />
        {loading ? 'Creating Shipment...' : 'Create Shipment'}
      </Button>
    </div>
  );
}
