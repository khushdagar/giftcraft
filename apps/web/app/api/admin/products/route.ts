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

const CreateProductSchema = z.object({
  name: z.string().min(3, "Product name required"),
  slug: z.string().min(3, "Slug required").regex(/^[a-z0-9-]+$/, "Invalid slug format"),
  brand: z.string().optional(),
  sku: z.string().min(1, "SKU required"),
  descriptionShort: z.string().optional(),
  descriptionLong: z.string().optional(),
  status: z.enum(["active", "draft", "archived", "seasonal"]).default("draft"),
  printingTechnique: z.enum([
    "screen_print",
    "uv_print",
    "embroidery",
    "laser_engraving",
    "digital_print",
    "emboss",
    "none",
  ]),
  printingPosition: z.string().optional(),
  leadTimeDays: z.number().int().default(10),
  isEcoCertified: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  hsnId: z.string().min(1, "HSN code required"),
  
  // Price tiers (up to 12)
  priceTiers: z.array(
    z.object({
      tier: z.number().int().min(1).max(12),
      minQty: z.number().int().min(1),
      maxQty: z.number().int().nullable(),
      costPrice: z.number().positive(),
      sellPrice: z.number().positive(),
    })
  ).min(1),
  
  // Optional: image URLs, category IDs, occasion IDs
  imageUrls: z.array(z.string().url()).optional(),
  categoryIds: z.array(z.string()).optional(),
  occasionIds: z.array(z.string()).optional(),
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

    // Check if SKU already exists
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }

    // Verify HSN exists
    const hsn = await prisma.hsnCode.findUnique({ where: { id: data.hsnId } });
    if (!hsn) {
      return NextResponse.json({ error: "HSN code not found" }, { status: 400 });
    }

    // Create product with all related data
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        brand: data.brand,
        sku: data.sku,
        descriptionShort: data.descriptionShort,
        descriptionLong: data.descriptionLong,
        status: data.status,
        printingTechnique: data.printingTechnique,
        printingPosition: data.printingPosition,
        leadTimeDays: data.leadTimeDays,
        isEcoCertified: data.isEcoCertified,
        isFeatured: data.isFeatured,
        
        // Create price tiers
        priceTiers: {
          createMany: {
            data: data.priceTiers.map((tier) => ({
              tier: tier.tier,
              minQty: tier.minQty,
              maxQty: tier.maxQty,
              costPrice: new Prisma.Decimal(tier.costPrice),
              sellPrice: new Prisma.Decimal(tier.sellPrice),
            })),
          },
        },
        
        // Link HSN
        hsn: {
          create: {
            hsnId: data.hsnId,
            gstRate: hsn.defaultGstRate,
          },
        },
        
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
      },
      include: {
        priceTiers: true,
        images: true,
        hsn: true,
      },
    });

    // Create audit logs for each price tier
    await prisma.priceAuditLog.createMany({
      data: data.priceTiers.map((tier) => ({
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
