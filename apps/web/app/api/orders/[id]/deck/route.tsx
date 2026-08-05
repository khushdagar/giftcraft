import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { renderProposalDeck } from '@/lib/proposal-deck';

// Product imagery is downloaded per request — never cache this route.
export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/[id]/deck
 * Proposal deck PDF for a placed order — the same document the buyer could
 * download from checkout, rebuilt from the saved order so it stays available
 * after confirmation (alongside the proforma/tax invoice). Owner or
 * super_admin only, matching /api/orders/[id]/invoice.
 *
 * Orders store packaging and add-ons as totals rather than line items, so those
 * amounts appear in the deck's GST table but not as their own product slides.
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
        items: true,
        company: { select: { name: true } },
      },
    });

    if (!order) return new Response('Order not found', { status: 404 });
    if (order.placedById !== session.user.id && session.user.role !== 'super_admin') {
      return new Response('Forbidden', { status: 403 });
    }

    const packQuantity = order.packQuantity || 1;
    const billing = (order.billingJson as any) || {};
    const shipping = (order.shippingJson as any) || {};

    // Rebuild the builder-shaped payload the deck renderer expects. Item
    // quantities are stored as total units, so they're divided back to
    // per-pack quantities the renderer re-multiplies.
    const payload = {
      packQuantity,
      logoUrl: order.logoUrl,
      address: { company: shipping.company || billing.company || null },
      products: order.items.map((item) => ({
        id: item.productId,
        quantity: Math.max(1, Math.round(item.quantity / packQuantity)),
        sellPrice: Number(item.unitPrice),
        hsnCode: item.hsnCode,
        gstRate: item.gstRate != null ? Number(item.gstRate) : 18,
        printingTechnique: item.printingTechnique,
      })),
      // No per-item breakdown survives on the order — pass the stored totals so
      // the GST table still matches the invoice exactly.
      packagingTotal: Number(order.packagingAmount),
      addonsTotal: Number(order.addonsAmount),
      pricing: {
        subtotal: Number(order.subtotal),
        shipping: Number(order.shippingAmount),
        razorpayFee: Number(order.razorpayFee),
        igst: Number(order.igstAmount),
        grandTotal: Number(order.grandTotal),
      },
    };

    const buffer = await renderProposalDeck(payload, {
      reference: order.orderNumber,
      validUntil: order.createdAt,
      companyName: order.company?.name || null,
      placed: true,
    });

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="givoo-proposal-${order.orderNumber}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    if ((error as Error)?.message === 'NO_PRODUCTS') {
      return new Response('This order has no products to present', { status: 422 });
    }
    console.error('Error generating order proposal deck:', error);
    return new Response('Failed to generate proposal deck', { status: 500 });
  }
}
