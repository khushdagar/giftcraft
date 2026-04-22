import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { quoteId, billingJson, deliveryMode, cardMessage, razorpayOrderId, razorpayPaymentId } = body;

    // Fetch quote to get payload
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: { payload: true },
    });

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    const payload = quote.payload as any;

    // Generate orderNumber: GC-{YYYY}-{4-digit padded sequence}
    const year = new Date().getFullYear();
    const orderCount = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
        },
      },
    });
    const orderNumber = `GC-${year}-${String(orderCount + 1).padStart(4, '0')}`;

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        placedById: session.user.id,
        status: 'confirmed',
        packQuantity: payload.packQuantity || 50,
        deliveryMode: deliveryMode || 'single',
        billingJson,
        subtotal: new Decimal(payload.pricing?.subtotal || 0),
        packagingAmount: new Decimal(payload.pricing?.packaging || 0),
        addonsAmount: new Decimal(payload.pricing?.addons || 0),
        shippingAmount: new Decimal(payload.pricing?.shipping || 0),
        discountAmount: new Decimal(payload.pricing?.discount || 0),
        cgstAmount: new Decimal(payload.pricing?.cgst || 0),
        sgstAmount: new Decimal(payload.pricing?.sgst || 0),
        igstAmount: new Decimal(payload.pricing?.igst || 0),
        razorpayFee: new Decimal(payload.pricing?.razorpayFee || 0),
        grandTotal: new Decimal(payload.pricing?.grandTotal || 0),
        razorpayOrderId: razorpayOrderId || null,
        razorpayPaymentId: razorpayPaymentId || null,
        brandingNotes: cardMessage || '',

        // Create order items from quote products
        items: {
          createMany: {
            data: (payload.products || []).map((product: any) => ({
              productId: product.id,
              quantity: product.quantity,
              unitPrice: new Decimal(product.sellPrice),
              totalPrice: new Decimal(product.sellPrice * product.quantity),
              hsnCode: product.hsnCode || null,
              gstRate: product.gstRate ? new Decimal(product.gstRate) : null,
              printingTechnique: product.printingTechnique || null,
            })),
          },
        },
      },
      select: {
        id: true,
        orderNumber: true,
        grandTotal: true,
        createdAt: true,
      },
    });

    // Create initial OrderTimeline entry
    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        status: 'confirmed',
        note: `Order confirmed. Payment ID: ${razorpayPaymentId || 'N/A'}`,
        actorId: session.user.id,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
