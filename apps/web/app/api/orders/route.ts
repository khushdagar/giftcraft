import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import { priceQuotePayload, advanceAmount } from '@/lib/quote-pricing';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { sendPaymentSuccessEmail, sendOrderConfirmationEmail } from '@/lib/email';
import { renderInvoiceBuffer } from '@/lib/invoice';
import { invoiceLabel } from '@/lib/invoice-status';

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
    const { pricing, isInterState, packQty, hsnByProductId } = await priceQuotePayload(
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
            // Snapshot the same DB-resolved tax identity the pricing above used,
            // so the invoice can never disagree with the amount charged.
            const resolved = hsnByProductId.get(product.id);
            return {
              productId: product.id,
              quantity: totalUnits,
              unitPrice: new Decimal(product.sellPrice),
              totalPrice: new Decimal(Number(product.sellPrice) * totalUnits),
              hsnCode: resolved?.hsnCode ?? null,
              gstRate: resolved ? new Decimal(resolved.gstRate) : null,
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

    // Order email (best-effort — never block the order on email). The paid path
    // sends a payment receipt; the no-payment "mockup" path sends a plain order
    // confirmation so the customer always gets an email when they order. Both
    // include the full price breakdown and a proforma-invoice PDF attachment.
    const email = billingJson?.email || session.user.email;
    if (email) {
      const customerName = billingJson?.name || billingJson?.companyName || 'there';

      // Full price breakdown — same line items the customer saw at checkout.
      const amounts = {
        subtotal: Number(pricing.subtotal || 0),
        packaging: Number(pricing.packaging || 0),
        addons: Number(pricing.addons || 0),
        shipping: Number(pricing.shipping || 0),
        cgst: cgstAmount,
        sgst: sgstAmount,
        igst: igstAmount,
        razorpayFee: Number(pricing.razorpayFee || 0),
        grandTotal: Number(pricing.grandTotal || 0),
      };

      // Re-fetch with items+product to build the invoice PDF and the email line
      // items reliably (product names come from the DB, not the quote payload).
      const fullOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: { include: { product: { select: { name: true } } } } },
      });

      // Generate the invoice PDF as an attachment (best-effort). The filename
      // must track the heading inside the PDF — a 10% advance still ships a
      // proforma, so it can't be hardcoded either way.
      let attachments: { filename: string; content: Buffer }[] | undefined;
      try {
        if (fullOrder) {
          const pdf = await renderInvoiceBuffer(fullOrder);
          const slug = invoiceLabel(amountPaid, Number(pricing.grandTotal || 0))
            .toLowerCase()
            .replace(/\s+/g, '-');
          attachments = [{ filename: `${slug}-${order.orderNumber}.pdf`, content: pdf }];
        }
      } catch (e) {
        console.error('Invoice PDF generation failed (non-blocking):', e);
      }

      const emailItems = (fullOrder?.items || []).map((it) => ({
        name: it.product?.name || 'Product',
        unitPrice: Number(it.unitPrice),
        quantity: it.quantity,
      }));

      try {
        if (paidAt) {
          await sendPaymentSuccessEmail({
            customerEmail: email,
            customerName,
            orderNumber: order.orderNumber,
            orderId: order.id,
            amountPaid,
            paymentId: razorpayPaymentId,
            isAdvance: paymentType !== 'full',
            grandTotal: Number(pricing.grandTotal || 0),
            amounts,
            attachments,
          });
        } else {
          await sendOrderConfirmationEmail({
            customerEmail: email,
            customerName,
            orderNumber: order.orderNumber,
            orderId: order.id,
            packQuantity: packQty,
            amounts,
            items: emailItems,
            attachments,
          });
        }
      } catch (e) {
        console.error('Order email failed (non-blocking):', e);
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
