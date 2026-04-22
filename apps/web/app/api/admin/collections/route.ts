import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateCollectionSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  heroImage: z.string().optional(),
  isActive: z.boolean().optional(),
  productIds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = CreateCollectionSchema.parse(body);

    const existing = await prisma.collection.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    const collection = await prisma.collection.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        heroImage: data.heroImage,
        isActive: data.isActive ?? true,
        products: data.productIds
          ? {
              createMany: {
                data: data.productIds.map((productId, idx) => ({
                  productId,
                  sortOrder: idx,
                })),
              },
            }
          : undefined,
      },
      include: {
        products: true,
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error('Error creating collection:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
