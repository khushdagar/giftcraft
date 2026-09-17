import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { PackImageError } from '@/lib/gemini-pack-image';
import { createPackImage, PACK_IMAGE_MAX_PRODUCTS } from '@/lib/pack-image-service';

export const dynamic = 'force-dynamic';
// Image generation routinely takes 15–40s.
export const maxDuration = 120;

const shortText = z.string().max(80).nullable().optional();

const bodySchema = z
  .object({
    productIds: z.array(z.string()).max(PACK_IMAGE_MAX_PRODUCTS).default([]),
    // Uploaded products that are not in the catalogue (photo + name).
    customItems: z
      .array(
        z.object({
          key: z.string().min(1).max(40),
          name: z.string().min(1).max(120),
          imageUrl: z.string().url().max(1000),
        })
      )
      .max(PACK_IMAGE_MAX_PRODUCTS)
      .default([]),
    boxId: z.string().max(120).nullable().optional(),
    boxColour: shortText,
    logoUrl: z.string().url().max(1000).nullable().optional(),
    // BRANDING MAP — keyed by product id or custom item key. A missing key
    // follows the catalogue branding method.
    brandingMap: z
      .record(
        z.object({
          apply: z.boolean(),
          technique: shortText,
          logoColour: shortText,
          position: shortText,
        })
      )
      .default({}),
    label: z.string().max(80).nullable().optional(),
    companyName: z.string().max(160).nullable().optional(),
  })
  .refine((b) => b.productIds.length + b.customItems.length > 0, {
    message: 'Add at least one product',
  })
  .refine((b) => b.productIds.length + b.customItems.length <= PACK_IMAGE_MAX_PRODUCTS, {
    message: `A mockup holds at most ${PACK_IMAGE_MAX_PRODUCTS} products`,
  });

/**
 * POST /api/admin/mockups
 * Standalone mockup generator: box + products (catalogue or uploaded) + client
 * logo + manual branding map + box colour. Same pipeline as proposal pack
 * images (lib/pack-image-service), so the result also lands in Generated Images.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = bodySchema.parse(await req.json());
    const url = await createPackImage({
      productIds: body.productIds,
      customItems: body.customItems,
      boxId: body.boxId,
      boxColour: body.boxColour,
      logoUrl: body.logoUrl,
      brandingMap: body.brandingMap,
      packLabel: body.label || 'Mockup',
      companyName: body.companyName,
      createdById: session.user.id,
    });
    return NextResponse.json({ success: true, data: { url } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Invalid input' }, { status: 400 });
    }
    if (error instanceof PackImageError) {
      const noProducts = error.message === 'No valid products selected';
      return NextResponse.json({ success: false, error: error.message }, { status: noProducts ? 400 : 502 });
    }
    console.error('Mockup generation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate mockup' }, { status: 500 });
  }
}
