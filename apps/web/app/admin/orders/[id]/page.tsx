import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import { invoiceLabel } from '@/lib/invoice-status';
import Link from 'next/link';
import { OrderStatusUpdater } from './components/order-status-updater';
import { MockupPanel } from './components/mockup-panel';
import { ShiprocketShipButton } from './components/shiprocket-ship-button';
import { SlaLogDisplay } from '@/components/admin/orders/sla-log-display';
import { SendPaymentLinkButton } from './components/send-payment-link-button';
import { MarkPaidButton } from './components/mark-paid-button';
import { markAdminNotificationsRead } from '@/lib/admin-notifications';
import { FileDown } from 'lucide-react';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'super_admin') {
    redirect('/unauthorized');
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: { product: { select: { name: true, brand: true } } },
      },
      timeline: {
        orderBy: { createdAt: 'asc' },
      },
      slaLogs: {
        orderBy: { enteredAt: 'asc' },
      },
      artworkApprovals: {
        orderBy: { revision: 'desc' },
      },
    },
  });

  if (!order) {
    redirect('/admin/orders');
  }

  // Viewing an order clears its bell notifications (the new-order alert plus any
  // pending revision-request alerts on this order).
  await markAdminNotificationsRead(session.user.id, [
    `order-${order.id}`,
    ...order.artworkApprovals
      .filter((a) => a.status === 'revision_requested')
      .map((a) => `revision-${a.id}`),
  ]);

  const billingInfo = order.billingJson as any;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-em-50 text-em-700';
      case 'production':
        return 'bg-sky-50 text-sky-700';
      case 'quality_check':
        return 'bg-[#F5F3FF] text-[#8B5CF6]';
      case 'packed':
        return 'bg-violet-50 text-violet-700';
      case 'shipped':
      case 'in_transit':
        return 'bg-indigo-50 text-indigo-700';
      case 'delivered':
        return 'bg-em-50 text-em-700';
      case 'cancelled':
        return 'bg-err/10 text-err';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-ink-3">
        <a href="/admin/orders" className="text-em hover:underline">
          Orders
        </a>
        <span>/</span>
        <span className="font-normal text-ink">{order.orderNumber}</span>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Order Summary Card */}
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Order</p>
                <p className="text-2xl font-normal text-ink">{order.orderNumber}</p>
              </div>
              {(() => {
                // Derive "Payment Pending" when the mockup is approved but a
                // balance is still due (matches the customer dashboard).
                const amountPaid = Number((order.billingJson as any)?.amountPaid ?? 0);
                const balance = Math.max(0, Number(order.grandTotal) - amountPaid);
                const showPaymentPending = order.status === 'mockup_approved' && balance > 0;
                return (
                  <span
                    className={`inline-block px-3 py-1.5 rounded-full text-xs font-normal ${
                      showPaymentPending
                        ? 'bg-gold-50 text-gold-700'
                        : getStatusBadgeColor(order.status)
                    }`}
                  >
                    {showPaymentPending ? 'Payment Pending' : getStatusLabel(order.status)}
                  </span>
                );
              })()}
            </div>
            <p className="text-xs text-ink-2">
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Billing Details */}
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-3">
              Billing Details
            </p>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-ink-3 text-xs">Company</p>
                <p className="font-normal text-ink">{billingInfo?.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-ink-3 text-xs">Contact Email</p>
                <p className="text-ink">{billingInfo?.email || '-'}</p>
              </div>
              <div>
                <p className="text-ink-3 text-xs">Phone</p>
                <p className="text-ink">{billingInfo?.phone || '-'}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-4">
              Items ({order.items.length})
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bdr">
                  <th className="py-2 text-left font-normal text-ink">Product</th>
                  <th className="py-2 text-center font-normal text-ink">Qty</th>
                  <th className="py-2 text-right font-normal text-ink">Price</th>
                  <th className="py-2 text-right font-normal text-ink">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-bdr last:border-0">
                    <td className="py-3 text-ink-2">
                      {item.product?.name || item.productId}
                      {item.product?.brand && (
                        <span className="block text-xs text-ink-3">{item.product.brand}</span>
                      )}
                    </td>
                    <td className="py-3 text-center text-ink-2">{item.quantity}</td>
                    <td className="py-3 text-right text-ink-2 tabnum">
                      {formatRupees(Number(item.unitPrice))}
                    </td>
                    <td className="py-3 text-right font-normal text-ink tabnum">
                      {formatRupees(Number(item.totalPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Branding (logo + custom instructions) */}
          {(order.logoUrl || order.brandingNotes || order.cardMessage) && (
            <div className="rounded-md border-2 border-bdr bg-white p-5">
              <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-4">
                Branding
              </p>
              <div className="space-y-4 text-sm">
                {order.logoUrl && (
                  <div>
                    <p className="text-ink-3 text-xs mb-2">Customer Logo</p>
                    <div className="flex items-center gap-3">
                      <div className="h-20 w-20 rounded-md border border-bdr bg-elevated/50 flex items-center justify-center overflow-hidden">
                        {/\.(png|jpe?g|svg)$/i.test(order.logoUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={order.logoUrl} alt="Customer logo" className="max-h-full max-w-full object-contain p-1" />
                        ) : (
                          <FileDown className="h-7 w-7 text-ink-3" />
                        )}
                      </div>
                      <a
                        href={order.logoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-md border border-bdr text-em hover:bg-em-50 transition text-sm font-normal"
                      >
                        <FileDown className="w-4 h-4" />
                        Download
                      </a>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-ink-3 text-xs mb-1">Special Branding Instructions</p>
                  {order.brandingNotes ? (
                    <p className="text-ink whitespace-pre-wrap rounded-md border border-bdr bg-elevated/50 p-3">
                      {order.brandingNotes}
                    </p>
                  ) : (
                    <p className="text-ink-3 italic rounded-md border border-dashed border-bdr bg-elevated/30 p-3">
                      No special instructions provided.
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-ink-3 text-xs mb-1">Thank-You Card Message</p>
                  {order.cardMessage ? (
                    <p className="text-ink whitespace-pre-wrap rounded-md border border-bdr bg-elevated/50 p-3">
                      {order.cardMessage}
                    </p>
                  ) : (
                    <p className="text-ink-3 italic rounded-md border border-dashed border-bdr bg-elevated/30 p-3">
                      No thank-you message added.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-4">
              Order Timeline
            </p>
            <div className="space-y-3">
              {order.timeline.length === 0 ? (
                <p className="text-sm text-ink-3">No timeline entries</p>
              ) : (
                order.timeline.map((entry) => (
                  <div key={entry.id} className="pb-3 border-b border-bdr last:border-0">
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-normal mt-0.5 ${getStatusBadgeColor(
                          entry.status
                        )}`}
                      >
                        {getStatusLabel(entry.status)}
                      </span>
                      <div className="flex-1">
                        {entry.note && <p className="text-sm text-ink">{entry.note}</p>}
                        <p className="text-xs text-ink-3 mt-1">
                          {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Sticky) */}
        <div className="lg:sticky lg:top-20 lg:h-fit space-y-4 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto lg:pr-1">
          {/* Payment-pending notice (derived from mockup_approved + balance) */}
          {(() => {
            const amountPaid = Number((order.billingJson as any)?.amountPaid ?? 0);
            const balance = Math.max(0, Number(order.grandTotal) - amountPaid);
            if (!(order.status === 'mockup_approved' && balance > 0)) return null;
            return (
              <div className="rounded-md border-2 border-gold/40 bg-gold-50 p-4">
                <p className="text-xs font-normal uppercase tracking-wider text-gold-700 mb-1">
                  Payment Pending
                </p>
                <p className="text-sm text-ink-2 mb-3">
                  Mockup approved — awaiting customer balance of{' '}
                  <span className="font-normal text-ink tabnum">{formatRupees(balance)}</span>.
                  It moves to Production automatically once paid.
                </p>
                <div className="space-y-2">
                  <SendPaymentLinkButton orderId={order.id} />
                  <MarkPaidButton orderId={order.id} balanceDue={balance} />
                  <p className="text-[11px] text-ink-3">
                    Use "Mark Paid" when the customer has already paid (e.g. bank transfer).
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Status Updater */}
          <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />

          {/* Design Approval / Mockup */}
          <MockupPanel
            orderId={order.id}
            approvals={order.artworkApprovals.map((a) => ({
              id: a.id,
              revision: a.revision,
              fileUrl: a.fileUrl,
              token: a.token,
              status: a.status,
              revisionNotes: a.revisionNotes,
              approvedAt: a.approvedAt ? a.approvedAt.toISOString() : null,
              expiresAt: a.expiresAt.toISOString(),
              createdAt: a.createdAt.toISOString(),
            }))}
          />

          {/* SLA Log Display */}
          {order.slaLogs && order.slaLogs.length > 0 && (
            <div className="rounded-md border-2 border-bdr bg-white p-5">
              <SlaLogDisplay slaLogs={order.slaLogs} currentStatus={order.status} />
            </div>
          )}

          {/* Shiprocket Shipment */}
          {order.status === 'packed' && (
            <ShiprocketShipButton
              orderId={order.id}
              awbCode={order.awbCode || undefined}
              courierName={order.courierName || undefined}
              trackingUrl={order.trackingUrl || undefined}
            />
          )}

          {order.status !== 'packed' && order.awbCode && (
            <ShiprocketShipButton
              orderId={order.id}
              awbCode={order.awbCode}
              courierName={order.courierName || undefined}
              trackingUrl={order.trackingUrl || undefined}
            />
          )}

          {/* PDF Downloads */}
          <div className="rounded-md border-2 border-bdr bg-white p-4 space-y-2">
            <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-3">Download Documents</p>
            <a
              href={`/api/orders/${order.id}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-bdr text-em hover:bg-em-50 transition text-sm font-normal"
            >
              <FileDown className="w-4 h-4" />
              {invoiceLabel(
                Number((order.billingJson as any)?.amountPaid ?? 0),
                Number(order.grandTotal)
              )}
            </a>
            {/* Plain anchors, not <Link>: these point at API routes that stream a
                PDF. Link would try to client-side navigate to them as if they
                were pages. */}
            <a
              href={`/api/admin/orders/${order.id}/vendor-po`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-bdr text-em hover:bg-em-50 transition text-sm font-normal"
            >
              <FileDown className="w-4 h-4" />
              Vendor PO
            </a>
            <a
              href={`/api/admin/orders/${order.id}/spec-sheet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-bdr text-em hover:bg-em-50 transition text-sm font-normal"
            >
              <FileDown className="w-4 h-4" />
              Spec Sheet
            </a>
          </div>

          {/* Payment Status Card */}
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-3">Payment</p>
            {order.paidAt ? (
              <div className="space-y-2 text-sm">
                <span className="inline-block px-3 py-1.5 rounded-full text-xs font-normal bg-em-50 text-em-700">
                  Paid
                </span>
                <div>
                  <p className="text-ink-3 text-xs">Amount Received</p>
                  <p className="font-normal text-ink tabnum">
                    {formatRupees(Number((order.billingJson as any)?.amountPaid ?? 0))}
                    {(order.billingJson as any)?.paymentType === 'full' ? ' (full)' : ' (10% advance)'}
                  </p>
                </div>
                <div>
                  <p className="text-ink-3 text-xs">Razorpay Payment ID</p>
                  <p className="font-mono text-ink text-xs break-all">{order.razorpayPaymentId || '—'}</p>
                </div>
                <div>
                  <p className="text-ink-3 text-xs">Paid On</p>
                  <p className="text-ink">
                    {new Date(order.paidAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Balance still due → let admin email the payment link */}
                {(() => {
                  const amountPaid = Number((order.billingJson as any)?.amountPaid ?? 0);
                  const balance = Math.max(0, Number(order.grandTotal) - amountPaid);
                  if (balance <= 0) return null;
                  return (
                    <div className="pt-2 border-t border-bdr space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-3">Balance Pending</span>
                        <span className="font-normal text-ink tabnum">{formatRupees(balance)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-1">
                <span className="inline-block px-3 py-1.5 rounded-full text-xs font-normal bg-gold-50 text-gold-700">
                  Awaiting Payment
                </span>
                <p className="text-xs text-ink-3 mt-2">
                  Mockup-first order — no payment taken yet. Full payment is collected after mockup approval.
                </p>
              </div>
            )}
          </div>

          {/* Grand Total Card */}
          <div className="rounded-md bg-dark text-inv p-5">
            <p className="text-xs font-normal uppercase tracking-wider mb-4">Breakdown</p>
            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabnum">{formatRupees(Number(order.subtotal))}</span>
              </div>
              {Number(order.packagingAmount) > 0 && (
                <div className="flex justify-between">
                  <span>Packaging</span>
                  <span className="tabnum">+{formatRupees(Number(order.packagingAmount))}</span>
                </div>
              )}
              {Number(order.addonsAmount) > 0 && (
                <div className="flex justify-between">
                  <span>Add-ons</span>
                  <span className="tabnum">+{formatRupees(Number(order.addonsAmount))}</span>
                </div>
              )}
              {Number(order.shippingAmount) > 0 && (
                <div className="flex justify-between">
                  <span>Shipping (incl. GST)</span>
                  <span className="tabnum">+{formatRupees(Number(order.shippingAmount))}</span>
                </div>
              )}
              {/* GST — single combined line (shipping is already GST-inclusive) */}
              {Number(order.cgstAmount) + Number(order.sgstAmount) + Number(order.igstAmount) > 0 && (
                <div className="flex justify-between">
                  <span>GST</span>
                  <span className="tabnum">
                    +{formatRupees(Number(order.cgstAmount) + Number(order.sgstAmount) + Number(order.igstAmount))}
                  </span>
                </div>
              )}
              {Number(order.razorpayFee) > 0 && (
                <div className="flex justify-between">
                  <span>Payment Fee</span>
                  <span className="tabnum">
                    +{formatRupees(Number(order.razorpayFee))}
                  </span>
                </div>
              )}
            </div>
            <div className="border-t border-inv/20 pt-3">
              <div className="flex justify-between">
                <span className="font-normal">Total</span>
                <span className="text-2xl font-normal tabnum">
                  {formatRupees(Number(order.grandTotal))}
                </span>
              </div>
            </div>

            {/* Advance paid + pending balance (price-lock path) */}
            {order.paidAt && (() => {
              const amountPaid = Number((order.billingJson as any)?.amountPaid ?? 0);
              const isFull = (order.billingJson as any)?.paymentType === 'full';
              const balance = Math.max(0, Number(order.grandTotal) - amountPaid);
              return (
                <div className="mt-3 space-y-1.5 border-t border-inv/20 pt-3 text-sm">
                  <div className="flex justify-between text-em-200">
                    <span>Advance Paid ({isFull ? 'full' : '10%'})</span>
                    <span className="tabnum">−{formatRupees(amountPaid)}</span>
                  </div>
                  <div className="flex justify-between font-normal">
                    <span>Balance Pending</span>
                    <span className="tabnum">{formatRupees(balance)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* E-Invoice Card */}
          {order.gstBillType === 'B2B' && (
            <div className="rounded-md border-2 border-bdr bg-white p-5">
              <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-3">GST E-Invoice</p>
              <div className="rounded-md border border-bdr p-3 bg-elevated/50 text-sm text-ink-2 mb-3">
                <p>B2B invoice available for e-invoicing</p>
              </div>
              <Link
                href={`/admin/orders/${order.id}/einvoice`}
                className="block w-full px-4 py-2 rounded-md border border-em bg-em-50 text-em hover:bg-em-100 transition text-sm font-normal text-center"
              >
                Generate E-Invoice
              </Link>
            </div>
          )}

          {/* Modifications Section */}
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-3">Modifications</p>
            <Link
              href={`/admin/orders/${order.id}/modifications`}
              className="block w-full px-4 py-2 rounded-md border border-bdr hover:bg-canvas transition text-sm font-normal text-center text-ink"
            >
              View Changes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
