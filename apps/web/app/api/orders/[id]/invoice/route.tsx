import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { renderInvoiceBuffer } from '@/lib/invoice';

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

    const buffer = await renderInvoiceBuffer(order);

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
