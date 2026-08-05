import { prisma } from '@/lib/prisma';
import { renderProposalDeck } from '@/lib/proposal-deck';

// Images are downloaded per request, so this route must never be statically
// rendered or cached — each quote resolves to a different deck.
export const dynamic = 'force-dynamic';

/**
 * GET /api/quotes/[token]/deck
 * Proposal deck PDF for a live quote. The same document is available after the
 * order is placed via /api/orders/[id]/deck.
 */
export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const quote = await prisma.quote.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        payload: true,
        expiresAt: true,
        company: { select: { name: true } },
        createdBy: { select: { company: { select: { name: true } } } },
      },
    });

    if (!quote) return new Response('Quote not found', { status: 404 });
    if (quote.expiresAt < new Date()) {
      return new Response('Quote expired', { status: 410 });
    }

    const buffer = await renderProposalDeck(quote.payload as any, {
      reference: `#${quote.id.slice(0, 8).toUpperCase()}`,
      validUntil: quote.expiresAt,
      companyName: quote.company?.name || quote.createdBy?.company?.name || null,
    });

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="givoo-proposal-${token}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    if ((error as Error)?.message === 'NO_PRODUCTS') {
      return new Response('This quote has no products to present', { status: 422 });
    }
    console.error('Error generating proposal deck:', error);
    return new Response('Failed to generate proposal deck', { status: 500 });
  }
}
