import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import { priceQuotePayload, advanceAmount } from '@/lib/quote-pricing';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { sendPaymentSuccessEmail, sendOrderConfirmationEmail } from '@/lib/email';
import { renderInvoiceBuffer } from '@/lib/invoice';
import { invoiceLabel } from '@/lib/invoice-status';
import { sendPushToAdmins } from '@/lib/push';
import { z } from 'zod';
import { zEmail, zGstin, zPan, zPhone, zPincode } from '@/lib/zod-fields';
import { nanoid } from 'nanoid';
import { stateNameToCode } from '@/lib/pincode-to-state';

const round2 = (n: number) => Math.round(n * 100) / 100;

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'company';

/**
 * Persist the billing block the buyer filled in at checkout to their company
 * profile, so /dashboard/company reflects it instead of staying blank.
 *
 * First order → creates the Company and links the user (self-serve signup never
 * captures one). Later orders → fills only the fields still empty on the
 * profile, so a detail the buyer deliberately edited in their dashboard is
 * never clobbered by a stale value carried in a checkout form.
 *
 * Returns the company id so the order can be tied to it.
 */
async function syncCompanyFromBilling(
  userId: string,
  billing: Record<string, any> | null | undefined
): Promise<string | null> {
  const str = (v: unknown) => String(v ?? '').trim();
  const name = str(billing?.companyName);

  const existing = await prisma.company.findFirst({
    where: { users: { some: { id: userId } } },
  });

  if (existing) {
    // Only backfill blanks — the dashboard profile is the source of truth.
    const fill = (current: string | null, incoming: string) =>
      current && current.trim() ? undefined : incoming || undefined;

    const state = fill(existing.state, str(billing?.state));
    const data = {
      gstin: fill(existing.gstin, str(billing?.gstin)),
      pan: fill(existing.pan, str(billing?.pan)),
      addressLine: fill(
        existing.addressLine,
        [str(billing?.address1), str(billing?.address2)].filter(Boolean).join(', ')
      ),
      city: fill(existing.city, str(billing?.city)),
      state,
      stateCode: state ? stateNameToCode(state) : undefined,
      pincode: fill(existing.pincode, str(billing?.pincode)),
      phone: fill(existing.phone, str(billing?.phone)),
    };

    if (Object.values(data).some((v) => v !== undefined)) {
      await prisma.company.update({ where: { id: existing.id }, data });
    }
    return existing.id;
  }

  // No company yet — create one from the billing block. Needs a name at minimum.
  if (!name) return null;

  const state = str(billing?.state);
  const created = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name,
        slug: `${slugify(name)}-${nanoid(8)}`,
        gstin: str(billing?.gstin) || null,
        pan: str(billing?.pan) || null,
        addressLine:
          [str(billing?.address1), str(billing?.address2)].filter(Boolean).join(', ') || null,
        city: str(billing?.city) || null,
        state: state || null,
        stateCode: state ? stateNameToCode(state) : null,
        pincode: str(billing?.pincode) || null,
        phone: str(billing?.phone) || null,
      },
    });
    await tx.user.update({ where: { id: userId }, data: { companyId: company.id } });
    return company;
  });

  return created.id;
}

// The billing block is stored verbatim on the order and printed on the invoice,
// so its contact/tax fields are validated here rather than trusted from the
// client. Unknown keys pass through; empty optional values are allowed.
const BillingJsonSchema = z
  .object({
    email: zEmail.optional().or(z.literal('')),
    phone: zPhone.optional().or(z.literal('')),
    pincode: zPincode.optional().or(z.literal('')),
    gstin: zGstin.optional().or(z.literal('')),
    pan: zPan.optional().or(z.literal('')),
  })
  .passthrough();

// List the authenticated user's own orders. Used by flows that need to pick an
// order (e.g. raising a dispute against a delivered order). Scoped to the
// logged-in user — never returns another user's orders.
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { placedById: session.user.id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryDate: true,
        grandTotal: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        deliveryDate: o.deliveryDate ? o.deliveryDate.toISOString() : null,
        grandTotal: Number(o.grandTotal),
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('❌ Error listing orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

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

    if (billingJson) {
      const parsedBilling = BillingJsonSchema.safeParse(billingJson);
      if (!parsedBilling.success) {
        return NextResponse.json(
          { error: parsedBilling.error.errors[0]?.message || 'Invalid billing details' },
          { status: 400 }
        );
      }
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

    // Save the billing/company details to the buyer's company profile so they
    // show up in the dashboard (and pre-fill the next checkout). Best-effort —
    // an order must never fail because of the profile write.
    let companyId: string | null = null;
    try {
      companyId = await syncCompanyFromBilling(session.user.id, billingJson);
    } catch (e) {
      console.error('Saving company details from billing failed (non-blocking):', e);
    }

    // Generate order number
    const orderCount = await prisma.order.count();
    const orderNumber = `GC${new Date().getFullYear()}${String(orderCount + 1).padStart(6, '0')}`;

    // Create the order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        placedById: session.user.id,
        companyId,
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
              // Carry the builder's chosen variants through from the quote
              // payload so both dashboards show which colour/size was ordered.
              variantsJson: product.variants?.length ? product.variants : undefined,
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

    // Save the delivery address to the buyer's address book so it's available in
    // their dashboard and pre-fillable on the next order. Best-effort — never
    // block the order on this. De-duped on the key fields (line 1 + pincode +
    // contact) so repeat orders to the same place don't pile up duplicates.
    try {
      const addr = payload.address;
      const line1 = String(addr?.address1 || '').trim();
      const pin = String(addr?.pincode || '').trim();
      const contact = String(addr?.name || '').trim();
      if (line1 && contact && /^\d{6}$/.test(pin)) {
        const existing = await prisma.savedAddress.findFirst({
          where: {
            userId: session.user.id,
            pincode: pin,
            addressLine1: { equals: line1, mode: 'insensitive' },
            contactName: { equals: contact, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (!existing) {
          const savedCount = await prisma.savedAddress.count({
            where: { userId: session.user.id },
          });
          await prisma.savedAddress.create({
            data: {
              userId: session.user.id,
              contactName: contact,
              company: String(addr.company || '').trim() || null,
              addressLine1: line1,
              addressLine2: String(addr.address2 || '').trim() || null,
              city: String(addr.city || '').trim(),
              state: String(addr.state || '').trim(),
              pincode: pin,
              phone: String(addr.phone || '').trim() || null,
              // The buyer's first-ever saved address becomes their default.
              isDefault: savedCount === 0,
            },
          });
        }
      }
    } catch (e) {
      console.error('Saving delivery address to address book failed (non-blocking):', e);
    }

    console.log('✅ Order created:', order.id, order.orderNumber, paidAt ? '(paid)' : '(mockup)');

    // Notify admins of the new order (best-effort desktop push).
    sendPushToAdmins({
      title: `New order ${order.orderNumber}`,
      body: `${packQty} packs — needs processing.`,
      url: `/admin/orders/${order.id}`,
      tag: `order-${order.id}`,
    }).catch(() => {});

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
