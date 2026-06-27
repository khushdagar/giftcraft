import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import { priceQuotePayload, advanceAmount } from '@/lib/quote-pricing';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { sendPaymentSuccessEmail } from '@/lib/email';

const round2 = (n: number) => Math.round(n * 100) / 100;

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
    const {
      quoteId,
      deliveryMode,
      cardMessage,
      billingJson,
      // Razorpay fields — present only when the customer paid (price-lock path).
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentType, // 'advance' | 'full'
    } = body;

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
    const products = payload.products || [];

    // ── Recompute pricing server-side (shared with the payment route) ───────
    // Never trust the totals baked into the quote. The same helper prices the
    // Razorpay order, so the amount charged always matches this saved total.
    const { pricing, isInterState, packQty } = priceQuotePayload(
      payload,
      billingJson?.state
    );

    // GST split: same state → CGST+SGST, any other state → IGST.
    const totalGst =
      Number(pricing.cgst || 0) + Number(pricing.sgst || 0) + Number(pricing.igst || 0);
    const cgstAmount = isInterState ? 0 : round2(totalGst / 2);
    const sgstAmount = isInterState ? 0 : round2(totalGst - cgstAmount); // exact halves
    const igstAmount = isInterState ? round2(totalGst) : 0;

    // ── Payment verification (price-lock path) ──────────────────────────────
    // When Razorpay fields are present the customer just paid. Verify the
    // signature before trusting it — a forged/invalid signature is rejected so
    // an order can never be marked paid without a real, matching payment.
    let paidAt: Date | null = null;
    let amountPaid = 0;
    if (razorpayPaymentId || razorpayOrderId || razorpaySignature) {
      const valid = verifyRazorpaySignature({
        razorpayOrderId,
        razorpayPaymentId,
        signature: razorpaySignature,
      });
      if (!valid) {
        return NextResponse.json(
          { error: 'Payment verification failed. Your card has not been charged for this order.' },
          { status: 400 }
        );
      }
      paidAt = new Date();
      amountPaid =
        paymentType === 'full' ? pricing.grandTotal : advanceAmount(pricing.grandTotal);
    }

    // Generate order number
    const orderCount = await prisma.order.count();
    const orderNumber = `GC${new Date().getFullYear()}${String(orderCount + 1).padStart(6, '0')}`;

    // Create the order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        placedById: session.user.id,
        status: 'confirmed',
        packQuantity: packQty,
        deliveryMode: deliveryMode || payload.deliveryMode || 'single',
        deliveryDate: payload.delivDate ? new Date(payload.delivDate) : null,
        cardMessage: cardMessage || payload.cardMessage || '',
        // Record how the order was paid alongside the billing details so the
        // confirmation/admin views can show the advance amount.
        billingJson: {
          ...(billingJson || {}),
          ...(paidAt ? { paymentType: paymentType || 'advance', amountPaid } : {}),
        },
        // Shipping address captured in the builder (Step 3)
        shippingJson: payload.address || undefined,

        // Payment (price-lock path) — verified above. Null on the no-payment
        // mockup path, where the order is confirmed without a charge.
        razorpayOrderId: paidAt ? razorpayOrderId : null,
        razorpayPaymentId: paidAt ? razorpayPaymentId : null,
        paidAt,

        // Branding (logo from brand asset library + custom notes) — SOW §3.3.9/§3.3.10
        logoUrl: payload.logoUrl || null,
        brandingNotes: payload.brandingNotes || '',

        // Money fields from the freshly recomputed pricing
        subtotal: new Decimal(pricing.subtotal || 0),
        packagingAmount: new Decimal(pricing.packaging || 0),
        addonsAmount: new Decimal(pricing.addons || 0),
        shippingAmount: new Decimal(pricing.shipping || 0),
        cgstAmount: new Decimal(cgstAmount),
        sgstAmount: new Decimal(sgstAmount),
        igstAmount: new Decimal(igstAmount),
        razorpayFee: new Decimal(pricing.razorpayFee || 0),
        grandTotal: new Decimal(pricing.grandTotal || 0),

        // Create order items. One unit of each product per pack, so total units
        // of a product = packQuantity.
        items: {
          create: products.map((product: any) => {
            const totalUnits = packQty;
            return {
              productId: product.id,
              quantity: totalUnits,
              unitPrice: new Decimal(product.sellPrice),
              totalPrice: new Decimal(Number(product.sellPrice) * totalUnits),
              hsnCode: product.hsnCode,
              gstRate: product.gstRate ? new Decimal(product.gstRate) : null,
            };
          }),
        },

        // Add timeline entry
        timeline: {
          create: {
            status: 'confirmed',
            note: paidAt
              ? `Order placed — ${paymentType === 'full' ? 'full payment' : '10% advance'} of ₹${amountPaid.toFixed(2)} received (Razorpay ${razorpayPaymentId})`
              : 'Order placed via mockup path',
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

    console.log('✅ Order created:', order.id, order.orderNumber, paidAt ? '(paid)' : '(mockup)');

    // Payment confirmation email (best-effort — never block the order on email).
    if (paidAt) {
      const email = billingJson?.email;
      if (email) {
        try {
          await sendPaymentSuccessEmail({
            customerEmail: email,
            customerName: billingJson?.name || billingJson?.companyName || 'there',
            orderNumber: order.orderNumber,
            orderId: order.id,
            amountPaid,
            paymentId: razorpayPaymentId,
            isAdvance: paymentType !== 'full',
            grandTotal: Number(pricing.grandTotal || 0),
          });
        } catch (e) {
          console.error('Payment email failed (non-blocking):', e);
        }
      }
    }

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
