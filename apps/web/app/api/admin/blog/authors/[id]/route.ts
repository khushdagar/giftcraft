import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/blog';
import { AuthorInputSchema } from '@/lib/authors';

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') return null;
  return session;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = AuthorInputSchema.parse(await req.json());
    const slug = slugify(body.slug || body.name);

    const existing = await prisma.blogAuthor.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Author not found' }, { status: 404 });

    const clash = await prisma.blogAuthor.findFirst({
      where: { id: { not: params.id }, OR: [{ slug }, { name: body.name }] },
    });
    if (clash) {
      return NextResponse.json(
        { error: `An author named "${clash.name}" (${clash.slug}) already exists.` },
        { status: 409 }
      );
    }

    // Posts reference the author by name, so a rename must carry the bylines
    // along or they'd silently fall back to the default author.
    const author = await prisma.$transaction(async (tx) => {
      const updated = await tx.blogAuthor.update({
        where: { id: params.id },
        data: { ...body, slug },
      });
      if (existing.name !== body.name) {
        await tx.blogPost.updateMany({
          where: { authorName: existing.name },
          data: { authorName: body.name },
        });
      }
      return updated;
    });

    return NextResponse.json({ success: true, data: author });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }
    console.error('Failed to update blog author:', error);
    return NextResponse.json({ error: 'Failed to update author' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const existing = await prisma.blogAuthor.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Author not found' }, { status: 404 });

  const total = await prisma.blogAuthor.count();
  if (total <= 1) {
    return NextResponse.json(
      { error: 'The blog needs at least one author — add another before deleting this one.' },
      { status: 400 }
    );
  }

  const inUse = await prisma.blogPost.count({ where: { authorName: existing.name } });
  if (inUse > 0) {
    return NextResponse.json(
      { error: `${existing.name} is the byline on ${inUse} post${inUse === 1 ? '' : 's'}. Reassign those posts to another author first.` },
      { status: 400 }
    );
  }

  await prisma.blogAuthor.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
