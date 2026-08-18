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

    const collection = await prisma.giftCollection.findUnique({
      where: { id: params.id },
      include: {
        packs: {
          orderBy: { sortOrder: 'asc' },
          include: { items: { select: { id: true } } },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json(collection);
  } catch (error) {
    console.error('Error fetching gift collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const UpdateCollectionSchema = z.object({
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
    const data = UpdateCollectionSchema.parse(body);

    const slugOwner = await prisma.giftCollection.findUnique({ where: { slug: data.slug } });
    if (slugOwner && slugOwner.id !== params.id) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    if (data.parentId) {
      if (data.parentId === params.id) {
        return NextResponse.json(
          { error: 'A collection cannot be its own parent.' },
          { status: 400 }
        );
      }
      const [parent, ownChildren] = await Promise.all([
        prisma.giftCollection.findUnique({
          where: { id: data.parentId },
          select: { parentId: true },
        }),
        prisma.giftCollection.count({ where: { parentId: params.id } }),
      ]);
      if (!parent) {
        return NextResponse.json({ error: 'Parent collection not found' }, { status: 400 });
      }
      // Both guards keep the tree exactly two levels deep — the parent must be
      // top-level, and a collection that already has children cannot be nested.
      if (parent.parentId) {
        return NextResponse.json(
          { error: 'A sub-collection cannot hold sub-collections — pick a top-level parent.' },
          { status: 400 }
        );
      }
      if (ownChildren > 0) {
        return NextResponse.json(
          {
            error:
              'This collection has sub-collections of its own, so it cannot be nested under another. Move its sub-collections out first.',
          },
          { status: 400 }
        );
      }
    }

    const collection = await prisma.giftCollection.update({
      where: { id: params.id },
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

    return NextResponse.json(collection);
  } catch (error) {
    console.error('Error updating gift collection:', error);
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

    // Packs are detached (collectionId set to null via onDelete: SetNull),
    // not deleted — the packs themselves survive as standalone.
    await prisma.giftCollection.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gift collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
