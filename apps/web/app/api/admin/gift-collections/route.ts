import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// List all curated collections with a lightweight pack summary.
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const collections = await prisma.giftCollection.findMany({
      include: {
        packs: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, image: true, gradient: true, isActive: true },
        },
        // Consumers need to tell a top-level collection from a sub-collection —
        // the pack editor groups its dropdown by exactly this.
        parent: { select: { id: true, name: true } },
        children: { select: { id: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error('Error fetching gift collections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const CreateCollectionSchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().min(1, 'Slug required'),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  gradient: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  // null = top-level. Set it to nest this collection one level down; the
  // handlers reject anything that would make the tree deeper than two.
  parentId: z.string().nullish(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = CreateCollectionSchema.parse(body);

    const existing = await prisma.giftCollection.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    // The tree is capped at two levels: a parent must itself be top-level,
    // so a sub-collection can never gain children of its own.
    if (data.parentId) {
      const parent = await prisma.giftCollection.findUnique({
        where: { id: data.parentId },
        select: { parentId: true },
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent collection not found' }, { status: 400 });
      }
      if (parent.parentId) {
        return NextResponse.json(
          { error: 'A sub-collection cannot hold sub-collections — pick a top-level parent.' },
          { status: 400 }
        );
      }
    }

    const collection = await prisma.giftCollection.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        image: data.image || null,
        gradient: data.gradient || null,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
        parentId: data.parentId || null,
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error('Error creating gift collection:', error);
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
