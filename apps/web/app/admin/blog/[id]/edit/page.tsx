import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { BlogForm, type BlogPostFormData } from '@/components/admin/blog/blog-form';
import { blogCategoryOptions } from '@/lib/blog-categories';
import { getAuthors } from '@/lib/authors';

export const dynamic = 'force-dynamic';

export default async function EditBlogPostPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') redirect('/');

  const [post, categories, authorRows] = await Promise.all([
    prisma.blogPost.findUnique({
      where: { id: params.id },
      include: { category: { select: { name: true } } },
    }),
    blogCategoryOptions(),
    getAuthors(),
  ]);
  const authors = authorRows.map((a) => ({ name: a.name, role: a.role }));

  if (!post) notFound();

  // The form is a controlled client component, so every field must be a string
  // or boolean — never null.
  const initial: BlogPostFormData = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    content: post.content,
    coverImageUrl: post.coverImageUrl ?? '',
    coverImageAlt: post.coverImageAlt ?? '',
    status: post.status,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : '',
    isFeatured: post.isFeatured,
    tags: post.tags,
    categoryName: post.category?.name ?? '',
    authorName: post.authorName ?? '',
    metaTitle: post.metaTitle ?? '',
    metaDescription: post.metaDescription ?? '',
    canonicalUrl: post.canonicalUrl ?? '',
    ogImageUrl: post.ogImageUrl ?? '',
    noIndex: post.noIndex,
  };

  return (
    <>
      <div className="mb-6">
        <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
          <ChevronLeft className="h-4 w-4" />
          Back to posts
        </Link>
        <h1 className="mt-2 truncate text-3xl font-normal tracking-tight text-ink">{post.title}</h1>
      </div>

      <BlogForm mode="edit" post={initial} categories={categories} authors={authors} />
    </>
  );
}
