import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { readingMinutes, autoExcerpt, slugify } from '@/lib/blog';
import { getAuthors } from '@/lib/authors';
import { resolveCategoryId, pruneEmptyCategories } from '@/lib/blog-categories';

const PostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1).max(80),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().min(1, 'Content is required'),
  coverImageUrl: z.string().url().optional().nullable().or(z.literal('')),
  coverImageAlt: z.string().max(200).optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  publishedAt: z.string().datetime().optional().nullable().or(z.literal('')),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  // A free-typed name — matched to an existing category or created on save.
  categoryName: z.string().max(60).optional().nullable(),
  // Byline — must be one of the AUTHORS profiles so every post resolves to a
  // real author page; anything else falls back to the default author.
  authorName: z.string().max(80).optional().nullable(),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(200).optional().nullable(),
  canonicalUrl: z.string().url().optional().nullable().or(z.literal('')),
  ogImageUrl: z.string().url().optional().nullable().or(z.literal('')),
  noIndex: z.boolean().default(false),
});

/** '' → null, so empty optional inputs don't land in the DB as blank strings. */
const nullify = (v: string | null | undefined) => (v ? v : null);

/** The picked byline when an author row exists for it, else the default. */
async function resolveAuthorName(name: string | null | undefined): Promise<string> {
  const authors = await getAuthors();
  return authors.find((a) => a.name === name)?.name ?? authors[0]!.name;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get('status');
  const q = req.nextUrl.searchParams.get('q');

  const posts = await prisma.blogPost.findMany({
    where: {
      ...(status && status !== 'all' ? { status: status as any } : {}),
      ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
    },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: 'desc' }],
  });

  return NextResponse.json({ success: true, data: posts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = PostSchema.parse(await req.json());
    const slug = slugify(body.slug || body.title);

    const clash = await prisma.blogPost.findUnique({ where: { slug } });
    if (clash) {
      return NextResponse.json(
        { error: `The slug "${slug}" is already used by another post.` },
        { status: 409 }
      );
    }

    // Publishing without an explicit date means "publish now".
    const publishedAt =
      body.status === 'published'
        ? body.publishedAt
          ? new Date(body.publishedAt)
          : new Date()
        : body.publishedAt
          ? new Date(body.publishedAt)
          : null;

    const categoryId = await resolveCategoryId(body.categoryName);

    const post = await prisma.blogPost.create({
      data: {
        title: body.title,
        slug,
        excerpt: body.excerpt || autoExcerpt(body.content),
        content: body.content,
        coverImageUrl: nullify(body.coverImageUrl),
        coverImageAlt: nullify(body.coverImageAlt),
        status: body.status,
        publishedAt,
        isFeatured: body.isFeatured,
        tags: body.tags,
        categoryId,
        authorId: session.user.id,
        // The picked byline, as long as a profile page exists for it.
        authorName: await resolveAuthorName(body.authorName),
        metaTitle: nullify(body.metaTitle),
        metaDescription: nullify(body.metaDescription),
        canonicalUrl: nullify(body.canonicalUrl),
        ogImageUrl: nullify(body.ogImageUrl),
        noIndex: body.noIndex,
        readingMinutes: readingMinutes(body.content),
      },
    });

    await pruneEmptyCategories();

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }
    console.error('Failed to create blog post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
