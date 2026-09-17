import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureQuotePackImage } from '@/lib/pack-image-service';

export const dynamic = 'force-dynamic';
// Image generation routinely takes 15–40s.
export const maxDuration = 120;

/**
 * POST /api/quotes/[token]/pack-image
 * Makes sure the quote has its AI pack image before the proposal deck is built
 * — generated once with the same Gemini pipeline as admin proposals, then kept
 * on the quote. Same access as the deck itself (the share token).
 *
 * Always answers 200: `url` is null when the image could not be produced, and
 * the caller carries on to a deck without the pack photo.
 */
export async function POST(_req: Request, { params }: { params: { token: string } }) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { shareToken: params.token },
      select: { id: true, expiresAt: true },
    });
    if (!quote) return NextResponse.json({ success: false, error: 'Quote not found' }, { status: 404 });
    if (quote.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Quote expired' }, { status: 410 });
    }

    const url = await ensureQuotePackImage(quote.id);
    return NextResponse.json({ success: true, data: { url } });
  } catch (error) {
    console.error('Quote pack image error:', error);
    return NextResponse.json({ success: true, data: { url: null } });
  }
}
