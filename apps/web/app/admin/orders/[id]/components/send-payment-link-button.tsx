'use client';

import { useState } from 'react';

/**
 * Admin button to email the customer the balance payment link on demand.
 * Surfaces the real send result so SendGrid failures are visible.
 */
export function SendPaymentLinkButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/send-payment-link`, {
        method: 'POST',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to send payment link');
      setSent(true);
      alert(`Payment link emailed to ${body.sentTo}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send payment link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSend}
      disabled={loading}
      className="w-full px-4 py-2 rounded-md border border-em bg-em-50 text-em hover:bg-em-100 transition text-sm font-normal disabled:opacity-60"
    >
      {loading ? 'Sending…' : sent ? 'Resend Payment Link' : 'Send Payment Link'}
    </button>
  );
}
