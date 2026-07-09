import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const pack = await prisma.giftPack.findUnique({
      where: { id: params.id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                brand: true,
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!pack) {
      return NextResponse.json({ error: 'Gift pack not found' }, { status: 404 });
    }

    return NextResponse.json(pack);
  } catch (error) {
    console.error('Error fetching gift pack:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const ItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  sortOrder: z.number().int().default(0),
});

const UpdatePackSchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().min(1, 'Slug required'),
  descriptionShort: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  gradient: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  collectionId: z.string().optional().nullable(),
  items: z.array(ItemSchema).default([]),
  categoryIds: z.array(z.string()).default([]),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = UpdatePackSchema.parse(body);

    // Slug uniqueness (ignore self)
    const slugOwner = await prisma.giftPack.findUnique({ where: { slug: data.slug } });
    if (slugOwner && slugOwner.id !== params.id) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    const seen = new Set<string>();
    const items = data.items.filter((it) => {
      if (seen.has(it.productId)) return false;
      seen.add(it.productId);
      return true;
    });
    const categoryIds = Array.from(new Set(data.categoryIds));

    // Replace the item + category sets atomically: wipe old links, recreate.
    const pack = await prisma.$transaction(async (tx) => {
      await tx.giftPackItem.deleteMany({ where: { packId: params.id } });
      await tx.giftPackCategory.deleteMany({ where: { packId: params.id } });
      return tx.giftPack.update({
        where: { id: params.id },
        data: {
          name: data.name,
          slug: data.slug,
          descriptionShort: data.descriptionShort || null,
          description: data.description || null,
          image: data.image || null,
          gradient: data.gradient || null,
          isActive: data.isActive,
          isFeatured: data.isFeatured,
          sortOrder: data.sortOrder,
          collectionId: data.collectionId || null,
          items: {
            create: items.map((it, i) => ({
              productId: it.productId,
              quantity: it.quantity,
              sortOrder: it.sortOrder ?? i,
            })),
          },
          categories: {
            create: categoryIds.map((categoryId) => ({ categoryId })),
          },
        },
      });
    });

    return NextResponse.json(pack);
  } catch (error) {
    console.error('Error updating gift pack:', error);
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Items cascade-delete via the relation.
    await prisma.giftPack.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gift pack:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
