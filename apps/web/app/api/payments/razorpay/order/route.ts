import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createRazorpayOrder, isRazorpayConfigured, RAZORPAY_KEY_ID } from '@/lib/razorpay';
import { priceQuotePayload, advanceAmount } from '@/lib/quote-pricing';

/**
 * POST /api/payments/razorpay/order
 *
 * Creates a Razorpay Order for a quote so the checkout popup can collect
 * payment. The amount is ALWAYS computed server-side from the quote (never
 * trusted from the client) and matches the order grand total that will be saved.
 *
 * Body: { quoteId: string, paymentType?: 'advance' | 'full', billingState?: string }
 *   - 'advance' (default): 10% of grand total (price-lock path)
 *   - 'full': the full grand total
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: 'Payments are not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { quoteId, paymentType = 'advance', billingState } = body;

    if (!quoteId) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 });
    }

    const quote = await prisma.quote.findUnique({ where: { shareToken: quoteId } });
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const payload = quote.payload as any;
    const { pricing } = priceQuotePayload(payload, billingState);

    const amountRupees =
      paymentType === 'full' ? pricing.grandTotal : advanceAmount(pricing.grandTotal);

    if (!(amountRupees > 0)) {
      return NextResponse.json({ error: 'Nothing to pay for this quote.' }, { status: 400 });
    }

    const rzpOrder = await createRazorpayOrder({
      amountPaise: Math.round(amountRupees * 100),
      // Razorpay receipt max length is 40 chars.
      receipt: `q_${quote.id}`.slice(0, 40),
      notes: {
        quoteId,
        paymentType,
        placedById: session.user.id,
      },
    });

    return NextResponse.json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount, // paise
      currency: rzpOrder.currency,
      keyId: RAZORPAY_KEY_ID,
      paymentType,
      grandTotal: pricing.grandTotal,
    });
  } catch (error: any) {
    console.error('❌ Error creating Razorpay order:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to start payment' },
      { status: 500 }
    );
  }
}
