import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import Link from 'next/link';
import { OrderStatusUpdater } from './components/order-status-updater';
import { ShiprocketShipButton } from './components/shiprocket-ship-button';
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
      items: true,
      timeline: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order) {
    redirect('/admin/orders');
  }

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
        <span className="font-semibold text-ink">{order.orderNumber}</span>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Order Summary Card */}
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Order</p>
                <p className="text-2xl font-black text-ink">{order.orderNumber}</p>
              </div>
              <span
                className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                  order.status
                )}`}
              >
                {getStatusLabel(order.status)}
              </span>
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
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">
              Billing Details
            </p>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-ink-3 text-xs">Company</p>
                <p className="font-semibold text-ink">{billingInfo?.companyName || '-'}</p>
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
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
              Items ({order.items.length})
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bdr">
                  <th className="py-2 text-left font-semibold text-ink">Product</th>
                  <th className="py-2 text-center font-semibold text-ink">Qty</th>
                  <th className="py-2 text-right font-semibold text-ink">Price</th>
                  <th className="py-2 text-right font-semibold text-ink">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-bdr last:border-0">
                    <td className="py-3 text-ink-2">{item.productId}</td>
                    <td className="py-3 text-center text-ink-2">{item.quantity}</td>
                    <td className="py-3 text-right text-ink-2 tabnum">
                      {formatRupees(Number(item.unitPrice))}
                    </td>
                    <td className="py-3 text-right font-semibold text-ink tabnum">
                      {formatRupees(Number(item.totalPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Timeline */}
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
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
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-0.5 ${getStatusBadgeColor(
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
        <div className="lg:sticky lg:top-20 lg:h-fit space-y-4">
          {/* Status Updater */}
          <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />

          {/* Shiprocket Shipment */}
          {order.status === 'packed' && (
            <ShiprocketShipButton
              orderId={order.id}
              awbCode={order.awbCode || undefined}
              courierName={order.courierName || undefined}
              trackingUrl={order.trackingUrl || undefined}
            />
          )}

          {order.status === 'shipped' && order.awbCode && (
            <ShiprocketShipButton
              orderId={order.id}
              awbCode={order.awbCode}
              courierName={order.courierName || undefined}
              trackingUrl={order.trackingUrl || undefined}
            />
          )}

          {/* PDF Downloads */}
          <div className="rounded-md border-2 border-bdr bg-white p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">Download Documents</p>
            <Link
              href={`/api/admin/orders/${order.id}/vendor-po`}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-bdr text-em hover:bg-em-50 transition text-sm font-semibold"
            >
              <FileDown className="w-4 h-4" />
              Vendor PO
            </Link>
            <Link
              href={`/api/admin/orders/${order.id}/spec-sheet`}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-bdr text-em hover:bg-em-50 transition text-sm font-semibold"
            >
              <FileDown className="w-4 h-4" />
              Spec Sheet
            </Link>
          </div>

          {/* Grand Total Card */}
          <div className="rounded-md bg-dark text-inv p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-4">Breakdown</p>
            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabnum">{formatRupees(Number(order.subtotal))}</span>
              </div>
              {Number(order.cgstAmount) > 0 && (
                <div className="flex justify-between">
                  <span>CGST (9%)</span>
                  <span className="tabnum">
                    +{formatRupees(Number(order.cgstAmount))}
                  </span>
                </div>
              )}
              {Number(order.sgstAmount) > 0 && (
                <div className="flex justify-between">
                  <span>SGST (9%)</span>
                  <span className="tabnum">
                    +{formatRupees(Number(order.sgstAmount))}
                  </span>
                </div>
              )}
              {Number(order.igstAmount) > 0 && (
                <div className="flex justify-between">
                  <span>IGST (18%)</span>
                  <span className="tabnum">
                    +{formatRupees(Number(order.igstAmount))}
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
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-black tabnum">
                  {formatRupees(Number(order.grandTotal))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* E-Invoice Card */}
          {order.gstBillType === 'B2B' && (
            <div className="rounded-md border-2 border-bdr bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">GST E-Invoice</p>
              <div className="rounded-md border border-bdr p-3 bg-elevated/50 text-sm text-ink-2 mb-3">
                <p>B2B invoice available for e-invoicing</p>
              </div>
              <Link
                href={`/admin/orders/${order.id}/einvoice`}
                className="block w-full px-4 py-2 rounded-md border border-em bg-em-50 text-em hover:bg-em-100 transition text-sm font-semibold text-center"
              >
                Generate E-Invoice
              </Link>
            </div>
          )}

          {/* Modifications Section */}
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">Modifications</p>
            <Link
              href={`/admin/orders/${order.id}/modifications`}
              className="block w-full px-4 py-2 rounded-md border border-bdr hover:bg-canvas transition text-sm font-semibold text-center text-ink"
            >
              View Changes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
