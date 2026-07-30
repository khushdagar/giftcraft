import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { serializeProduct } from '@/lib/serialize';
import { uploadToDigitalOcean } from '@/lib/upload-to-digital-ocean';

const UpdateProductSchema = z.object({
  name: z.string().min(3).nullable().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).nullable().optional(),
  brand: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  descriptionShort: z.string().nullable().optional(),
  descriptionLong: z.string().nullable().optional(),
  specifications: z.string().nullable().optional(),
  designArtwork: z.string().nullable().optional(),
  shippingDelivery: z.string().nullable().optional(),
  samplesInfo: z.string().nullable().optional(),
  packagingAddons: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  lengthCm: z.number().min(0).nullable().optional(),
  widthCm: z.number().min(0).nullable().optional(),
  heightCm: z.number().min(0).nullable().optional(),
  weightG: z.number().nullable().optional(),
  moq: z.number().int().nullable().optional(),
  hsnCode: z.string().nullable().optional(),
  status: z.enum(['active', 'draft', 'archived', 'seasonal']).nullable().optional(),
  printingTechnique: z
    .enum(['screen_print', 'uv_print', 'embroidery', 'laser_engraving', 'digital_print', 'emboss', 'none'])
    .nullable()
    .optional(),
  printingPosition: z.string().nullable().optional(),
  brandingArea: z.string().nullable().optional(),
  leadTimeDays: z.number().int().nullable().optional(),
  isEcoCertified: z.boolean().nullable().optional(),
  ecoCertification: z.string().nullable().optional(),
  sampleAvailable: z.boolean().nullable().optional(),
  recipientTags: z.array(z.string()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  // Rich-text detail tab; also drives the Proposal Deck PDF bullets.
  keyFeatures: z.string().nullable().optional(),
  isFeatured: z.boolean().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  priceTiers: z
    .array(
      z.object({
        tier: z.number().int().min(1).max(12),
        minQty: z.number().int().min(1),
        maxQty: z.number().int().nullable(),
        costPrice: z.number().positive(),
        sellPrice: z.number().positive(),
      })
    )
    .nullable()
    .optional(),
  reason: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).nullable().optional(),
  occasionIds: z.array(z.string()).nullable().optional(),
  variants: z.array(
    z.object({
      id: z.string().optional(),
      kind: z.string().min(1, 'Variant kind cannot be empty'),
      value: z.string().min(1, 'Variant value cannot be empty'),
      hexColor: z.string().nullable().optional(),
      imageUrl: z.string().nullable().optional(),
      price: z.number().nonnegative().nullable().optional(),
      sortOrder: z.number().int().optional(),
    })
  ).nullable().optional(),
  vendors: z.array(
    z.object({
      vendorId: z.string().min(1),
      isPrimary: z.boolean().optional(),
      costPrice: z.number().nonnegative().nullable().optional(),
      vendorSku: z.string().nullable().optional(),
      vendorMoq: z.number().int().nullable().optional(),
      vendorLeadDays: z.number().int().nullable().optional(),
      sourcingStatus: z.string().nullable().optional(),
      lastPriceConfirmedAt: z.string().nullable().optional(),
    })
  ).nullable().optional(),

  // Curated pack fields
  isPack: z.boolean().nullable().optional(),
  packCollectionId: z.string().nullable().optional(),
  packItems: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1).default(1),
      sortOrder: z.number().int().default(0),
    })
  ).nullable().optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        priceTiers: true,
        images: { orderBy: { sortOrder: 'asc' } },
        hsn: true,
        categories: { include: { category: true } },
        occasions: { include: { occasion: true } },
        variants: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const serialized = serializeProduct(product);
    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const dataStr = formData.get('data') as string;
    const imageFiles = formData.getAll('images').filter(
      (f): f is File => f instanceof File
    );
    const priceReason = formData.get('priceReason') as string | null;

    if (!dataStr) {
      return NextResponse.json({ error: 'Product data required' }, { status: 400 });
    }

    const body = JSON.parse(dataStr);
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
          ...(data.specifications !== undefined && { specifications: data.specifications }),
          ...(data.designArtwork !== undefined && { designArtwork: data.designArtwork }),
          ...(data.shippingDelivery !== undefined && { shippingDelivery: data.shippingDelivery }),
          ...(data.samplesInfo !== undefined && { samplesInfo: data.samplesInfo }),
          ...(data.packagingAddons !== undefined && { packagingAddons: data.packagingAddons }),
          ...(data.material !== undefined && { material: data.material }),
          ...(data.lengthCm !== undefined && { dimensionL: data.lengthCm }),
          ...(data.widthCm !== undefined && { dimensionW: data.widthCm }),
          ...(data.heightCm !== undefined && { dimensionH: data.heightCm }),
          ...(data.weightG !== undefined && { weightG: data.weightG }),
          ...(data.moq != null && { moq: data.moq }),
          ...(data.status && { status: data.status }),
          ...(data.printingTechnique && { printingTechnique: data.printingTechnique }),
          ...(data.printingPosition !== undefined && { printingPosition: data.printingPosition }),
          ...(data.brandingArea !== undefined && { brandingArea: data.brandingArea }),
          ...(data.leadTimeDays && { leadTimeDays: data.leadTimeDays }),
          ...(data.isEcoCertified != null && { isEcoCertified: data.isEcoCertified }),
          ...(data.ecoCertification !== undefined && { ecoCertification: data.ecoCertification }),
          ...(data.sampleAvailable != null && { sampleAvailable: data.sampleAvailable }),
          ...(data.recipientTags !== undefined && { recipientTags: data.recipientTags ?? [] }),
          ...(data.tags !== undefined && { tags: data.tags ?? [] }),
          ...(data.keyFeatures !== undefined && { keyFeatures: data.keyFeatures }),
          ...(data.isFeatured != null && { isFeatured: data.isFeatured }),
          ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
          ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
          ...(data.isPack != null && { isPack: data.isPack }),
          ...(data.packCollectionId !== undefined && { packCollectionId: data.packCollectionId || null }),
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

      // Update HSN if provided (resolve code → HsnCode, auto-create if new)
      if (data.hsnCode !== undefined && data.hsnCode && data.hsnCode.trim()) {
        const code = data.hsnCode.trim();
        let hsnCode = await tx.hsnCode.findUnique({ where: { code } });
        if (!hsnCode) {
          hsnCode = await tx.hsnCode.create({
            data: { code, description: `HSN ${code}`, defaultGstRate: new Prisma.Decimal(18) },
          });
        }
        await tx.productHsn.upsert({
          where: { productId: params.id },
          create: { productId: params.id, hsnId: hsnCode.id, gstRate: hsnCode.defaultGstRate },
          update: { hsnId: hsnCode.id, gstRate: hsnCode.defaultGstRate },
        });
      }

      // Replace pack member products if provided
      if (data.packItems) {
        await tx.productPackItem.deleteMany({ where: { packId: params.id } });
        const seen = new Set<string>();
        const items = data.packItems.filter((it) => {
          if (seen.has(it.productId) || it.productId === params.id) return false;
          seen.add(it.productId);
          return true;
        });
        if (items.length > 0) {
          await tx.productPackItem.createMany({
            data: items.map((it, idx) => ({
              packId: params.id,
              productId: it.productId,
              quantity: it.quantity,
              sortOrder: it.sortOrder ?? idx,
            })),
          });
        }
      }

      // Update variants if provided
      if (data.variants) {
        await tx.productVariant.deleteMany({ where: { productId: params.id } });
        if (data.variants.length > 0) {
          await tx.productVariant.createMany({
            data: data.variants.map((variant, idx) => ({
              productId: params.id,
              kind: variant.kind,
              value: variant.value,
              hexColor: variant.hexColor || null,
              imageUrl: variant.imageUrl || null,
              price: variant.price ?? null,
              sortOrder: idx,
            })),
          });
        }
      }

      // Update vendor links if provided (full replace)
      if (data.vendors) {
        await tx.productVendor.deleteMany({ where: { productId: params.id } });
        if (data.vendors.length > 0) {
          await tx.productVendor.createMany({
            data: data.vendors.map((v) => ({
              productId: params.id,
              vendorId: v.vendorId,
              isPrimary: v.isPrimary ?? false,
              costPrice: v.costPrice != null ? new Prisma.Decimal(v.costPrice) : null,
              vendorSku: v.vendorSku || null,
              vendorMoq: v.vendorMoq ?? null,
              vendorLeadDays: v.vendorLeadDays ?? null,
              sourcingStatus: v.sourcingStatus || null,
              lastPriceConfirmedAt: v.lastPriceConfirmedAt
                ? new Date(v.lastPriceConfirmedAt)
                : null,
            })),
          });
        }
      }

      return product;
    });

    // Create audit logs after transaction
    if (auditRows.length > 0) {
      const auditLogsWithReason = auditRows.map(row => ({
        ...row,
        reason: priceReason || row.reason || 'Admin update',
      }));
      await prisma.priceAuditLog.createMany({
        data: auditLogsWithReason,
      });
    }

    // Handle image uploads if provided
    if (imageFiles.length > 0) {
      console.log(`Processing ${imageFiles.length} new images for product ${params.id}`);

      const newImageUrls: string[] = [];
      const failedImages: string[] = [];

      for (const file of imageFiles) {
        try {
          const url = await uploadToDigitalOcean(file);
          newImageUrls.push(url);
          console.log(`✓ Uploaded: ${file.name}`);
        } catch (err) {
          console.error(`✗ Failed to upload ${file.name}: ${err}`);
          failedImages.push(file.name);
        }
      }

      // Add new images to product
      if (newImageUrls.length > 0) {
        console.log(`Creating ${newImageUrls.length} image records in database`);

        await prisma.productImage.createMany({
          data: newImageUrls.map((url, idx) => ({
            productId: params.id,
            url,
            isPrimary: idx === 0 && updated.images.length === 0, // Only first is primary if no existing images
            sortOrder: updated.images.length + idx, // Add new images after existing ones
          })),
        });

        console.log(`✓ Images saved to database`);

        // Refetch product with updated images
        const finalProduct = await prisma.product.findUnique({
          where: { id: params.id },
          include: {
            priceTiers: true,
            images: { orderBy: { sortOrder: 'asc' } },
            hsn: true,
            categories: true,
            occasions: true,
          },
        });

        const serialized = serializeProduct(finalProduct!);
        return NextResponse.json({
          ...serialized,
          _meta: {
            imagesUploaded: newImageUrls.length,
            imagesFailed: failedImages.length,
            failedImages: failedImages,
          },
        });
      } else if (failedImages.length > 0) {
        return NextResponse.json(
          {
            error: `Failed to upload all images: ${failedImages.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    const serialized = serializeProduct(updated);
    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      console.error('Validation errors:', formattedErrors);
      return NextResponse.json({ error: formattedErrors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
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

    // Products referenced by real orders or sample orders can't be hard-deleted
    // without destroying that history — archive them instead.
    const [orderItems, sampleOrders] = await Promise.all([
      prisma.orderItem.count({ where: { productId: params.id } }),
      prisma.sampleOrder.count({ where: { productId: params.id } }),
    ]);

    if (orderItems > 0 || sampleOrders > 0) {
      await prisma.product.update({
        where: { id: params.id },
        data: { status: 'archived' },
      });
      return NextResponse.json({ archived: true, reason: 'referenced_by_orders' });
    }

    // Otherwise hard delete. Most relations cascade; remove the two that don't
    // (price-audit log + GOC options are product metadata, safe to drop).
    await prisma.$transaction([
      prisma.priceAuditLog.deleteMany({ where: { productId: params.id } }),
      prisma.gocOption.deleteMany({ where: { productId: params.id } }),
      prisma.product.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
