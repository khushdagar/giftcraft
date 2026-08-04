import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CommentModeration } from '@/components/admin/blog/comment-moderation';

export const dynamic = 'force-dynamic';

export default async function AdminBlogCommentsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') redirect('/');

  const comments = await prisma.blogComment.findMany({
    include: { post: { select: { title: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  const pending = comments.filter((c) => c.status === 'pending').length;

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
          {pending} awaiting review · {comments.length} total. Nothing is public until you approve
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
    </>
  );
}
