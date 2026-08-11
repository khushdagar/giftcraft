import { prisma } from '@/lib/prisma';
import { renderMultiProposalDeck } from '@/lib/proposal-deck';

// Images are downloaded per request, so this route must never be statically
// rendered or cached — each proposal resolves to a different deck.
export const dynamic = 'force-dynamic';

/**
 * GET /api/proposals/[token]/deck
 * ONE deck covering every pack option in a proposal: a comparison slide, then
 * the full slide set per option. Keyed off the proposal's share token.
 */
export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const proposal = await prisma.proposal.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        companyName: true,
        quote: { select: { payload: true, expiresAt: true } },
        packs: {
          orderBy: { sortOrder: 'asc' },
          select: { label: true, tagline: true, quote: { select: { payload: true } } },
        },
      },
    });

    if (!proposal) return new Response('Proposal not found', { status: 404 });
    if (proposal.quote.expiresAt < new Date()) {
      return new Response('Proposal expired', { status: 410 });
    }

    // Proposals created before multi-pack existed have no pack rows — fall
    // back to the primary quote as the single option.
    const packs =
      proposal.packs.length > 0
        ? proposal.packs.map((p) => ({
            label: p.label,
            tagline: p.tagline,
            payload: p.quote.payload as any,
          }))
        : [{ label: 'Your pack', tagline: null, payload: proposal.quote.payload as any }];

    const buffer = await renderMultiProposalDeck(packs, {
      reference: `#${proposal.id.slice(0, 8).toUpperCase()}`,
      validUntil: proposal.quote.expiresAt,
      companyName: proposal.companyName,
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
      return new Response('This proposal has no products to present', { status: 422 });
    }
    console.error('Error generating proposal deck:', error);
    return new Response('Failed to generate proposal deck', { status: 500 });
  }
}
