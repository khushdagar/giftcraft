import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getBucketAndCdn } from '@/lib/upload-to-digital-ocean';
import { PROPOSAL_ONLY_TAG } from '@/lib/proposal-only-product';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2, 'Product name is required').max(160),
  brand: z.string().trim().max(80).optional(),
  // One flat price per unit, excl. GST — no quantity tiers for a one-off item.
  sellPrice: z.number().positive('Enter a sell price').max(10000000),
  costPrice: z.number().min(0).max(10000000).optional(),
  hsnCode: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, 'HSN code must be 4 to 8 digits'),
  gstRate: z.number().min(0).max(28),
  imageUrl: z.string().url().max(1000),
  // Bullet lines for the deck's product page — one feature per line.
  keyFeatures: z.string().trim().max(2000).optional(),
  weightG: z.number().min(0).max(1000000).optional(),
});

/**
 * GET /api/admin/proposals/manual-product?ids=a,b,c
 * Which of these product ids are manual (proposal-only) products. Lets the
 * builder mark them as editable in a restored draft.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const ids = (req.nextUrl.searchParams.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);
  if (ids.length === 0) return NextResponse.json({ success: true, ids: [] });

  const rows = await prisma.product.findMany({
    where: { id: { in: ids }, tags: { has: PROPOSAL_ONLY_TAG } },
    select: { id: true },
  });
  return NextResponse.json({ success: true, ids: rows.map((r) => r.id) });
}

/**
 * POST /api/admin/proposals/manual-product
 * Create a proposal-only product (see lib/proposal-only-product.ts) and return
 * it in the same shape the builder's catalogue grid uses, so it drops straight
 * into a pack like any other product.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const data = schema.parse(await req.json());

    // The deck renderer downloads this URL server-side — only accept images
    // uploaded to our own storage, never an arbitrary host.
    const { cdnEndpoint } = getBucketAndCdn();
    if (!data.imageUrl.startsWith(`${cdnEndpoint}/`)) {
      return NextResponse.json({ error: 'Upload the product image first' }, { status: 400 });
    }

    const uid = nanoid(10);

    const product = await prisma.$transaction(async (tx) => {
      const hsn = await tx.hsnCode.upsert({
        where: { code: data.hsnCode },
        update: {},
        create: {
          code: data.hsnCode,
          description: `HSN ${data.hsnCode}`,
          defaultGstRate: new Prisma.Decimal(data.gstRate),
        },
      });

      // GST follows the HSN code. For a code already in the tax master the
      // submitted rate is ignored; it only counts when it just created the code.
      const gstRate = hsn.defaultGstRate;

      return tx.product.create({
        data: {
          name: data.name,
          brand: data.brand || null,
          slug: `proposal-only-${uid.toLowerCase()}`,
          sku: `PROP-${uid.toUpperCase()}`,
          status: 'archived',
          tags: [PROPOSAL_ONLY_TAG],
          moq: 1,
          weightG: data.weightG ?? null,
          keyFeatures: data.keyFeatures || null,
          priceTiers: {
            create: {
              tier: 1,
              minQty: 1,
              maxQty: null,
              costPrice: new Prisma.Decimal(data.costPrice ?? 0),
              sellPrice: new Prisma.Decimal(data.sellPrice),
            },
          },
          images: {
            create: { url: data.imageUrl, altText: data.name, isPrimary: true, sortOrder: 0 },
          },
          hsn: {
            create: { hsnId: hsn.id, gstRate },
          },
        },
        include: { priceTiers: true, images: true },
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: product.id,
          name: product.name,
          brand: product.brand,
          proposalOnly: true,
          images: product.images.map((i) => ({ url: i.url })),
          priceTiers: product.priceTiers.map((t) => ({
            minQty: t.minQty,
            maxQty: t.maxQty,
            sellPrice: Number(t.sellPrice),
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Manual proposal product error:', error);
    return NextResponse.json({ error: 'Failed to add the product' }, { status: 500 });
  }
}
