import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHiddenCategoryIds } from "@/lib/catalog-visibility";

// Tailwind color to hex mapping
const TAILWIND_COLORS: Record<string, string> = {
  "orange-400": "#fb923c",
  "yellow-400": "#facc15",
  "blue-400": "#60a5fa",
  "cyan-400": "#22d3ee",
  "green-400": "#4ade80",
  "emerald-400": "#34d399",
  "purple-400": "#c084fc",
  "pink-400": "#f472b6",
  "red-400": "#f87171",
  "indigo-400": "#818cf8",
  "rose-400": "#fb7185",
  "amber-400": "#fbbf24",
  "teal-400": "#2dd4bf",
  "violet-400": "#a78bfa",
};

function convertTailwindGradient(tailwindGradient: string): string {
  // Extract "from-X" and "to-Y" from Tailwind gradient string
  const fromMatch = tailwindGradient.match(/from-(\w+-\d+)/);
  const toMatch = tailwindGradient.match(/to-(\w+-\d+)/);

  if (!fromMatch || !toMatch) {
    return "linear-gradient(135deg, #999999 0%, #666666 100%)";
  }

  const fromKey = fromMatch[1];
  const toKey = toMatch[1];
  const fromColor = (fromKey && TAILWIND_COLORS[fromKey]) || "#999999";
  const toColor = (toKey && TAILWIND_COLORS[toKey]) || "#666666";

  return `linear-gradient(135deg, ${fromColor} 0%, ${toColor} 100%)`;
}

/**
 * GET /api/occasions
 * Returns all active occasions from database.
 * Used by: homepage occasions grid, catalog filters
 */
export async function GET(request: NextRequest) {
  try {
    const occasions = await prisma.occasionConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // Only surface occasions that actually have at least one purchasable
    // (active, catalog-visible) product — otherwise the nav/homepage would link
    // to a dead-end "0 products" page (e.g. an occasion whose only items are
    // archived). Mirrors the active+not-hidden rule used by the product catalog.
    const hiddenCategoryIds = await getHiddenCategoryIds();
    const productFilter = {
      status: "active" as const,
      ...(hiddenCategoryIds.length > 0
        ? { categories: { none: { categoryId: { in: hiddenCategoryIds } } } }
        : {}),
    };
    const occWithProducts = await prisma.productOccasion.findMany({
      where: { product: productFilter },
      select: { occasionId: true },
      distinct: ["occasionId"],
    });
    const occasionIdsWithProducts = new Set(
      occWithProducts.map((o) => o.occasionId)
    );
    const visibleOccasions = occasions.filter((o) =>
      occasionIdsWithProducts.has(o.id)
    );

    const formattedOccasions = visibleOccasions.map((occasion) => {
      let bg = "linear-gradient(135deg, #999999 0%, #666666 100%)";

      if (occasion.gradient) {
        // Convert Tailwind gradient classes to CSS gradient
        if (occasion.gradient.includes("from-") && occasion.gradient.includes("to-")) {
          bg = convertTailwindGradient(occasion.gradient);
        } else {
          // Already a CSS gradient
          bg = occasion.gradient;
        }
      }

      return {
        icon: occasion.icon || "🎁",
        name: occasion.name,
        desc: occasion.description || "Perfect for this occasion",
        bg: bg,
        slug: occasion.slug,
      };
    });

    return NextResponse.json(formattedOccasions);
  } catch (error) {
    console.error("Error fetching occasions:", error);
    return NextResponse.json(
      { error: "Failed to fetch occasions" },
      { status: 500 }
    );
  }
}
