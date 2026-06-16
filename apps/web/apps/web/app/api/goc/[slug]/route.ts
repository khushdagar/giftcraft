import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const campaign = await prisma.gocCampaign.findUnique({
      where: { slug: params.slug },
      include: {
        options: {
          where: { isActive: true },
          select: {
            id: true,
            productId: true,
            sortOrder: true,
            product: {
              select: {
                id: true,
                name: true,
                brand: true,
                descriptionShort: true,
                images: {
                  where: { isPrimary: true },
                  select: { url: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { claims: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Check if active and not expired
    if (campaign.status !== "active") {
      return NextResponse.json(
        { error: "Campaign is not active" },
        { status: 410 }
      );
    }

    if (campaign.expiresAt && campaign.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Campaign has expired" },
        { status: 410 }
      );
    }

    // Check claim limit
    if (
      campaign.claimLimit &&
      campaign._count.claims >= campaign.claimLimit
    ) {
      return NextResponse.json(
        { error: "Claim limit reached" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description,
      expiresAt: campaign.expiresAt,
      options: campaign.options,
    });
  } catch (error) {
    console.error("[GOC GET CAMPAIGN]", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}
