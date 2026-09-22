import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Eye, Pencil } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { publishedPostWhere, formatPostDate, BLOG_AUTHOR } from '@/lib/blog';
import { getAuthorByName, authorPagePath } from '@/lib/authors';
import { PostArticle } from '@/components/blog/post-article';

// Session-scoped and always fresh: this renders unpublished content and must
// never be cached or reach the public.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Post preview',
  robots: { index: false, follow: false },
};

/**
 * Admin-only preview of any post — draft, scheduled, archived or live — exactly
 * as it will render on /blog/[slug]. Linked from the admin list and the editor.
 */
export default async function BlogPreviewPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect(`/login?from=${encodeURIComponent(`/blog/preview/${params.id}`)}`);
  if (session.user.role !== 'super_admin') redirect('/unauthorized');

  const post = await prisma.blogPost.findUnique({
    where: { id: params.id },
    include: { category: { select: { name: true, slug: true } } },
  });
  if (!post) notFound();

  const related = await prisma.blogPost.findMany({
    where: {
      ...publishedPostWhere(),
      id: { not: post.id },
      ...(post.categoryId ? { categoryId: post.categoryId } : {}),
    },
    orderBy: { publishedAt: 'desc' },
    take: 3,
  });

  const author = await getAuthorByName(post.authorName);
  const authorName = author?.name || post.authorName || BLOG_AUTHOR;
  const authorPath = author ? authorPagePath(author.slug) : null;

  const now = new Date();
  const isLive = post.status === 'published' && !!post.publishedAt && post.publishedAt <= now;
  const isScheduled = post.status === 'published' && !!post.publishedAt && post.publishedAt > now;

  let statusLabel: string;
  if (isLive) statusLabel = 'This post is live.';
  else if (isScheduled) statusLabel = `Scheduled to go live on ${formatPostDate(post.publishedAt!)}.`;
  else if (post.status === 'archived') statusLabel = 'This post is archived and hidden from the public.';
  else statusLabel = 'This post is a draft and hidden from the public.';

  return (
    <div className="min-h-screen bg-canvas">
      <div className="sticky top-0 z-40 border-b-2 border-amber-200 bg-amber-50">
        <div className="container-gc-w flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <p className="flex items-center gap-2 text-amber-900">
            <Eye className="h-4 w-4 shrink-0" />
            <span>
              <span className="font-bold">Preview</span> · {statusLabel} Only admins can see this page.
            </span>
          </p>
          <div className="flex items-center gap-2">
            {isLive && (
              <Link
                href={`/blog/${post.slug}`}
                className="rounded-full border-2 border-amber-300 px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                View live
              </Link>
            )}
            <Link
              href={`/admin/blog/${post.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy-800 px-3 py-1 text-xs font-semibold text-white transition hover:bg-navy-700"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit post
            </Link>
          </div>
        </div>
      </div>

      <PostArticle post={post} related={related} authorName={authorName} authorPath={authorPath} preview />
    </div>
  );
}
