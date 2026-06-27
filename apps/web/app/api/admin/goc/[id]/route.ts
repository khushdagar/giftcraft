import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateCampaignSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  heroImage: z.string().url().optional(),
  status: z.enum(['draft', 'active', 'paused', 'expired']).optional(),
  claimLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  productIds: z.array(z.string()).optional(),
});

interface RouteParams {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = params;

    const campaign = await prisma.gocCampaign.findUnique({
      where: { id },
      include: {
        options: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: { take: 1 },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        claims: {
          include: {
            option: {
              include: {
                product: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: campaign,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error fetching GOC campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const validation = updateCampaignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check campaign exists
    const existing = await prisma.gocCampaign.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // If updating products, verify they exist
    if (data.productIds) {
      const products = await prisma.product.findMany({
        where: { id: { in: data.productIds } },
      });

      if (products.length !== data.productIds.length) {
        return NextResponse.json(
          { error: 'One or more products not found' },
          { status: 400 }
        );
      }

      // Delete old options and create new ones
      await prisma.gocOption.deleteMany({
        where: { campaignId: id },
      });

      await prisma.gocOption.createMany({
        data: data.productIds.map((productId, index) => ({
          campaignId: id,
          productId,
          sortOrder: index,
        })),
      });
    }

    // Update campaign
    const campaign = await prisma.gocCampaign.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.heroImage !== undefined && { heroImage: data.heroImage }),
        ...(data.status && { status: data.status }),
        ...(data.claimLimit !== undefined && { claimLimit: data.claimLimit }),
        ...(data.expiresAt && { expiresAt: new Date(data.expiresAt) }),
      },
      include: { options: true },
    });

    console.log('✅ GOC Campaign updated:', campaign.id);

    return NextResponse.json(
      {
        success: true,
        data: { id: campaign.id },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error updating GOC campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Check campaign exists
    const campaign = await prisma.gocCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Delete campaign (cascade deletes options and claims)
    await prisma.gocCampaign.delete({
      where: { id },
    });

    console.log('✅ GOC Campaign deleted:', id);

    return NextResponse.json(
      {
        success: true,
        message: 'Campaign deleted successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error deleting GOC campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
