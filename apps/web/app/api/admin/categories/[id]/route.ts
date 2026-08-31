import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { slugify } from '@/lib/slug';

const UpdateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).transform(slugify).optional(),
  description: z.string().optional().nullable(),
  contentBelow: z.string().optional().nullable(),
  faqs: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional()
    .nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  imageUrl: z.string().url().optional().nullable(),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: { products: true, parent: true },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = UpdateCategorySchema.parse(body);

    const existing = await prisma.category.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.category.findUnique({ where: { slug: data.slug } });
      if (slugExists) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
      }
    }

    const updated = await prisma.category.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.contentBelow !== undefined && { contentBelow: data.contentBelow || null }),
        ...(data.faqs !== undefined && {
          faqs: data.faqs && data.faqs.length > 0 ? data.faqs : Prisma.JsonNull,
        }),
        ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle || null }),
        ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription || null }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
      },
    });

    // ISR-cached (revalidate = 3600) — admin edits, FAQs included, would
    // otherwise take up to an hour to appear.
    revalidatePath(`/category/${updated.slug}`);
    if (existing.slug !== updated.slug) revalidatePath(`/category/${existing.slug}`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      select: { id: true, parentId: true },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Deleting a category just un-tags its products (the ProductCategory join
    // rows cascade-delete) — the products themselves are kept. Any sub-categories
    // are promoted up to this category's parent so they aren't orphaned.
    await prisma.$transaction([
      prisma.category.updateMany({
        where: { parentId: params.id },
        data: { parentId: category.parentId },
      }),
      prisma.category.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
