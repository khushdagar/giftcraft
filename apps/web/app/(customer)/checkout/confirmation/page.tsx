'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formatRupees } from '@/lib/utils';
import { combinedGst, splitPaymentFee, shippingTaxable } from '@/lib/pricing-display';
import { invoiceLabel } from '@/lib/invoice-status';
import { useBuilderStore } from '@/store/builder';
import { useBoxStore } from '@/store/box';

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  brand: string | null;
  image: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  packQuantity: number;
  deliveryMode: string;
  createdAt: string;
  subtotal: number;
  packagingAmount: number;
  addonsAmount: number;
  shippingAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  razorpayFee: number;
  grandTotal: number;
  paidAt: string | null;
  razorpayPaymentId: string | null;
  paymentType: 'advance' | 'full' | null;
  amountPaid: number;
  items: OrderItem[];
  timeline: { status: string; note: string | null; createdAt: string }[];
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { clearAll } = useBuilderStore();
  const resetBox = useBoxStore((s) => s.reset);

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery<Order>({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Order not found');
      }
      return res.json();
    },
  });

  // Clear the cart once the order is confirmed so a stale pack can't be
  // re-submitted — both the main builder AND the Build Your Box store, since
  // either could hold the products that were just ordered.
  useEffect(() => {
    if (order) {
      clearAll();
      resetBox();
    }
  }, [order, clearAll, resetBox]);

  // ── No order in the URL ───────────────────────────────────────────────
  if (!orderId) {
    return (
      <EmptyState
        title="No order to show"
        message="We couldn't find your order information."
      />
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="bg-[#F5F1EB] min-h-screen py-12 md:py-16">
        <div className="cn text-center max-w-2xl">
          <div className="w-20 h-20 bg-[#E5DFD4] rounded-full mx-auto mb-6 animate-pulse" />
          <div className="h-9 w-64 bg-[#E5DFD4] rounded-lg animate-pulse mx-auto mb-3" />
          <div className="h-5 w-40 bg-[#E5DFD4] rounded-lg animate-pulse mx-auto mb-6" />
          <div className="h-48 bg-white rounded-2xl shadow-sm animate-pulse mb-6" />
          <div className="h-64 bg-white rounded-2xl shadow-sm animate-pulse" />
        </div>
      </main>
    );
  }

  // ── Error (not found / forbidden) ─────────────────────────────────────
  if (isError || !order) {
    return (
      <EmptyState
        title="Order unavailable"
        message="We couldn't load this order. It may not exist or you may not have access to it."
      />
    );
  }

  // Paid orders (price-lock path) reflect the verified Razorpay payment; the
  // mockup path takes no payment up front.
  const isPaid = !!order.paidAt;
  const selectedPath: 'mockup' | 'lock' = isPaid ? 'lock' : 'mockup';
  const quantity = order.packQuantity;
  const grand = order.grandTotal;
  const advance10 = isPaid && order.amountPaid > 0 ? order.amountPaid : Math.round(grand * 0.1);
  const balance90 = grand - advance10;

  // Full price breakdown (mirrors the checkout Price Breakdown panel).
  const itemsSubtotal = order.subtotal + order.packagingAmount + order.addonsAmount;
  // One combined GST line everywhere: product/packaging/shipping GST PLUS the GST
  // on the payment fee, rolled into a single figure. The payment fee itself is
  // shown pre-GST below.
  const gstTotal = combinedGst(order.cgstAmount, order.sgstAmount, order.igstAmount, order.razorpayFee);
  const paymentFeeBase = splitPaymentFee(order.razorpayFee).base;
  const perPack = quantity > 0 ? grand / quantity : 0;

  // Drive the timeline from the order's real status. Each canonical milestone
  // maps to the point in the OrderStatus progression where it becomes the
  // *current* stage; earlier milestones read Done, later ones Pending.
  const STATUS_TO_STEP: Record<string, number> = {
    draft: 0,
    quote_sent: 0,
    confirmed: 1, // order placed → mockups next
    mockup_pending: 1, // design team creating mockups
    mockup_approved: 3, // approved → payment next
    payment_pending: 3,
    production: 4,
    quality_check: 4,
    packed: 5,
    shipped: 5,
    in_transit: 5,
    delivered: 6, // all steps complete
    completed: 6,
  };
  const activeStep = STATUS_TO_STEP[order.status] ?? 1;
  const stateFor = (i: number): 'done' | 'current' | 'pending' =>
    i < activeStep ? 'done' : i === activeStep ? 'current' : 'pending';
  const STATE_STYLE = {
    done: { status: 'Done', statusColor: 'text-[#2D8B56]', dotColor: 'bg-[#2D8B56]' },
    current: { status: 'In progress', statusColor: 'text-[#D4872A]', dotColor: 'bg-[#D4872A]' },
    pending: { status: 'Pending', statusColor: 'text-[#8F8A82]', dotColor: 'bg-[#D3CBBC]' },
  } as const;

  // Canonical milestones; `i` is the index used by the status mapping above.
  // The 10%-advance row (lock path only) is inserted after Order Confirmed.
  const paymentLabel =
    selectedPath === 'lock'
      ? `Balance Payment (${formatRupees(balance90)})`
      : `Full Payment (${formatRupees(grand)})`;
  const milestones = [
    { i: 0, label: 'Order Confirmed', state: stateFor(0) as 'done' | 'current' | 'pending' },
    ...(selectedPath === 'lock'
      ? [{ i: 0, label: '10% Advance Received', state: 'done' as const }]
      : []),
    { i: 1, label: 'Mockup Creation', state: stateFor(1) },
    { i: 2, label: 'Your Design Approval', state: stateFor(2) },
    { i: 3, label: paymentLabel, state: stateFor(3) },
    { i: 4, label: 'Production & QC', state: stateFor(4) },
    { i: 5, label: 'Shipping & Delivery', state: stateFor(5) },
  ];

  const steps = milestones.map((m) => ({ label: m.label, ...STATE_STYLE[m.state] }));

  return (
    <>
      <main className="bg-[#F5F1EB] min-h-screen py-12 md:py-16">
        <div className="cn text-center max-w-2xl">
          {/* Confirmation Icon */}
          <div className="w-20 h-20 bg-[#800020] text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 animate-scale-in">
            ✓
          </div>

          <h2 className="text-3xl md:text-4xl font-serif font-normal mb-2">
            {selectedPath === 'lock' ? 'Payment Received!' : 'Order Confirmed!'}
          </h2>

          <p className="text-lg font-medium text-[#5C5852] mb-2">
            Order <strong className="font-mono tabular-nums">#{order.orderNumber}</strong>
          </p>

          <p className="text-base text-[#5C5852] mb-6">
            {selectedPath === 'lock'
              ? `Your 10% advance of ${formatRupees(advance10)} has been received. Prices are locked for 30 days.`
              : `Your order for ${quantity} gift packs has been confirmed. No payment taken yet.`}
          </p>

          {/* Next Steps Notice */}
          <div className="bg-[#FBF4F5] border-l-4 border-[#800020] px-4 py-3 rounded-lg text-left text-sm text-[#560015] mb-6">
            <p className="font-semibold mb-1">📬 What happens now?</p>
            <p>
              Our design team will create branded mockups of your products within <strong>1–2 business days</strong>.
              You'll receive an approval link via email.
            </p>
          </div>

          {/* Order Summary Box */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 text-left">
            <h3 className="text-base font-semibold mb-4">Order Summary</h3>

            <div className="space-y-3 mb-4">
              {order.items.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 pb-3 border-b border-[#E5DFD4] last:border-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                      />
                    ) : (
                      <span className="text-xl">🎁</span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-[#5C5852] tabular-nums">
                        {formatRupees(p.unitPrice)} × {quantity}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums flex-shrink-0">
                    {formatRupees(p.unitPrice * quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Breakdown — same line items as the checkout panel */}
            <div className="space-y-2 text-sm border-t border-[#E5DFD4] pt-4">
              {order.packagingAmount > 0 && (
                <div className="flex justify-between text-[#5C5852]">
                  <span>Packaging</span>
                  <span className="tabular-nums">{formatRupees(order.packagingAmount)}</span>
                </div>
              )}
              {order.addonsAmount > 0 && (
                <div className="flex justify-between text-[#5C5852]">
                  <span>Add-ons</span>
                  <span className="tabular-nums">{formatRupees(order.addonsAmount)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-[#E5DFD4] pt-2 mt-1 font-semibold text-[#222222]">
                <span>Subtotal (before shipping, GST)</span>
                <span className="tabular-nums">{formatRupees(itemsSubtotal)}</span>
              </div>

              {/* Shipping at its TAXABLE value — the courier rate is GST-inclusive
                  and that GST is disclosed in the combined GST line below. Showing
                  the inclusive amount here would double-count shipping's GST. */}
              <div className="flex justify-between text-[#5C5852]">
                <span>Shipping</span>
                <span className="tabular-nums">
                  {order.shippingAmount > 0 ? formatRupees(shippingTaxable(order.shippingAmount)) : 'FREE'}
                </span>
              </div>

              {/* Payment fee (2%), shown PRE-GST — its GST is part of the
                  combined GST line below. */}
              {paymentFeeBase > 0 && (
                <div className="flex justify-between text-[#5C5852]">
                  <span>
                    Payment Processing Fee
                    <span className="block text-[11px] italic text-[#8F8A82]">Razorpay 2%</span>
                  </span>
                  <span className="tabular-nums">{formatRupees(paymentFeeBase)}</span>
                </div>
              )}

              {/* GST — single all-in line (goods + shipping + payment-fee GST),
                  shown last, below the payment fee. */}
              {gstTotal > 0 && (
                <div className="flex justify-between text-[#5C5852]">
                  <span>GST</span>
                  <span className="tabular-nums">{formatRupees(gstTotal)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-3 mt-2 border-t-2 border-[#D3CBBC] font-bold">
              <span>Grand Total</span>
              <span className="tabular-nums">{formatRupees(grand)}</span>
            </div>

            <div className="flex justify-end text-xs text-[#2D8B56] font-semibold italic mt-1">
              <span>{formatRupees(perPack)} per gift pack</span>
            </div>

            {selectedPath === 'lock' && (
              <>
                <div className="flex justify-between py-2 text-sm text-[#2D8B56] font-medium">
                  <span>Advance Paid (10%)</span>
                  <span className="tabular-nums">{formatRupees(advance10)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm text-[#5C5852]">
                  <span>Balance Due (after mockup approval)</span>
                  <span className="font-semibold tabular-nums">{formatRupees(balance90)}</span>
                </div>
                {order.razorpayPaymentId && (
                  <div className="flex justify-between py-1 text-xs text-[#8F8A82]">
                    <span>Payment ID</span>
                    <span className="font-mono">{order.razorpayPaymentId}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 text-left">
            <h3 className="text-base font-semibold mb-4">Order Timeline</h3>

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${step.dotColor}`} />
                  <span className="flex-1 text-sm">{step.label}</span>
                  <span className={`text-xs font-semibold ${step.statusColor}`}>{step.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 max-w-xs mx-auto mb-8">
            <Link
              href={`/orders/${order.id}/track`}
              className="flex items-center justify-center gap-2 h-12 bg-[#800020] text-white rounded-full font-semibold text-base hover:bg-[#6B001B] transition"
            >
              📦 Track Your Order
            </Link>
            <a
              href={`/api/orders/${order.id}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full h-11 border-2 border-[#D3CBBC] rounded-full font-medium text-sm text-[#222222] hover:bg-[#FAFAFA] transition"
            >
              📄 Download {invoiceLabel(order.amountPaid, order.grandTotal)}
            </a>
            <Link
              href="/"
              className="flex items-center justify-center h-11 text-sm text-[#800020] font-medium hover:underline"
            >
              ← Back to Home
            </Link>
          </div>

          {/* Notifications */}
          <div className="bg-[#FAFAFA] rounded-lg p-4 text-left text-sm text-[#5C5852] mb-6">
            <p className="font-semibold mb-2">📲 Notifications sent to:</p>
            <p className="mb-1">✉️ Confirmation email with order details and quote PDF</p>
          </div>

          <p className="text-xs text-[#8F8A82]">
            Order reference: {order.orderNumber} · Placed{' '}
            {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#222222] text-[#F5F1EB] py-8 mt-12">
        <div className="cw">
          <p className="text-sm mb-2 font-serif italic text-opacity-40">GIVOO</p>
          <div className="flex justify-between text-xs text-[#5C5852]">
            <span>© 2026 GIVOO. All Rights Reserved.</span>
            <span>Made with ♥ in Delhi</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <>
      <main className="bg-[#F5F1EB] min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center max-w-md mx-4">
          <p className="text-2xl font-serif mb-2">{title}</p>
          <p className="text-sm text-[#5C5852] mb-6">{message}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-[#800020] text-white px-6 py-3 font-semibold hover:bg-[#6B001B] transition"
          >
            Back to Home
          </Link>
        </div>
      </main>
    </>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="bg-[#F5F1EB] min-h-screen" />}>
      <ConfirmationContent />
    </Suspense>
  );
}
