import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { quoteId, deliveryMode, cardMessage, billingJson } = body;

    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      );
    }

    // Fetch the quote by shareToken (not id)
    const quote = await prisma.quote.findUnique({
      where: { shareToken: quoteId },
    });

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    const payload = quote.payload as any;
    const pricing = payload.pricing || {};
    const products = payload.products || [];

    // Generate order number
    const orderCount = await prisma.order.count();
    const orderNumber = `GC${new Date().getFullYear()}${String(orderCount + 1).padStart(6, '0')}`;

    // Create the order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        placedById: session.user.id,
        status: 'confirmed',
        packQuantity: payload.packQuantity || 1,
        deliveryMode: deliveryMode || 'single',
        cardMessage: cardMessage || '',
        billingJson: billingJson || {},

        // Money fields from pricing
        subtotal: new Decimal(pricing.subtotal || 0),
        packagingAmount: new Decimal(pricing.packagingAmount || 0),
        addonsAmount: new Decimal(pricing.addonsAmount || 0),
        shippingAmount: new Decimal(pricing.shipping || 0),
        cgstAmount: new Decimal(pricing.cgst || 0),
        sgstAmount: new Decimal(pricing.sgst || 0),
        igstAmount: new Decimal(pricing.igst || 0),
        razorpayFee: new Decimal(pricing.razorpayFee || 0),
        grandTotal: new Decimal(pricing.grandTotal || 0),

        // Create order items
        items: {
          create: products.map((product: any) => ({
            productId: product.id,
            quantity: product.quantity,
            unitPrice: new Decimal(product.sellPrice),
            totalPrice: new Decimal(product.sellPrice * product.quantity),
            hsnCode: product.hsnCode,
            gstRate: product.gstRate ? new Decimal(product.gstRate) : null,
          })),
        },

        // Add timeline entry
        timeline: {
          create: {
            status: 'confirmed',
            note: 'Order placed via mockup path',
            actorId: session.user.id,
          },
        },
      },
    });

    // Update quote status to converted
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'converted' },
    });

    console.log('✅ Order created:', order.id, order.orderNumber);

    return NextResponse.json(
      {
        success: true,
        id: order.id,
        orderNumber: order.orderNumber,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error creating order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
