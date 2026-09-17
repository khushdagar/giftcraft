import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CommentModeration } from '@/components/admin/blog/comment-moderation';
import { AdminPagination, adminPaging } from '@/components/admin/admin-pagination';

export const dynamic = 'force-dynamic';

export default async function AdminBlogCommentsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') redirect('/');

  // Header counts come from the database, not from the visible page.
  const { page, skip, take } = adminPaging(searchParams);
  const [comments, total, pending] = await Promise.all([
    prisma.blogComment.findMany({
      include: { post: { select: { title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.blogComment.count(),
    prisma.blogComment.count({ where: { status: 'pending' } }),
  ]);

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <Link
          href="/admin/blog"
          className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Blog
        </Link>
        <h1 className="mt-3 text-3xl font-normal tracking-tight text-ink">Comments</h1>
        <p className="mt-1 text-sm text-ink-2">
          {pending} awaiting review · {total} total. Nothing is public until you approve
          it.
        </p>
      </div>

      <CommentModeration
        comments={comments.map((c) => ({
          id: c.id,
          authorName: c.authorName,
          email: c.email,
          body: c.body,
          status: c.status,
          createdAt: c.createdAt.toISOString(),
          postTitle: c.post.title,
          postSlug: c.post.slug,
        }))}
      />
      <div className="mt-4">
        <AdminPagination basePath="/admin/blog/comments" page={page} total={total} searchParams={searchParams} noun="comments" />
      </div>
    </>
  );
}
