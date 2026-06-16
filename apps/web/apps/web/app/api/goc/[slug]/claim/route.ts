import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";

const claimSchema = z.object({
  optionId: z.string(),
  claimerName: z.string().min(1),
  claimerEmail: z.string().email(),
  claimerPhone: z.string().min(10),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().regex(/^\d{6}$/),
  }),
});

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await req.json();
    const validated = claimSchema.parse(body);

    // Fetch campaign
    const campaign = await prisma.gocCampaign.findUnique({
      where: { slug: params.slug },
      include: {
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

    // Validate campaign status
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

    if (campaign.claimLimit && campaign._count.claims >= campaign.claimLimit) {
      return NextResponse.json(
        { error: "Claim limit reached" },
        { status: 410 }
      );
    }

    // Check if email already claimed
    const existingClaim = await prisma.gocClaim.findFirst({
      where: {
        campaignId: campaign.id,
        claimerEmail: validated.claimerEmail,
      },
    });

    if (existingClaim) {
      return NextResponse.json(
        { error: "You have already claimed a gift from this campaign" },
        { status: 400 }
      );
    }

    // Verify option exists and belongs to campaign
    const option = await prisma.gocOption.findFirst({
      where: {
        id: validated.optionId,
        campaignId: campaign.id,
      },
    });

    if (!option) {
      return NextResponse.json(
        { error: "Invalid product option" },
        { status: 400 }
      );
    }

    // Create claim
    const claim = await prisma.gocClaim.create({
      data: {
        campaignId: campaign.id,
        optionId: validated.optionId,
        token: nanoid(16),
        claimerName: validated.claimerName,
        claimerEmail: validated.claimerEmail,
        claimerPhone: validated.claimerPhone,
        addressJson: validated.address,
        status: "submitted",
        claimedAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, token: claim.token },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("[GOC CLAIM POST]", error);
    return NextResponse.json(
      { error: "Failed to submit claim" },
      { status: 500 }
    );
  }
}
