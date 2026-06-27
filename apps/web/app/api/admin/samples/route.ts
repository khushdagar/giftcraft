import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');

    const samples = await prisma.sampleOrder.findMany({
      where: {
        ...(statusFilter && { status: statusFilter as any }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { take: 1 },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
          user: s.user,
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
    console.error('❌ Error fetching sample orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sample orders' },
      { status: 500 }
    );
  }
}
