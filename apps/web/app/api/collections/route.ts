import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/collections
 * Returns active collections with linked products.
 * Query params:
 *   - browse=true: Returns all collections and all products (for /collections browse page)
 *   - (default): Returns 3 collections, 4 products each (for homepage)
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url || 'http://localhost:3000');
    const { searchParams } = url;
    const isBrowse = searchParams.get('browse') === 'true';

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
          take: isBrowse ? undefined : 4,
        },
      },
      orderBy: { sortOrder: "asc" },
      take: isBrowse ? undefined : 3,
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
