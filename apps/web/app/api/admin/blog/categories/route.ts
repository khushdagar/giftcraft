import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/blog';

const CategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(60),
  description: z.string().max(300).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const categories = await prisma.blogCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { posts: true } } },
  });
  return NextResponse.json({ success: true, data: categories });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = CategorySchema.parse(await req.json());
    const slug = slugify(body.name);

    const clash = await prisma.blogCategory.findUnique({ where: { slug } });
    if (clash) {
      return NextResponse.json({ error: 'That category already exists.' }, { status: 409 });
    }

    const category = await prisma.blogCategory.create({
      data: { name: body.name, slug, description: body.description || null },
    });
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }
    console.error('Failed to create blog category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing category id' }, { status: 400 });

  try {
    // Posts keep existing; the schema sets their categoryId to null.
    await prisma.blogCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete blog category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
