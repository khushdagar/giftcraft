import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/collections
 * Public tree of active Curated Collections (GiftCollection): each top-level
 * collection with its sub-collections, and each leaf with its packs. Powers the
 * homepage "Curated collections" section and the navbar's cascading dropdown.
 * A collection is listed when it has packs of its own OR sub-collections.
 */
export async function GET() {
  try {
    const collections = await prisma.giftCollection.findMany({
      // Top level only — a sub-collection is reached through its parent.
      where: { isActive: true, parentId: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        packProducts: {
          where: { isPack: true, status: "active" },
          orderBy: [{ sortOrder: "asc" }, { viewCount: "desc" }],
          select: { id: true, viewCount: true, name: true, slug: true },
        },
        // A parent holds no packs of its own — its count and popularity come
        // from the sub-collections one level down.
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            packProducts: {
              where: { isPack: true, status: "active" },
              orderBy: [{ sortOrder: "asc" }, { viewCount: "desc" }],
              select: { id: true, viewCount: true, name: true, slug: true },
            },
          },
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
        childCount: c.children.length,
        // The navbar cascade reads these: hovering a collection reveals its
        // sub-collections (or its own packs, when it is a leaf), and hovering a
        // sub-collection reveals that one's packs.
        packs: c.packProducts.map((p) => ({ name: p.name, slug: p.slug })),
        children: c.children
          .filter((ch) => ch.packProducts.length > 0)
          .map((ch) => ({
            name: ch.name,
            slug: ch.slug,
            packs: ch.packProducts.map((p) => ({ name: p.name, slug: p.slug })),
          })),
        packCount:
          c.packProducts.length +
          c.children.reduce((sum, ch) => sum + ch.packProducts.length, 0),
        // A collection is browsed through its packs, so its popularity is the
        // total views of the packs inside it.
        views: [c, ...c.children].reduce(
          (sum, node) => sum + node.packProducts.reduce((s, p) => s + p.viewCount, 0),
          0
        ),
        sortOrder: c.sortOrder,
      }))
      // A collection with sub-collections stays listed even at zero packs of
      // its own — the sub-collections are the destination.
      .filter((c) => c.packCount > 0 || c.childCount > 0)
      // Admin `sortOrder` leads; most-viewed collections lead within a band.
      .sort((a, b) => a.sortOrder - b.sortOrder || b.views - a.views);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}
