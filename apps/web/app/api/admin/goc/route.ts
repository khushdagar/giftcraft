import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createCampaignSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  heroImage: z.string().url().optional(),
  status: z.enum(['draft', 'active', 'paused', 'expired']).default('draft'),
  claimLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  productIds: z.array(z.string()).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const campaigns = await prisma.gocCampaign.findMany({
      include: {
        options: true,
        claims: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          status: c.status,
          optionCount: c.options.length,
          claimCount: c.claims.length,
          claimLimit: c.claimLimit,
          expiresAt: c.expiresAt,
          createdAt: c.createdAt,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error fetching GOC campaigns:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = createCampaignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check slug uniqueness
    const existing = await prisma.gocCampaign.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Campaign slug already exists' },
        { status: 400 }
      );
    }

    // Verify all products exist
    const products = await prisma.product.findMany({
      where: { id: { in: data.productIds } },
    });

    if (products.length !== data.productIds.length) {
      return NextResponse.json(
        { error: 'One or more products not found' },
        { status: 400 }
      );
    }

    // Create campaign with options
    const campaign = await prisma.gocCampaign.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        heroImage: data.heroImage,
        status: data.status,
        claimLimit: data.claimLimit,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdById: session.user.id,
        options: {
          createMany: {
            data: data.productIds.map((productId, index) => ({
              productId,
              sortOrder: index,
            })),
          },
        },
      },
      include: { options: true },
    });

    console.log('✅ GOC Campaign created:', campaign.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: campaign.id,
          slug: campaign.slug,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error creating GOC campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
