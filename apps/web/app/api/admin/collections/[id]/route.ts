import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateCollectionSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  heroImage: z.string().optional(),
  isActive: z.boolean().optional(),
  productIds: z.array(z.string()).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = UpdateCollectionSchema.parse(body);

    const existing = await prisma.collection.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const collection = await tx.collection.update({
        where: { id: params.id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.slug && { slug: data.slug }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.heroImage !== undefined && { heroImage: data.heroImage }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });

      // Update products if provided
      if (data.productIds) {
        await tx.collectionProduct.deleteMany({ where: { collectionId: params.id } });
        if (data.productIds.length > 0) {
          await tx.collectionProduct.createMany({
            data: data.productIds.map((productId, idx) => ({
              collectionId: params.id,
              productId,
              sortOrder: idx,
            })),
          });
        }
      }

      return collection;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating collection:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
