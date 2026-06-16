import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { slugify } from "@/lib/utils";

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  heroImage: z.string().optional(),
  status: z.enum(["draft", "active", "paused", "expired"]).optional(),
  claimLimit: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  productIds: z.array(z.string()).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaign = await prisma.gocCampaign.findUnique({
      where: { id: params.id },
      include: {
        options: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                brand: true,
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
        claims: {
          select: {
            id: true,
            token: true,
            claimerName: true,
            claimerEmail: true,
            claimerPhone: true,
            addressJson: true,
            status: true,
            optionId: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Check permissions: super_admin can view all, company_admin can only view own company's
    if (session.user.role === "company_admin" && campaign.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("[GOC GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["super_admin", "company_admin"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const campaign = await prisma.gocCampaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Permission check
    if (session.user.role === "company_admin" && campaign.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateCampaignSchema.parse(body);

    // If slug is provided and changed, check uniqueness
    let finalSlug = campaign.slug;
    if (validated.slug && validated.slug !== campaign.slug) {
      const existing = await prisma.gocCampaign.findUnique({
        where: { slug: validated.slug },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Slug already exists" },
          { status: 400 }
        );
      }
      finalSlug = validated.slug;
    } else if (validated.name && validated.name !== campaign.name) {
      finalSlug = slugify(validated.name);
    }

    const updated = await prisma.gocCampaign.update({
      where: { id: params.id },
      data: {
        name: validated.name,
        slug: finalSlug,
        description: validated.description,
        heroImage: validated.heroImage,
        status: validated.status,
        claimLimit: validated.claimLimit,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : validated.expiresAt,
      },
    });

    // Update product options if provided
    if (validated.productIds) {
      await prisma.gocOption.deleteMany({ campaignId: params.id });
      const options = validated.productIds.map((productId, idx) => ({
        campaignId: params.id,
        productId,
        sortOrder: idx,
      }));
      await prisma.gocOption.createMany({ data: options });
    }

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("[GOC PUT]", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.gocCampaign.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as any).code === "P2025") {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    console.error("[GOC DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
