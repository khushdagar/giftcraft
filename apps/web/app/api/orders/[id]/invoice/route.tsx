import { renderToBuffer } from '@react-pdf/renderer';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { InvoicePDF, type InvoiceData } from '@/components/orders/invoice-pdf';

/**
 * GET /api/orders/[id]/invoice
 * GST invoice PDF for an order (SOW §3.5 / §3.7.4). Renders a Proforma Invoice
 * before payment and a Tax Invoice once paid. Owner or super_admin only.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    if (!order) {
      return new Response('Order not found', { status: 404 });
    }

    if (order.placedById !== session.user.id && session.user.role !== 'super_admin') {
      return new Response('Forbidden', { status: 403 });
    }

    const billing = (order.billingJson as any) || {};
    const buyerAddress = [billing.address1, billing.address2, billing.city, billing.pincode]
      .filter(Boolean)
      .join(', ');

    // A 10% advance does NOT make this a full Tax Invoice — it stays a Proforma
    // (showing advance paid + balance pending) until the order is fully paid.
    const grandTotal = Number(order.grandTotal);
    const amountPaid = Number(billing.amountPaid ?? 0);
    const isFullyPaid = amountPaid > 0 && amountPaid >= grandTotal - 0.01;

    const data: InvoiceData = {
      invoiceNumber: `INV-${order.orderNumber}`,
      invoiceDate: (order.paidAt ?? order.createdAt).toISOString(),
      isPaid: isFullyPaid,
      payment: {
        amountPaid,
        paymentType: billing.paymentType ?? null,
        paidAt: order.paidAt ? order.paidAt.toISOString() : null,
      },
      seller: {
        name: 'Arts Shala',
        gstin: process.env.SELLER_GSTIN || '07AAAAA0000A1Z5',
        stateCode: process.env.SELLER_STATE_CODE || 'DL',
        address: 'New Delhi, India',
      },
      buyer: {
        companyName: billing.companyName || billing.name || '—',
        gstin: billing.gstin || null,
        address: buyerAddress,
        state: billing.state || '',
        email: billing.email || null,
        phone: billing.phone || null,
      },
      items: order.items.map((it) => ({
        name: it.product?.name || 'Product',
        hsnCode: it.hsnCode,
        gstRate: it.gstRate != null ? Number(it.gstRate) : null,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        taxableValue: Number(it.totalPrice),
      })),
      amounts: {
        subtotal: Number(order.subtotal),
        packaging: Number(order.packagingAmount),
        addons: Number(order.addonsAmount),
        shipping: Number(order.shippingAmount),
        discount: Number(order.discountAmount),
        cgst: Number(order.cgstAmount),
        sgst: Number(order.sgstAmount),
        igst: Number(order.igstAmount),
        razorpayFee: Number(order.razorpayFee),
        grandTotal: Number(order.grandTotal),
      },
    };

    const buffer = await renderToBuffer(<InvoicePDF data={data} />);

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${order.orderNumber}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return new Response('Failed to generate invoice', { status: 500 });
  }
}
