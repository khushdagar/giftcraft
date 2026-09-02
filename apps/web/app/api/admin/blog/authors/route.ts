import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/blog';
import { getAuthors, AuthorInputSchema } from '@/lib/authors';

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return NextResponse.json({ success: true, data: await getAuthors() });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = AuthorInputSchema.parse(await req.json());
    const slug = slugify(body.slug || body.name);

    const clash = await prisma.blogAuthor.findFirst({
      where: { OR: [{ slug }, { name: body.name }] },
    });
    if (clash) {
      return NextResponse.json(
        { error: `An author named "${clash.name}" (${clash.slug}) already exists.` },
        { status: 409 }
      );
    }

    const author = await prisma.blogAuthor.create({
      data: { ...body, slug },
    });
    return NextResponse.json({ success: true, data: author }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }
    console.error('Failed to create blog author:', error);
    return NextResponse.json({ error: 'Failed to create author' }, { status: 500 });
  }
}
