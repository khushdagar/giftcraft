import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripHtml } from '@/lib/strip-html';
import { generatePackImage, PackImageError, PACK_IMAGE_MODEL, formatSizeCm } from '@/lib/gemini-pack-image';
import { PRINTING_TECHNIQUE_LABELS } from '@/lib/pack-image-prompt';
import { uploadBuffer, getBucketAndCdn } from '@/lib/upload-to-digital-ocean';
import { PACK_IMAGE_FOLDER } from '@/lib/proposal-pack';

export const dynamic = 'force-dynamic';
// Image generation routinely takes 15–40s.
export const maxDuration = 120;

const bodySchema = z.object({
  productIds: z.array(z.string()).min(1).max(20),
  // Packaging product id; the builder may send a `<id>-<size>` snapshot id.
  boxId: z.string().max(120).nullable().optional(),
  // Client logo uploaded in the builder — printed on the box lid.
  logoUrl: z.string().url().max(1000).nullable().optional(),
  // Recorded with the image for the Generated Images tab.
  packLabel: z.string().max(80).nullable().optional(),
  companyName: z.string().max(160).nullable().optional(),
});

const imageSelect = {
  select: { url: true },
  orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
  take: 1,
};

/**
 * POST /api/admin/proposals/pack-image
 * Generates the AI pack shot (chosen box with the selected products packed
 * inside), stores it on Spaces and returns its CDN URL. The builder keeps the
 * URL on the pack and sends it along with preview/send as `packImageUrl`.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = bodySchema.parse(await req.json());
    const boxId = body.boxId ? body.boxId.replace(/-(small|medium|large)$/i, '') : null;

    const [products, box] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: body.productIds } },
        select: {
          id: true,
          name: true,
          brand: true,
          material: true,
          descriptionShort: true,
          dimensionL: true,
          dimensionW: true,
          dimensionH: true,
          printingTechnique: true,
          printingPosition: true,
          images: imageSelect,
        },
      }),
      boxId
        ? prisma.product.findUnique({
            where: { id: boxId },
            select: { name: true, descriptionShort: true, images: imageSelect },
          })
        : null,
    ]);
    if (products.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid products selected' }, { status: 400 });
    }

    // Keep the admin's pick order — the prompt lists items in this order.
    const byId = new Map(products.map((p) => [p.id, p]));
    const ordered = body.productIds.map((id) => byId.get(id)).filter((p) => !!p);

    // The logo is downloaded server-side, so only our own CDN is accepted.
    const { cdnEndpoint } = getBucketAndCdn();
    const logoUrl = body.logoUrl?.startsWith(`${cdnEndpoint}/`) ? body.logoUrl : null;

    const raw = await generatePackImage({
      logoUrl,
      box: box
        ? {
            name: box.name,
            description: stripHtml(box.descriptionShort || '').trim().slice(0, 400) || null,
            imageUrl: box.images[0]?.url,
          }
        : null,
      products: ordered.map((p) => ({
        name: p.name,
        brand: p.brand,
        material: p.material,
        // Catalogue copy often states shape/finish the photo leaves ambiguous.
        description: stripHtml(p.descriptionShort || '').replace(/\s+/g, ' ').trim().slice(0, 240) || null,
        size: formatSizeCm(p.dimensionL, p.dimensionW, p.dimensionH),
        imageUrl: p.images[0]?.url,
        // Only products with a branding method get the client logo.
        branding:
          p.printingTechnique && p.printingTechnique !== 'none'
            ? {
                technique: PRINTING_TECHNIQUE_LABELS[p.printingTechnique] ?? p.printingTechnique,
                position: p.printingPosition,
              }
            : null,
      })),
    });

    // JPEG keeps the deck PDF light; 1600px is plenty for a half-page A4 hero.
    const jpeg = await sharp(raw)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
    const url = await uploadBuffer(`${PACK_IMAGE_FOLDER}/${Date.now()}-${nanoid(8)}.jpg`, jpeg, 'image/jpeg');

    // Record it for the Generated Images tab. Best-effort: the image is already
    // stored, so a failed insert must not fail the generation.
    try {
      await prisma.generatedPackImage.create({
        data: {
          url,
          packLabel: body.packLabel?.trim() || null,
          companyName: body.companyName?.trim() || null,
          boxName: box?.name ?? null,
          productNames: ordered.map((p) => p.name),
          logoUrl,
          model: PACK_IMAGE_MODEL,
          createdById: session.user.id,
        },
      });
    } catch (err) {
      console.error('Failed to record generated pack image:', err);
    }

    return NextResponse.json({ success: true, data: { url } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Invalid input' }, { status: 400 });
    }
    if (error instanceof PackImageError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
    console.error('Pack image generation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate pack image' }, { status: 500 });
  }
}
