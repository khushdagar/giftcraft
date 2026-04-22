import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/collections
 * Returns all active collections with linked products.
 * Used by: homepage collections section
 */
export async function GET(request: NextRequest) {
  try {
    const collections = await prisma.collection.findMany({
      where: { isActive: true },
      include: {
        products: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                priceTiers: { orderBy: { tier: "asc" }, take: 1 },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
          take: 4,
        },
      },
      orderBy: { sortOrder: "asc" },
      take: 3,
    });

    const formattedCollections = collections.map((collection) => ({
      id: collection.slug,
      name: collection.name,
      description: collection.description,
      heroImage: collection.heroImage,
      products: collection.products.map((cp) => ({
        id: cp.product.slug,
        name: cp.product.name,
        brand: cp.product.brand,
        icon: cp.product.images[0]?.url || "📦",
        price: Number(cp.product.priceTiers[0]?.sellPrice) || 0,
      })),
    }));

    return NextResponse.json(formattedCollections);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}
