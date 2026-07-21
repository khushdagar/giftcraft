'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, CheckCircle } from 'lucide-react';
import { formatRupees } from '@/lib/utils';
import { combinedGst, splitPaymentFee, shippingTaxable } from '@/lib/pricing-display';
import { PayBalanceButton } from '../orders/[id]/components/pay-balance-button';

interface OrderPayment {
  id: string;
  orderNumber: string;
  packQuantity: number;
  subtotal: number;
  packagingAmount: number;
  addonsAmount: number;
  shippingAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  razorpayFee: number;
  grandTotal: number;
  amountPaid: number;
}

/**
 * Balance-payment popup on the dashboard overview. Opens automatically when the
 * URL carries `?pay=<orderId>` — the customer lands here straight after
 * approving a mockup that still has a balance due. Shows the order's payment
 * breakdown and reuses the existing Razorpay balance flow (PayBalanceButton).
 */
export function DashboardPaymentModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('pay');

  const [order, setOrder] = useState<OrderPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setError(null);
      setPaid(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/orders/${orderId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load your order');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Clears the ?pay param and closes the popup.
  const close = () => {
    router.replace('/dashboard');
  };

  if (!orderId) return null;

  const balanceDue = order ? Math.max(0, order.grandTotal - order.amountPaid) : 0;
  const gstTotal = order
    ? combinedGst(order.cgstAmount, order.sgstAmount, order.igstAmount, order.razorpayFee)
    : 0;
  const paymentFeeBase = order ? splitPaymentFee(order.razorpayFee).base : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-bdr px-5 py-4">
          <h2 className="text-base font-semibold text-ink">
            {paid ? 'Payment complete' : 'Complete your payment'}
          </h2>
          <button
            onClick={close}
            className="rounded-md p-1 text-ink-3 transition hover:bg-elevated hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {loading && (
            <div className="py-10 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-em" />
              <p className="mt-3 text-sm text-ink-3">Loading your order…</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-md border-2 border-err/30 bg-err/5 p-4 text-sm text-err">
              {error}
            </div>
          )}

          {paid && (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-em" />
              <p className="mt-3 font-semibold text-ink">Payment received</p>
              <p className="mt-1 text-sm text-ink-2">
                Your order is now moving to production. Thank you!
              </p>
              <button
                onClick={close}
                className="mt-5 rounded-2xl bg-em px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-em-700"
              >
                Done
              </button>
            </div>
          )}

          {order && !loading && !paid && (
            <>
              <p className="mb-4 text-sm text-ink-2">
                Mockup approved for order{' '}
                <span className="font-semibold text-ink">#{order.orderNumber}</span>. Pay the
                pending balance to start production.
              </p>

              {/* Payment details */}
              <div className="space-y-1.5 rounded-md bg-elevated p-4 text-sm">
                <Row label="Products" value={formatRupees(order.subtotal)} />
                {order.packagingAmount > 0 && (
                  <Row label="Packaging" value={`+${formatRupees(order.packagingAmount)}`} />
                )}
                {order.addonsAmount > 0 && (
                  <Row label="Add-ons" value={`+${formatRupees(order.addonsAmount)}`} />
                )}
                {order.shippingAmount > 0 && (
                  <Row
                    label="Shipping"
                    value={`+${formatRupees(shippingTaxable(order.shippingAmount))}`}
                  />
                )}
                {paymentFeeBase > 0 && (
                  <Row label="Payment fee (2%)" value={`+${formatRupees(paymentFeeBase)}`} />
                )}
                {gstTotal > 0 && <Row label="GST" value={`+${formatRupees(gstTotal)}`} />}

                <div className="mt-2 flex justify-between border-t border-bdr pt-2 font-semibold text-ink">
                  <span>Grand Total</span>
                  <span className="tabnum">{formatRupees(order.grandTotal)}</span>
                </div>
                {order.amountPaid > 0 && (
                  <Row
                    label="Advance paid"
                    value={`−${formatRupees(order.amountPaid)}`}
                    accent="text-em-700"
                  />
                )}
                <div className="flex justify-between border-t border-bdr pt-2 text-base font-bold text-ink">
                  <span>Balance Due</span>
                  <span className="tabnum">{formatRupees(balanceDue)}</span>
                </div>
              </div>

              <div className="mt-5">
                {balanceDue > 0 ? (
                  <PayBalanceButton
                    orderId={order.id}
                    balanceDue={balanceDue}
                    onPaid={() => setPaid(true)}
                  />
                ) : (
                  <p className="text-center text-sm font-semibold text-em-700">
                    This order is fully paid.
                  </p>
                )}
                <button
                  onClick={close}
                  className="mt-2 w-full rounded-2xl border-2 border-bdr py-2 text-sm font-semibold text-ink-2 transition hover:bg-elevated"
                >
                  Pay later
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className={`flex justify-between ${accent ?? 'text-ink-2'}`}>
      <span>{label}</span>
      <span className="tabnum">{value}</span>
    </div>
  );
}
