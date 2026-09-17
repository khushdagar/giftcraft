import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getBucketAndCdn } from '@/lib/upload-to-digital-ocean';
import { PROPOSAL_ONLY_TAG } from '@/lib/proposal-only-product';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2, 'Product name is required').max(160),
  brand: z.string().trim().max(80).optional(),
  sellPrice: z.number().positive('Enter a sell price').max(10000000),
  costPrice: z.number().min(0).max(10000000).optional(),
  hsnCode: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, 'HSN code must be 4 to 8 digits'),
  gstRate: z.number().min(0).max(28),
  imageUrl: z.string().url().max(1000),
  keyFeatures: z.string().trim().max(2000).optional(),
  weightG: z.number().min(0).max(1000000).optional(),
});

/** Only proposal-only products may be read or changed through this route. */
async function findManualProduct(id: string) {
  return prisma.product.findFirst({
    where: { id, tags: { has: PROPOSAL_ONLY_TAG } },
    include: {
      priceTiers: { orderBy: { tier: 'asc' }, take: 1 },
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
      hsn: { include: { hsn: { select: { code: true } } } },
    },
  });
}

/** GET — the full editable details, to pre-fill the edit form. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const product = await findManualProduct(params.id);
  if (!product) {
    return NextResponse.json({ error: 'Manual product not found' }, { status: 404 });
  }

  const tier = product.priceTiers[0];
  return NextResponse.json({
    success: true,
    data: {
      id: product.id,
      name: product.name,
      brand: product.brand ?? '',
      sellPrice: tier ? Number(tier.sellPrice) : 0,
      costPrice: tier && Number(tier.costPrice) > 0 ? Number(tier.costPrice) : null,
      hsnCode: product.hsn?.hsn.code ?? '',
      gstRate: product.hsn ? Number(product.hsn.gstRate) : 18,
      imageUrl: product.images[0]?.url ?? '',
      keyFeatures: product.keyFeatures ?? '',
      weightG: product.weightG ?? null,
    },
  });
}

/**
 * PATCH — correct a manual product. Proposals already sent keep the price they
 * were quoted at (it is snapshotted on the quote); the new details apply to
 * proposals previewed or sent from now on.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const data = schema.parse(await req.json());

    const existing = await findManualProduct(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Manual product not found' }, { status: 404 });
    }

    const { cdnEndpoint } = getBucketAndCdn();
    if (!data.imageUrl.startsWith(`${cdnEndpoint}/`)) {
      return NextResponse.json({ error: 'Upload the product image first' }, { status: 400 });
    }

    const oldTier = existing.priceTiers[0];
    const newSell = new Prisma.Decimal(data.sellPrice);
    const newCost = new Prisma.Decimal(data.costPrice ?? 0);
    const priceChanged =
      !oldTier || !oldTier.sellPrice.equals(newSell) || !oldTier.costPrice.equals(newCost);

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
      // GST follows the HSN code — see the create route.
      const gstRate = hsn.defaultGstRate;

      await tx.productHsn.upsert({
        where: { productId: existing.id },
        update: { hsnId: hsn.id, gstRate },
        create: { productId: existing.id, hsnId: hsn.id, gstRate },
      });

      await tx.priceTier.upsert({
        where: { productId_tier: { productId: existing.id, tier: 1 } },
        update: { sellPrice: newSell, costPrice: newCost },
        create: {
          productId: existing.id,
          tier: 1,
          minQty: 1,
          maxQty: null,
          sellPrice: newSell,
          costPrice: newCost,
        },
      });

      if (priceChanged) {
        await tx.priceAuditLog.create({
          data: {
            productId: existing.id,
            tier: 1,
            oldCost: oldTier?.costPrice ?? null,
            newCost,
            oldSell: oldTier?.sellPrice ?? null,
            newSell,
            changedBy: session.user.id,
            reason: 'Manual proposal product edited',
          },
        });
      }

      if (existing.images[0]?.url !== data.imageUrl) {
        await tx.productImage.deleteMany({ where: { productId: existing.id } });
        await tx.productImage.create({
          data: {
            productId: existing.id,
            url: data.imageUrl,
            altText: data.name,
            isPrimary: true,
            sortOrder: 0,
          },
        });
      }

      return tx.product.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          brand: data.brand || null,
          keyFeatures: data.keyFeatures || null,
          weightG: data.weightG ?? null,
        },
        include: {
          priceTiers: { orderBy: { tier: 'asc' } },
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        },
      });
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Manual proposal product update error:', error);
    return NextResponse.json({ error: 'Failed to update the product' }, { status: 500 });
  }
}
