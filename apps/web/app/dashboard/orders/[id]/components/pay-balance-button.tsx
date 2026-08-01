'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupees } from '@/lib/utils';

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Opens Razorpay to collect the pending balance on an order (shown after the
 * customer approves the mockup). On success the order is marked fully paid and
 * advanced to production.
 */
export function PayBalanceButton({
  orderId,
  balanceDue,
  onPaid,
}: {
  orderId: string;
  balanceDue: number;
  // Fired after a verified successful payment (in addition to refreshing the
  // route) so a host — e.g. the dashboard payment popup — can close itself.
  onPaid?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rzpLoaded, setRzpLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      setRzpLoaded(true);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => setRzpLoaded(true);
    s.onerror = () => console.error('Failed to load Razorpay');
    document.body.appendChild(s);
  }, []);

  const handlePay = async () => {
    if (!rzpLoaded || !window.Razorpay) {
      alert('Payment gateway is still loading. Please try again in a moment.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/balance`, { method: 'POST' });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || 'Could not start payment');
      }
      const rzp = await res.json();

      const options = {
        key: rzp.keyId,
        amount: rzp.amount,
        currency: rzp.currency,
        order_id: rzp.razorpayOrderId,
        name: 'GIVOO',
        description: 'Balance payment',
        theme: { color: '#800020' },
        handler: async (response: any) => {
          try {
            const v = await fetch(`/api/orders/${orderId}/balance/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            if (!v.ok) {
              const b = await v.json().catch(() => ({}));
              throw new Error(b.error || 'Payment verification failed');
            }
            onPaid?.();
            router.refresh();
          } catch (e) {
            alert(
              e instanceof Error
                ? e.message
                : 'Payment succeeded but saving failed. Please contact support with your payment ID.'
            );
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      const inst = new window.Razorpay(options);
      inst.on('payment.failed', (r: any) => {
        alert(`Payment failed: ${r?.error?.description || 'Please try again.'}`);
        setLoading(false);
      });
      inst.open();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading || !rzpLoaded}
      className="w-full px-4 py-2.5 rounded-2xl bg-[#3A3A3A] text-white text-sm font-semibold hover:bg-[#222222] transition disabled:opacity-60"
    >
      {loading ? 'Processing…' : `Pay Balance ${formatRupees(balanceDue)}`}
    </button>
  );
}
