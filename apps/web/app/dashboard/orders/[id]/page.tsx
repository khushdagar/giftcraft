import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { formatRupees } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Draft",
    quote_sent: "Quote Sent",
    confirmed: "Confirmed",
    mockup_pending: "Mockup Review",
    mockup_approved: "Approved",
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
  if (status === "mockup_pending") return "gold";
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
    },
  });

  if (!order || order.placedById !== session.user.id) {
    return (
      <div className="max-w-2xl space-y-6">
        <Link href="/dashboard/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-em hover:underline">
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
      <Link href="/dashboard/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-em hover:underline">
        <ChevronLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="overline text-ink-3">Order Details</p>
          <h1 className="mt-1 text-3xl font-black">#{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-ink-3">
            Created {new Date(order.createdAt).toLocaleDateString('en-IN')}
          </p>
        </div>
        <Badge variant={getStatusVariant(order.status)}>
          {getStatusLabel(order.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="rounded-md border-2 border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4">
              Items
            </p>
            <div className="space-y-3">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{item.product?.name || 'Product'}</p>
                    <p className="text-xs text-gray-500">×{item.quantity}</p>
                  </div>
                  <p className="font-bold text-sm tabular-nums">
                    {formatRupees(Number(item.totalPrice))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Billing Info */}
          <div className="rounded-md border-2 border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4">
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
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4">
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
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              Pricing
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatRupees(Number(order.subtotal))}</span>
              </div>

              {Number(order.shippingAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">+{formatRupees(Number(order.shippingAmount))}</span>
                </div>
              )}

              {Number(order.packagingAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Packaging</span>
                  <span className="font-medium">+{formatRupees(Number(order.packagingAmount))}</span>
                </div>
              )}

              {Number(order.cgstAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">CGST</span>
                  <span className="font-medium">+{formatRupees(Number(order.cgstAmount))}</span>
                </div>
              )}

              {Number(order.sgstAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">SGST</span>
                  <span className="font-medium">+{formatRupees(Number(order.sgstAmount))}</span>
                </div>
              )}

              {Number(order.igstAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">IGST</span>
                  <span className="font-medium">+{formatRupees(Number(order.igstAmount))}</span>
                </div>
              )}

              {Number(order.razorpayFee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Gateway Fee</span>
                  <span className="font-medium">+{formatRupees(Number(order.razorpayFee))}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                <span>Grand Total</span>
                <span>{formatRupees(Number(order.grandTotal))}</span>
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="rounded-md border-2 border-gray-200 bg-white p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
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
        </div>
      </div>
    </div>
  );
}
