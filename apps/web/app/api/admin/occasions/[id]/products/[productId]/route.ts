import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify occasion exists
    const occasion = await prisma.occasionConfig.findUnique({
      where: { id: params.id },
    });

    if (!occasion) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    // Verify product-occasion link exists
    const link = await prisma.productOccasion.findUnique({
      where: {
        productId_occasionId: {
          productId: params.productId,
          occasionId: params.id,
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: 'Product not linked to this occasion' }, { status: 404 });
    }

    // Remove the link
    await prisma.productOccasion.delete({
      where: {
        productId_occasionId: {
          productId: params.productId,
          occasionId: params.id,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing product from occasion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
