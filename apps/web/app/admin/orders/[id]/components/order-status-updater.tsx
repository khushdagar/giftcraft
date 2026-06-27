'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

// 'draft' and 'quote_sent' are pre-order states and never apply once an order
// exists, so they're intentionally excluded from the admin dropdown.
const STATUS_OPTIONS = [
  'confirmed',
  'mockup_pending',
  'mockup_approved',
  'production',
  'quality_check',
  'packed',
  'shipped',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
];

export function OrderStatusUpdater({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Keep the dropdown in sync when the order status changes elsewhere (e.g.
  // after "Mark Paid" / a balance payment refreshes the page data).
  useEffect(() => {
    setNewStatus(currentStatus);
  }, [currentStatus]);

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === currentStatus) {
      alert('Please select a different status');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: note || undefined }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      // Refresh the page
      router.refresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-md border-2 border-bdr bg-white p-5">
      <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-4">
        Update Status
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-normal text-ink-3 block mb-2">New Status</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 rounded-md border border-bdr text-sm disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status
                  .split('_')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-normal text-ink-3 block mb-2">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
            placeholder="Add a note about this status change"
            className="w-full px-3 py-2 rounded-md border border-bdr text-sm disabled:opacity-50"
            rows={3}
          />
        </div>
        <Button
          onClick={handleUpdateStatus}
          disabled={loading || newStatus === currentStatus}
          variant="em"
          className="w-full rounded-md"
        >
          {loading ? 'Updating...' : 'Update Status'}
        </Button>
      </div>
    </div>
  );
}
