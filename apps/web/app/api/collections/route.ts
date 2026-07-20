import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/collections
 * Public list of active Curated Collections (GiftCollection) that have at least
 * one active pack. Powers the homepage "Curated collections" section.
 * Mirrors the visibility rule used by the /packs page.
 */
export async function GET() {
  try {
    const collections = await prisma.giftCollection.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        packProducts: {
          where: { isPack: true, status: "active" },
          select: { id: true },
        },
      },
    });

    const data = collections
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description || "",
        image: c.image,
        gradient: c.gradient,
        packCount: c.packProducts.length,
      }))
      .filter((c) => c.packCount > 0);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}
