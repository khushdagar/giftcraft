import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: { slug: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = params;

    const campaign = await prisma.gocCampaign.findUnique({
      where: { slug },
      include: {
        options: {
          where: { isActive: true },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: { take: 1, orderBy: { isPrimary: 'desc' } },
                priceTiers: { take: 1, orderBy: { tier: 'asc' }, select: { sellPrice: true } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'This campaign is not active' },
        { status: 410 }
      );
    }

    if (campaign.expiresAt && new Date() > campaign.expiresAt) {
      return NextResponse.json(
        { error: 'This campaign has expired' },
        { status: 410 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: campaign.id,
          name: campaign.name,
          slug: campaign.slug,
          description: campaign.description,
          heroImage: campaign.heroImage,
          status: campaign.status,
          expiresAt: campaign.expiresAt,
          claimLimit: campaign.claimLimit,
          options: campaign.options.map((opt) => ({
            id: opt.id,
            product: {
              id: opt.product.id,
              name: opt.product.name,
              slug: opt.product.slug,
              image: opt.product.images[0]?.url ?? '',
              basePrice: Number(opt.product.priceTiers[0]?.sellPrice ?? 0),
            },
            sortOrder: opt.sortOrder,
          })),
        },
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
