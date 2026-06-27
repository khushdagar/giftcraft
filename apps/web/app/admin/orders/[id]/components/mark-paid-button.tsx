'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Admin button to record an OFFLINE balance payment (e.g. bank transfer) and
 * move the order to production. Confirms first to avoid accidental marking.
 */
export function MarkPaidButton({
  orderId,
  balanceDue,
}: {
  orderId: string;
  balanceDue: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleMark = async () => {
    const ok = window.confirm(
      `Mark the remaining balance of ₹${balanceDue.toLocaleString('en-IN')} as paid?\n\nThis records the order as fully paid and moves it to Production.`
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to mark as paid');
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to mark as paid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleMark}
      disabled={loading}
      className="w-full px-4 py-2 rounded-md bg-em text-white hover:bg-em-700 transition text-sm font-normal disabled:opacity-60"
    >
      {loading ? 'Marking…' : 'Mark Paid'}
    </button>
  );
}
