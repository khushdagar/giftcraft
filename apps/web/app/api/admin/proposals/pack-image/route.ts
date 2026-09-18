import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { PackImageError } from '@/lib/gemini-pack-image';
import { createPackImageDetailed, PACK_IMAGE_MAX_PRODUCTS } from '@/lib/pack-image-service';

export const dynamic = 'force-dynamic';
// Image generation routinely takes 15–40s.
export const maxDuration = 120;

const bodySchema = z.object({
  productIds: z.array(z.string()).min(1).max(PACK_IMAGE_MAX_PRODUCTS),
  // Packaging product id; the builder may send a `<id>-<size>` snapshot id.
  boxId: z.string().max(120).nullable().optional(),
  // Client logo uploaded in the builder — printed on the box lid.
  logoUrl: z.string().url().max(1000).nullable().optional(),
  // Recorded with the image for the Generated Images tab.
  packLabel: z.string().max(80).nullable().optional(),
  companyName: z.string().max(160).nullable().optional(),
});

/**
 * POST /api/admin/proposals/pack-image
 * Generates the AI pack shot (chosen box with the selected products packed
 * inside), stores it on Spaces and returns its CDN URL. The builder keeps the
 * URL on the pack and sends it along with preview/send as `packImageUrl`.
 * Generation itself lives in lib/pack-image-service — shared with the customer
 * quote/order decks so every proposal gets the same image pipeline.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = bodySchema.parse(await req.json());
    // leftOut = products too large for a gift box, kept out of the shot.
    const { url, leftOut } = await createPackImageDetailed({ ...body, createdById: session.user.id });
    return NextResponse.json({ success: true, data: { url, leftOut } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Invalid input' }, { status: 400 });
    }
    if (error instanceof PackImageError) {
      const noProducts = /^(No valid products|Every selected product)/.test(error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: noProducts ? 400 : 502 });
    }
    console.error('Pack image generation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate pack image' }, { status: 500 });
  }
}
