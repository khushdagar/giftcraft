import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { formatRupees } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronLeft, FileDown, Link as LinkIcon } from 'lucide-react';
import { isImageUrl } from '@/lib/mockup-url';
import { PayBalanceButton } from './components/pay-balance-button';

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Draft",
    quote_sent: "Quote Sent",
    confirmed: "Confirmed",
    mockup_pending: "Mockup Review",
    mockup_approved: "Approved",
    payment_pending: "Payment Pending",
    production: "In Production",
    quality_check: "QC",
    packed: "Packed",
    shipped: "Shipped",
    in_transit: "In Transit",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };
  return labels[status] || status;
}

function getStatusVariant(status: string): "em" | "gold" | "grey" {
  if (status === "mockup_pending" || status === "payment_pending") return "gold";
  if (status === "delivered" || status === "completed") return "grey";
  return "em";
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return <div>Please log in</div>;
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              images: {
                select: { url: true },
                take: 1,
              },
            },
          },
        },
      },
      timeline: true,
      artworkApprovals: {
        orderBy: { revision: 'desc' },
      },
    },
  }) as any;

  if (!order || order.placedById !== session.user.id) {
    return (
      <div className="max-w-2xl space-y-6">
        <Link href="/dashboard/orders" className="inline-flex items-center gap-2 text-sm font-normal text-em hover:underline">
          <ChevronLeft className="w-4 h-4" />
          Back to Orders
        </Link>
        <div className="rounded-md border-2 border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">Order not found</p>
        </div>
      </div>
    );
  }

  const billingJson = order.billingJson as any;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/orders" className="inline-flex items-center gap-2 text-sm font-normal text-em hover:underline">
        <ChevronLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="overline text-ink-3">Order Details</p>
          <h1 className="mt-1 text-3xl font-normal">#{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-ink-3">
            Created {new Date(order.createdAt).toLocaleDateString('en-IN')}
          </p>
        </div>
        {(() => {
          // Derived "Payment Pending" label when the mockup is approved but a
          // balance is still due.
          const amountPaid = Number((order.billingJson as any)?.amountPaid ?? 0);
          const balance = Math.max(0, Number(order.grandTotal) - amountPaid);
          const showPaymentPending = order.status === 'mockup_approved' && balance > 0;
          return (
            <Badge variant={showPaymentPending ? 'gold' : getStatusVariant(order.status)}>
              {showPaymentPending ? 'Payment Pending' : getStatusLabel(order.status)}
            </Badge>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Balance payment due — shown once the mockup is approved and a
              balance remains (derived "payment pending" state). */}
          {(order.status === 'mockup_approved' || order.status === 'payment_pending') && (() => {
            const amountPaid = Number((order.billingJson as any)?.amountPaid ?? 0);
            const balance = Math.max(0, Number(order.grandTotal) - amountPaid);
            if (balance <= 0) return null;
            return (
              <div className="rounded-md border-2 border-gold/40 bg-gold-50 p-5">
                <p className="text-xs font-normal uppercase tracking-wider text-gold-700 mb-2">
                  Payment Pending
                </p>
                <p className="text-sm text-ink-2 mb-1">
                  Your mockup is approved 🎉 Complete the remaining balance to start production.
                </p>
                <p className="text-2xl font-black tabular-nums text-ink mb-4">
                  {formatRupees(balance)} <span className="text-sm font-normal text-ink-3">due</span>
                </p>
                <div className="max-w-xs">
                  <PayBalanceButton orderId={order.id} balanceDue={balance} />
                </div>
              </div>
            );
          })()}

          {/* Design Approval / Mockup — only relevant while the order is in the
              mockup phase; once it advances to production+ the timeline/status
              badge tell the story, so we hide this banner. */}
          {(() => {
            const approval = order.artworkApprovals?.[0];
            if (!approval) return null;
            if (!['mockup_pending', 'mockup_approved'].includes(order.status)) {
              return null;
            }

            if (approval.status === 'pending') {
              return (
                <div className="rounded-md border-2 border-gold/40 bg-gold-50 p-5">
                  <p className="text-xs font-normal uppercase tracking-wider text-gold-700 mb-3">
                    Mockup ready for your approval
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {approval.fileUrl && (
                      isImageUrl(approval.fileUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={approval.fileUrl}
                          alt={`Mockup v${approval.revision}`}
                          className="h-28 w-28 flex-shrink-0 rounded-md border-2 border-gold/30 object-cover bg-white"
                        />
                      ) : (
                        <div className="h-28 w-28 flex-shrink-0 rounded-md border-2 border-gold/30 bg-white flex flex-col items-center justify-center gap-1 text-center px-2">
                          <LinkIcon className="h-6 w-6 text-sky-600" />
                          <span className="text-[10px] text-ink-3">File link</span>
                        </div>
                      )
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-ink-2 mb-3">
                        Our design team has prepared the branding artwork (version {approval.revision}) for
                        your order. Please review and approve it so we can start production.
                      </p>
                      <Link
                        href={`/approve/${approval.token}`}
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-2xl bg-em text-white text-sm font-normal hover:bg-em-700 transition"
                      >
                        Review &amp; Approve Mockup
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            if (approval.status === 'revision_requested') {
              return (
                <div className="rounded-md border-2 border-rose-200 bg-rose-50 p-5">
                  <p className="text-xs font-normal uppercase tracking-wider text-rose-700 mb-2">
                    Changes requested
                  </p>
                  <p className="text-sm text-ink-2">
                    Thanks for your feedback on mockup v{approval.revision}. Our design team is preparing an
                    updated version — you'll get a new approval link shortly.
                  </p>
                </div>
              );
            }

            if (approval.status === 'approved') {
              // When a balance is still due, the "Payment Pending" banner above
              // carries the messaging — don't also claim it's in production.
              const amountPaid = Number((order.billingJson as any)?.amountPaid ?? 0);
              const balance = Math.max(0, Number(order.grandTotal) - amountPaid);
              if (balance > 0) return null;
              return (
                <div className="rounded-md border-2 border-em-200 bg-em-50 p-5">
                  <p className="text-xs font-normal uppercase tracking-wider text-em-700 mb-2">
                    Mockup approved
                  </p>
                  <p className="text-sm text-ink-2">
                    You approved the artwork (v{approval.revision})
                    {approval.approvedAt
                      ? ` on ${new Date(approval.approvedAt).toLocaleDateString('en-IN')}`
                      : ''}
                    . Your order is moving into production.
                  </p>
                </div>
              );
            }

            return null;
          })()}

          {/* Order Items */}
          <div className="rounded-md border-2 border-gray-200 bg-white p-5">
            <p className="text-xs font-normal uppercase tracking-wider text-gray-600 mb-4">
              Items
            </p>
            <div className="space-y-3">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{item.product?.name || 'Product'}</p>
                    <p className="text-xs text-gray-500">×{item.quantity}</p>
                  </div>
                  <p className="font-normal text-sm tabular-nums">
                    {formatRupees(Number(item.totalPrice))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Billing Info */}
          <div className="rounded-md border-2 border-gray-200 bg-white p-5">
            <p className="text-xs font-normal uppercase tracking-wider text-gray-600 mb-4">
              Billing Information
            </p>
            {billingJson ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Company</p>
                  <p className="font-medium">{billingJson.companyName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{billingJson.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium">{billingJson.phone || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No billing information</p>
            )}
          </div>

          {/* Timeline */}
          {order.timeline.length > 0 && (
            <div className="rounded-md border-2 border-gray-200 bg-white p-5">
              <p className="text-xs font-normal uppercase tracking-wider text-gray-600 mb-4">
                Timeline
              </p>
              <div className="space-y-4">
                {order.timeline.map((event : any) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center pt-1">
                      <div className="h-3 w-3 rounded-full bg-em"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-sm">{getStatusLabel(event.status)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(event.createdAt).toLocaleDateString('en-IN')} at{' '}
                        {new Date(event.createdAt).toLocaleTimeString('en-IN')}
                      </p>
                      {event.note && <p className="text-xs text-gray-600 mt-1">{event.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Pricing Summary */}
          <div className="rounded-md border-2 border-gray-200 bg-white p-5 space-y-3">
            <p className="text-xs font-normal uppercase tracking-wider text-gray-600">
              Pricing
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatRupees(Number(order.subtotal))}</span>
              </div>

              {Number(order.packagingAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Packaging</span>
                  <span className="font-medium">+{formatRupees(Number(order.packagingAmount))}</span>
                </div>
              )}

              {Number(order.addonsAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Add-ons</span>
                  <span className="font-medium">+{formatRupees(Number(order.addonsAmount))}</span>
                </div>
              )}

              {Number(order.shippingAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping (incl. GST)</span>
                  <span className="font-medium">+{formatRupees(Number(order.shippingAmount))}</span>
                </div>
              )}

              {/* GST — single combined line (shipping is already GST-inclusive) */}
              {Number(order.cgstAmount) + Number(order.sgstAmount) + Number(order.igstAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">GST</span>
                  <span className="font-medium">
                    +{formatRupees(Number(order.cgstAmount) + Number(order.sgstAmount) + Number(order.igstAmount))}
                  </span>
                </div>
              )}

              {Number(order.razorpayFee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Gateway Fee</span>
                  <span className="font-medium">+{formatRupees(Number(order.razorpayFee))}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-2 flex justify-between font-normal">
                <span>Grand Total</span>
                <span>{formatRupees(Number(order.grandTotal))}</span>
              </div>

              {/* Advance paid + pending balance (price-lock path) */}
              {order.paidAt && (() => {
                const amountPaid = Number((order.billingJson as any)?.amountPaid ?? 0);
                const isFull = (order.billingJson as any)?.paymentType === 'full';
                const balance = Math.max(0, Number(order.grandTotal) - amountPaid);
                return (
                  <div className="border-t border-gray-200 pt-2 space-y-1">
                    <div className="flex justify-between text-em-700">
                      <span>Advance Paid ({isFull ? 'full' : '10%'})</span>
                      <span>−{formatRupees(amountPaid)}</span>
                    </div>
                    <div className="flex justify-between font-normal">
                      <span>Balance Pending</span>
                      <span>{formatRupees(balance)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <a
              href={`/api/orders/${order.id}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md border border-em text-em hover:bg-em-50 transition text-sm font-normal"
            >
              <FileDown className="w-4 h-4" />
              Download {order.paidAt ? 'Tax Invoice' : 'Proforma Invoice'}
            </a>
          </div>

          {/* Order Info */}
          <div className="rounded-md border-2 border-gray-200 bg-white p-5 space-y-3">
            <p className="text-xs font-normal uppercase tracking-wider text-gray-600">
              Order Info
            </p>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">Packs</p>
                <p className="font-medium">×{order.packQuantity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Delivery Mode</p>
                <p className="font-medium capitalize">{order.deliveryMode}</p>
              </div>
            </div>
          </div>

          {/* Tracking */}
          {order.awbCode && (
            <div className="rounded-md border-2 border-em-200 bg-em-50 p-5 space-y-3">
              <p className="text-xs font-normal uppercase tracking-wider text-em-700">
                Shipment Tracking
              </p>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-em-600">AWB Code</p>
                  <p className="font-medium text-em-700">{order.awbCode}</p>
                </div>
                {order.courierName && (
                  <div>
                    <p className="text-xs text-em-600">Courier</p>
                    <p className="font-medium text-em-700">{order.courierName}</p>
                  </div>
                )}
              </div>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-4 py-2 rounded-md border border-em-200 text-em-700 hover:bg-em-100 transition text-sm font-normal mt-3"
                >
                  Track Shipment
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
