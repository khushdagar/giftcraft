import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { readingMinutes, autoExcerpt, slugify } from '@/lib/blog';
import { getAuthors } from '@/lib/authors';
import { resolveCategoryId, pruneEmptyCategories } from '@/lib/blog-categories';

const UpdateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(80),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().min(1),
  coverImageUrl: z.string().url().optional().nullable().or(z.literal('')),
  coverImageAlt: z.string().max(200).optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  publishedAt: z.string().datetime().optional().nullable().or(z.literal('')),
  isFeatured: z.boolean(),
  tags: z.array(z.string()),
  categoryName: z.string().max(60).optional().nullable(),
  // Byline — must be one of the AUTHORS profiles so every post resolves to a
  // real author page; anything else falls back to the default author.
  authorName: z.string().max(80).optional().nullable(),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(200).optional().nullable(),
  canonicalUrl: z.string().url().optional().nullable().or(z.literal('')),
  ogImageUrl: z.string().url().optional().nullable().or(z.literal('')),
  noIndex: z.boolean(),
});

const nullify = (v: string | null | undefined) => (v ? v : null);

/** The picked byline when an author row exists for it, else the default. */
async function resolveAuthorName(name: string | null | undefined): Promise<string> {
  const authors = await getAuthors();
  return authors.find((a) => a.name === name)?.name ?? authors[0]!.name;
}

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') return null;
  return session;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const post = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: post });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = UpdateSchema.parse(await req.json());
    const slug = slugify(body.slug || body.title);

    const existing = await prisma.blogPost.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    // Someone else may already hold this slug.
    const clash = await prisma.blogPost.findUnique({ where: { slug } });
    if (clash && clash.id !== params.id) {
      return NextResponse.json(
        { error: `The slug "${slug}" is already used by another post.` },
        { status: 409 }
      );
    }

    // Stamp publishedAt the first time a post goes live, and keep the original
    // date on every later edit so re-saving doesn't reorder the blog.
    let publishedAt: Date | null = body.publishedAt ? new Date(body.publishedAt) : null;
    if (body.status === 'published' && !publishedAt) {
      publishedAt = existing.publishedAt ?? new Date();
    }

    const categoryId = await resolveCategoryId(body.categoryName);

    const post = await prisma.blogPost.update({
      where: { id: params.id },
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
        authorName: await resolveAuthorName(body.authorName),
        metaTitle: nullify(body.metaTitle),
        metaDescription: nullify(body.metaDescription),
        canonicalUrl: nullify(body.canonicalUrl),
        ogImageUrl: nullify(body.ogImageUrl),
        noIndex: body.noIndex,
        readingMinutes: readingMinutes(body.content),
      },
    });

    // The post may have been the last one holding its old category.
    await pruneEmptyCategories();

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }
    console.error('Failed to update blog post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await prisma.blogPost.delete({ where: { id: params.id } });
    await pruneEmptyCategories();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete blog post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
