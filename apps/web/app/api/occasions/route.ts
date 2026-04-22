import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const formattedOccasions = occasions.map((occasion) => ({
      icon: occasion.icon || "🎁",
      name: occasion.name,
      desc: occasion.description || "Perfect for this occasion",
      bg: occasion.gradient || "from-gray-400 to-gray-600",
      slug: occasion.slug,
    }));

    return NextResponse.json(formattedOccasions);
  } catch (error) {
    console.error("Error fetching occasions:", error);
    return NextResponse.json(
      { error: "Failed to fetch occasions" },
      { status: 500 }
    );
  }
}
