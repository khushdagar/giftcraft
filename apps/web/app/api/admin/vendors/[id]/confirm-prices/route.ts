import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        priceConfirmedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        priceConfirmedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error('Error confirming vendor prices:', error);
    return NextResponse.json(
      { error: 'Failed to confirm vendor prices' },
      { status: 500 }
    );
  }
}
