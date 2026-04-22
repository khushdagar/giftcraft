import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/banners
 * Returns all active homepage banners.
 * Used by: homepage hero carousel (SLIDES)
 */
export async function GET(request: NextRequest) {
  try {
    const banners = await prisma.homepageBanner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const formattedBanners = banners.map((banner) => ({
      overline: banner.title,
      titleA: banner.title.split(", ")[0] || banner.title,
      titleB: banner.title.split(", ")[1] || "",
      subtitle: banner.subtitle || "",
      bg: banner.imageUrl 
        ? `linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${banner.imageUrl})`
        : "linear-gradient(135deg,#2a1f14,#1a1510 20%,#12100d 50%,#1a1510 80%,#2a1f14)",
      ctaLabel: banner.ctaLabel,
      ctaUrl: banner.ctaUrl,
    }));

    return NextResponse.json(formattedBanners);
  } catch (error) {
    console.error("Error fetching banners:", error);
    return NextResponse.json(
      { error: "Failed to fetch banners" },
      { status: 500 }
    );
  }
}
