import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canAccessOrder } from '@/lib/order-access';

/**
 * GET /api/orders/[id]
 * Returns a single order for the customer confirmation / tracking views.
 * Readable by the buying company (either of the buyer's sign-in addresses) or a
 * super_admin.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                brand: true,
                images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
        timeline: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Ownership / role check
    if (!canAccessOrder(order, session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Shape a lean, number-coerced response (Decimals serialize as strings).
    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      packQuantity: order.packQuantity,
      deliveryMode: order.deliveryMode,
      deliveryDate: order.deliveryDate,
      logoUrl: order.logoUrl,
      cardMessage: order.cardMessage,
      createdAt: order.createdAt,
      subtotal: Number(order.subtotal),
      packagingAmount: Number(order.packagingAmount),
      addonsAmount: Number(order.addonsAmount),
      shippingAmount: Number(order.shippingAmount),
      cgstAmount: Number(order.cgstAmount),
      sgstAmount: Number(order.sgstAmount),
      igstAmount: Number(order.igstAmount),
      razorpayFee: Number(order.razorpayFee),
      grandTotal: Number(order.grandTotal),
      // Payment status (null on the no-payment mockup path)
      paidAt: order.paidAt,
      razorpayPaymentId: order.razorpayPaymentId,
      paymentType: (order.billingJson as any)?.paymentType ?? null,
      amountPaid: Number((order.billingJson as any)?.amountPaid ?? 0),
      items: order.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        name: it.product?.name || 'Product',
        brand: it.product?.brand || null,
        image: it.product?.images?.[0]?.url || null,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        totalPrice: Number(it.totalPrice),
      })),
      timeline: order.timeline.map((t) => ({
        status: t.status,
        note: t.note,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
