import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const samples = await prisma.sampleOrder.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
            basePrice: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: samples.map((s) => ({
          id: s.id,
          product: s.product,
          status: s.status,
          createdAt: s.createdAt,
          approvedAt: s.approvedAt,
          shippedAt: s.shippedAt,
          notes: s.notes,
          adminNotes: s.adminNotes,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error fetching user sample orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sample orders' },
      { status: 500 }
    );
  }
}
