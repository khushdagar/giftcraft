import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { serializeProduct } from '@/lib/serialize';

const UpdateProductSchema = z.object({
  name: z.string().min(3).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  descriptionShort: z.string().optional(),
  descriptionLong: z.string().optional(),
  material: z.string().optional(),
  dimensionL: z.number().optional(),
  dimensionW: z.number().optional(),
  dimensionH: z.number().optional(),
  weightG: z.number().optional(),
  status: z.enum(['active', 'draft', 'archived', 'seasonal']).optional(),
  printingTechnique: z
    .enum(['screen_print', 'uv_print', 'embroidery', 'laser_engraving', 'digital_print', 'emboss', 'none'])
    .optional(),
  printingPosition: z.string().optional(),
  leadTimeDays: z.number().int().optional(),
  isEcoCertified: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  priceTiers: z
    .array(
      z.object({
        tier: z.number().int().min(1).max(6),
        minQty: z.number().int().min(1),
        maxQty: z.number().int().nullable(),
        costPrice: z.number().positive(),
        sellPrice: z.number().positive(),
      })
    )
    .optional(),
  reason: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  occasionIds: z.array(z.string()).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = UpdateProductSchema.parse(body);

    // Fetch existing product and tiers for audit logging
    const existing = await prisma.product.findUnique({
      where: { id: params.id },
      include: { priceTiers: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check for SKU uniqueness if being updated
    if (data.sku && data.sku !== existing.sku) {
      const skuExists = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (skuExists) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
      }
    }

    // Prepare audit log data before update
    const auditRows: any[] = [];
    if (data.priceTiers) {
      for (const newTier of data.priceTiers) {
        const oldTier = existing.priceTiers.find((t) => t.tier === newTier.tier);
        const costChanged = oldTier && Number(oldTier.costPrice) !== newTier.costPrice;
        const sellChanged = oldTier && Number(oldTier.sellPrice) !== newTier.sellPrice;

        if (costChanged || sellChanged) {
          auditRows.push({
            productId: params.id,
            tier: newTier.tier,
            oldCost: oldTier ? new Prisma.Decimal(Number(oldTier.costPrice)) : null,
            newCost: new Prisma.Decimal(newTier.costPrice),
            oldSell: oldTier ? new Prisma.Decimal(Number(oldTier.sellPrice)) : null,
            newSell: new Prisma.Decimal(newTier.sellPrice),
            changedBy: session.user.id,
            reason: data.reason || 'Admin update',
          });
        }
      }
    }

    // Update product and tiers in transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update product fields
      const product = await tx.product.update({
        where: { id: params.id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.slug && { slug: data.slug }),
          ...(data.brand !== undefined && { brand: data.brand }),
          ...(data.sku && { sku: data.sku }),
          ...(data.descriptionShort !== undefined && { descriptionShort: data.descriptionShort }),
          ...(data.descriptionLong !== undefined && { descriptionLong: data.descriptionLong }),
          ...(data.material !== undefined && { material: data.material }),
          ...(data.dimensionL !== undefined && { dimensionL: data.dimensionL }),
          ...(data.dimensionW !== undefined && { dimensionW: data.dimensionW }),
          ...(data.dimensionH !== undefined && { dimensionH: data.dimensionH }),
          ...(data.weightG !== undefined && { weightG: data.weightG }),
          ...(data.status && { status: data.status }),
          ...(data.printingTechnique && { printingTechnique: data.printingTechnique }),
          ...(data.printingPosition !== undefined && { printingPosition: data.printingPosition }),
          ...(data.leadTimeDays && { leadTimeDays: data.leadTimeDays }),
          ...(data.isEcoCertified !== undefined && { isEcoCertified: data.isEcoCertified }),
          ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
          ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
          ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
        },
        include: {
          priceTiers: true,
          images: true,
          hsn: true,
          categories: true,
          occasions: true,
        },
      });

      // Upsert price tiers if provided
      if (data.priceTiers) {
        for (const tier of data.priceTiers) {
          await tx.priceTier.upsert({
            where: { productId_tier: { productId: params.id, tier: tier.tier } },
            create: {
              productId: params.id,
              tier: tier.tier,
              minQty: tier.minQty,
              maxQty: tier.maxQty,
              costPrice: new Prisma.Decimal(tier.costPrice),
              sellPrice: new Prisma.Decimal(tier.sellPrice),
            },
            update: {
              minQty: tier.minQty,
              maxQty: tier.maxQty,
              costPrice: new Prisma.Decimal(tier.costPrice),
              sellPrice: new Prisma.Decimal(tier.sellPrice),
            },
          });
        }
      }

      // Update categories if provided
      if (data.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: params.id } });
        if (data.categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: data.categoryIds.map((categoryId) => ({
              productId: params.id,
              categoryId,
            })),
          });
        }
      }

      // Update occasions if provided
      if (data.occasionIds) {
        await tx.productOccasion.deleteMany({ where: { productId: params.id } });
        if (data.occasionIds.length > 0) {
          await tx.productOccasion.createMany({
            data: data.occasionIds.map((occasionId) => ({
              productId: params.id,
              occasionId,
            })),
          });
        }
      }

      return product;
    });

    // Create audit logs after transaction
    if (auditRows.length > 0) {
      await prisma.priceAuditLog.createMany({
        data: auditRows,
      });
    }

    const serialized = serializeProduct(updated);
    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Soft delete: set status to archived
    await prisma.product.update({
      where: { id: params.id },
      data: { status: 'archived' },
    });

    return NextResponse.json({ archived: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
