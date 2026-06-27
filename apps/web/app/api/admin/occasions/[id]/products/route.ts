import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const AddProductSchema = z.object({
  productId: z.string().min(1, 'Product ID required'),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = AddProductSchema.parse(body);

    // Verify occasion exists
    const occasion = await prisma.occasionConfig.findUnique({
      where: { id: params.id },
    });

    if (!occasion) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if already linked
    const existing = await prisma.productOccasion.findUnique({
      where: {
        productId_occasionId: {
          productId: data.productId,
          occasionId: params.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Product already linked to this occasion' },
        { status: 409 }
      );
    }

    // Link product to occasion
    const link = await prisma.productOccasion.create({
      data: {
        productId: data.productId,
        occasionId: params.id,
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('Error adding product to occasion:', error);
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
