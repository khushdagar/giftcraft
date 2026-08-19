import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { packSchema, buildPackPayload, type PackInput } from '@/lib/proposal-pack';
import { renderMultiProposalDeck } from '@/lib/proposal-deck';

// Images are downloaded per request while rendering — never cache this.
export const dynamic = 'force-dynamic';

const previewSchema = z.object({
  companyName: z.string().max(160).optional(),
  packs: z.array(packSchema).min(1).max(6),
});

/**
 * POST /api/admin/proposals/preview
 * The proposal deck PDF for a draft, exactly as the recipient will receive it:
 * same pack builder (server-side price tiers, HSN/GST, payment fee) and the
 * same deck renderer the real send attaches to the email. Persists nothing,
 * mints no share tokens, sends no email — it just returns the PDF bytes so the
 * admin can read it before committing.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return new Response('Unauthorized', { status: 403 });
  }

  try {
    const body = previewSchema.parse(await req.json());

    const packs: { label: string; tagline: string | null; payload: any }[] = [];
    for (const [i, pack] of (body.packs as PackInput[]).entries()) {
      const result = await buildPackPayload(pack);
      if (!result) {
        return new Response(`Pack ${i + 1} has no valid products selected`, { status: 400 });
      }
      packs.push({
        label: pack.label?.trim() || `Pack ${i + 1}`,
        tagline: pack.tagline?.trim() || null,
        payload: result.payload,
      });
    }

    // The live send stamps 30 days' validity — show the same date, so the
    // preview's "valid until" is not a surprise once it goes out.
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const buffer = await renderMultiProposalDeck(packs, {
      reference: '#PREVIEW',
      validUntil,
      companyName: body.companyName || null,
    });

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // Inline — the admin reads it in the dialog; the download button in the
        // dialog saves it if wanted.
        'Content-Disposition': 'inline; filename="givoo-proposal-preview.pdf"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return new Response(error.errors[0]?.message || 'Invalid input', { status: 400 });
    }
    if ((error as Error)?.message === 'NO_PRODUCTS') {
      return new Response('This proposal has no products to present', { status: 422 });
    }
    console.error('Proposal preview deck error:', error);
    return new Response('Failed to build preview', { status: 500 });
  }
}
