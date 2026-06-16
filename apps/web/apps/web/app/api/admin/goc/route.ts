import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { slugify } from "@/lib/utils";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  heroImage: z.string().optional(),
  status: z.enum(["draft", "active", "paused", "expired"]).default("draft"),
  claimLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  productIds: z.array(z.string()),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super_admin can list all campaigns; company_admin sees only their company's campaigns
    const isSuperAdmin = session.user.role === "super_admin";
    const companyId = isSuperAdmin ? undefined : session.user.companyId;

    const where = companyId ? { companyId } : {};

    const campaigns = await prisma.gocCampaign.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        expiresAt: true,
        claimLimit: true,
        _count: {
          select: {
            options: true,
            claims: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("[GOC GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super_admin and company_admin can create campaigns
    if (!["super_admin", "company_admin"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = createCampaignSchema.parse(body);

    const slug = validated.slug || slugify(validated.name);

    // Check slug uniqueness
    const existing = await prisma.gocCampaign.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 400 }
      );
    }

    const campaign = await prisma.gocCampaign.create({
      data: {
        name: validated.name,
        slug,
        description: validated.description,
        heroImage: validated.heroImage,
        status: validated.status,
        claimLimit: validated.claimLimit,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        companyId: session.user.role === "company_admin" ? session.user.companyId : undefined,
        createdById: session.user.id,
      },
    });

    // Add product options
    if (validated.productIds.length > 0) {
      const options = validated.productIds.map((productId, idx) => ({
        campaignId: campaign.id,
        productId,
        sortOrder: idx,
      }));
      await prisma.gocOption.createMany({ data: options });
    }

    return NextResponse.json(
      { success: true, id: campaign.id, slug: campaign.slug },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("[GOC POST]", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
