import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const packs = await prisma.giftPack.findMany({
      include: {
        items: { select: { id: true, productId: true, quantity: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(packs);
  } catch (error) {
    console.error('Error fetching gift packs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const ItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  sortOrder: z.number().int().default(0),
});

const CreatePackSchema = z.object({
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = CreatePackSchema.parse(body);

    const existing = await prisma.giftPack.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    // De-dupe items by productId (the DB unique constraint would otherwise reject).
    const seen = new Set<string>();
    const items = data.items.filter((it) => {
      if (seen.has(it.productId)) return false;
      seen.add(it.productId);
      return true;
    });
    const categoryIds = Array.from(new Set(data.categoryIds));

    const pack = await prisma.giftPack.create({
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

    return NextResponse.json(pack, { status: 201 });
  } catch (error) {
    console.error('Error creating gift pack:', error);
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
