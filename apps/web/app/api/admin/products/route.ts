import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { serializeProduct } from "@/lib/serialize";
import { uploadToDigitalOcean } from "@/lib/upload-to-digital-ocean";

/**
 * GET /api/admin/products
 * List all products with admin details (super_admin only)
 *
 * POST /api/admin/products
 * Create a new product (super_admin only)
 * Validates and creates product + price tiers + HSN mapping
 * Creates PriceAuditLog on first price entry
 */

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") || "20"));

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          isPack: false,
          ...(search && {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }),
          ...(status && { status: status as any }),
        },
        include: {
          priceTiers: {
            where: { tier: 1 },
            take: 1,
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          hsn: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({
        where: {
          isPack: false,
          ...(search && {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }),
          ...(status && { status: status as any }),
        },
      }),
    ]);

    const serialized = products.map(serializeProduct);

    return NextResponse.json({
      products: serialized,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error listing products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const VendorLinkSchema = z.object({
  vendorId: z.string().min(1),
  isPrimary: z.boolean().optional(),
  costPrice: z.number().nonnegative().nullable().optional(),
  vendorSku: z.string().nullable().optional(),
  vendorMoq: z.number().int().nullable().optional(),
  vendorLeadDays: z.number().int().nullable().optional(),
  sourcingStatus: z.string().nullable().optional(),
  lastPriceConfirmedAt: z.string().nullable().optional(),
});

const CreateProductSchema = z.object({
  name: z.string().min(3, "Product name required"),
  slug: z.string().min(1).nullable().optional(),
  brand: z.string().nullable().optional(),
  sku: z.string().min(1, "SKU required"),
  descriptionShort: z.string().nullable().optional(),
  descriptionLong: z.string().nullable().optional(),
  specifications: z.string().nullable().optional(),
  designArtwork: z.string().nullable().optional(),
  shippingDelivery: z.string().nullable().optional(),
  samplesInfo: z.string().nullable().optional(),
  packagingAddons: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  weightG: z.number().nullable().optional(),
  lengthCm: z.number().min(0).nullable().optional(),
  widthCm: z.number().min(0).nullable().optional(),
  heightCm: z.number().min(0).nullable().optional(),
  moq: z.number().int().nullable().optional(),
  status: z.enum(["active", "draft", "archived", "seasonal"]).default("draft"),
  printingTechnique: z.enum([
    "screen_print",
    "uv_print",
    "embroidery",
    "laser_engraving",
    "digital_print",
    "emboss",
    "none",
  ]).nullable().optional(),
  printingPosition: z.string().nullable().optional(),
  brandingArea: z.string().nullable().optional(),
  leadTimeDays: z.number().int().nullable().optional(),
  isEcoCertified: z.boolean().default(false),
  ecoCertification: z.string().nullable().optional(),
  sampleAvailable: z.boolean().default(false),
  recipientTags: z.array(z.string()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  isFeatured: z.boolean().default(false),
  hsnCode: z.string().nullable().optional(),
  hsnId: z.string().nullable().optional(), // legacy: an HsnCode id

  // Price tiers (up to 12)
  priceTiers: z.array(
    z.object({
      tier: z.number().int().min(1).max(12),
      minQty: z.number().int().min(1),
      maxQty: z.number().int().nullable(),
      costPrice: z.number().positive(),
      sellPrice: z.number().positive(),
    })
  ).nullable().optional(),

  // Optional: image URLs, category IDs, occasion IDs, variants, vendors
  imageUrls: z.array(z.string().url()).nullable().optional(),
  categoryIds: z.array(z.string()).nullable().optional(),
  occasionIds: z.array(z.string()).nullable().optional(),
  variants: z.array(
    z.object({
      kind: z.string(),
      value: z.string(),
      hexColor: z.string().nullable().optional(),
      imageUrl: z.string().nullable().optional(),
      price: z.number().nonnegative().nullable().optional(),
      sortOrder: z.number().optional(),
    })
  ).nullable().optional(),
  vendors: z.array(VendorLinkSchema).nullable().optional(),

  // Curated pack fields. When isPack, HSN/price-tiers are not required — the
  // pack's price derives from its member products.
  isPack: z.boolean().optional().default(false),
  packCollectionId: z.string().nullable().optional(),
  packItems: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1).default(1),
      sortOrder: z.number().int().default(0),
    })
  ).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Auth check
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const dataStr = formData.get("data") as string;
    const imageFiles = formData.getAll("images").filter(
      (f): f is File => f instanceof File
    );

    if (!dataStr) {
      return NextResponse.json({ error: "Product data required" }, { status: 400 });
    }

    const body = JSON.parse(dataStr);
    const data = CreateProductSchema.parse(body);

    // Upload images to Digital Ocean Spaces
    const imageUrls: string[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      if (!file) continue;

      try {
        const url = await uploadToDigitalOcean(file);
        imageUrls.push(url);
      } catch (err) {
        console.error(`Failed to upload image ${i}:`, err);
        // Continue with other images instead of failing
      }
    }

    // Already-hosted URLs from the form (images the client compressed & uploaded
    // as it went, or picked from the media library). Order is preserved and the
    // first entry becomes the primary image below.
    if (data.imageUrls?.length) {
      imageUrls.push(...data.imageUrls);
    }

    // Check if SKU already exists
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }

    // Resolve HSN by code (preferred) or legacy id; auto-create the code if new.
    let hsn = null as Awaited<ReturnType<typeof prisma.hsnCode.findUnique>> | null;
    const hsnCodeValue = (data.hsnCode || "").trim();
    if (hsnCodeValue) {
      hsn = await prisma.hsnCode.findUnique({ where: { code: hsnCodeValue } });
      if (!hsn) {
        hsn = await prisma.hsnCode.create({
          data: {
            code: hsnCodeValue,
            description: `HSN ${hsnCodeValue}`,
            defaultGstRate: new Prisma.Decimal(18),
          },
        });
      }
    } else if (data.hsnId) {
      hsn = await prisma.hsnCode.findUnique({ where: { id: data.hsnId } });
    }
    // Packs bundle other products and aren't taxed themselves, so HSN is optional.
    if (!hsn && !data.isPack) {
      return NextResponse.json({ error: "HSN code is required" }, { status: 400 });
    }

    // Create product with all related data
    const product = await prisma.product.create({
      data: {
        name: data.name,
        // Slug is required; derive from the name when not provided.
        slug: data.slug || data.name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        brand: data.brand,
        sku: data.sku,
        descriptionShort: data.descriptionShort,
        descriptionLong: data.descriptionLong,
        specifications: data.specifications,
        designArtwork: data.designArtwork,
        shippingDelivery: data.shippingDelivery,
        samplesInfo: data.samplesInfo,
        packagingAddons: data.packagingAddons,
        material: data.material,
        weightG: data.weightG,
        dimensionL: data.lengthCm,
        dimensionW: data.widthCm,
        dimensionH: data.heightCm,
        ...(data.moq != null && { moq: data.moq }),
        status: data.status,
        printingTechnique: data.printingTechnique ?? undefined,
        printingPosition: data.printingPosition,
        brandingArea: data.brandingArea,
        leadTimeDays: data.leadTimeDays ?? undefined,
        isEcoCertified: data.isEcoCertified,
        ecoCertification: data.ecoCertification,
        sampleAvailable: data.sampleAvailable,
        ...(data.recipientTags?.length && { recipientTags: data.recipientTags }),
        ...(data.tags?.length && { tags: data.tags }),
        isFeatured: data.isFeatured,

        // Curated pack: flag, parent collection, and member products.
        isPack: data.isPack ?? false,
        packCollectionId: data.packCollectionId || null,
        ...(data.isPack && data.packItems?.length && {
          packItems: {
            createMany: {
              data: data.packItems.map((it, idx) => ({
                productId: it.productId,
                quantity: it.quantity,
                sortOrder: it.sortOrder ?? idx,
              })),
            },
          },
        }),

        // Create price tiers (packs derive price from members, so usually none)
        priceTiers: {
          createMany: {
            data: (data.priceTiers ?? []).map((tier) => ({
              tier: tier.tier,
              minQty: tier.minQty,
              maxQty: tier.maxQty,
              costPrice: new Prisma.Decimal(tier.costPrice),
              sellPrice: new Prisma.Decimal(tier.sellPrice),
            })),
          },
        },

        // Link HSN (skipped for packs, which aren't taxed themselves)
        ...(hsn && {
          hsn: {
            create: {
              hsnId: hsn.id,
              gstRate: hsn.defaultGstRate,
            },
          },
        }),

        // Link categories
        ...(data.categoryIds?.length && {
          categories: {
            createMany: {
              data: data.categoryIds.map((id) => ({ categoryId: id })),
            },
          },
        }),
        
        // Link occasions
        ...(data.occasionIds?.length && {
          occasions: {
            createMany: {
              data: data.occasionIds.map((id) => ({ occasionId: id })),
            },
          },
        }),

        // Create variants
        ...(data.variants?.length && {
          variants: {
            createMany: {
              data: data.variants.map((variant, idx) => ({
                kind: variant.kind,
                value: variant.value,
                hexColor: variant.hexColor || null,
                imageUrl: variant.imageUrl || null,
                price: variant.price ?? null,
                sortOrder: idx,
              })),
            },
          },
        }),

        // Create images
        ...(imageUrls.length && {
          images: {
            createMany: {
              data: imageUrls.map((url, idx) => ({
                url,
                isPrimary: idx === 0, // First image is primary
              })),
            },
          },
        }),

        // Link vendors (sourcing details from product master)
        ...(data.vendors?.length && {
          vendors: {
            createMany: {
              data: data.vendors.map((v) => ({
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
            },
          },
        }),
      },
      include: {
        priceTiers: true,
        images: true,
        hsn: true,
      },
    });

    // Create audit logs for each price tier
    await prisma.priceAuditLog.createMany({
      data: (data.priceTiers ?? []).map((tier) => ({
        productId: product.id,
        tier: tier.tier,
        newCost: new Prisma.Decimal(tier.costPrice),
        newSell: new Prisma.Decimal(tier.sellPrice),
        changedBy: session.user.id,
        reason: "Product created",
      })),
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => {
        const path = e.path.join(".");
        return `${path}: ${e.message}`;
      }).join("; ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
