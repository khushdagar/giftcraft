import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Plus, Star, ExternalLink, EyeOff, MessageCircle, Users } from 'lucide-react';
import { formatPostDate } from '@/lib/blog';
import { DeletePostButton } from '@/components/admin/blog/delete-post-button';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-rose-100 text-rose-700',
};

export default async function AdminBlogPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') redirect('/');

  const [posts, pendingComments] = await Promise.all([
    prisma.blogPost.findMany({
      include: { category: { select: { name: true } } },
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.blogComment.count({ where: { status: 'pending' } }),
  ]);

  const published = posts.filter((p) => p.status === 'published').length;
  const drafts = posts.filter((p) => p.status === 'draft').length;

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-normal tracking-tight text-ink">Blog</h1>
            <p className="mt-1 text-sm text-ink-2">
              {posts.length} post{posts.length !== 1 ? 's' : ''} · {published} published · {drafts} draft
              {drafts !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/blog/authors"
              className="inline-flex items-center gap-2 rounded-2xl border border-bdr px-4 py-2 text-sm text-ink-2 transition hover:border-ink hover:text-ink"
            >
              <Users className="h-4 w-4" />
              Authors
            </Link>
            <Link
              href="/admin/blog/comments"
              className="inline-flex items-center gap-2 rounded-2xl border border-bdr px-4 py-2 text-sm text-ink-2 transition hover:border-ink hover:text-ink"
            >
              <MessageCircle className="h-4 w-4" />
              Comments
              {pendingComments > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {pendingComments}
                </span>
              )}
            </Link>
            <Button asChild className="rounded-2xl bg-em px-6 py-2 font-normal hover:bg-em-600">
              <Link href="/admin/blog/new">
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-bdr py-20 text-center">
          <p className="text-sm font-medium text-ink">No posts yet</p>
          <p className="mt-1 text-sm text-ink-2">Write your first post to fill the blog.</p>
          <Button asChild className="mt-6 rounded-2xl bg-em px-6 font-normal hover:bg-em-600">
            <Link href="/admin/blog/new">
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-bdr bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-bdr bg-gray-50 text-left">
              <tr className="text-xs font-semibold uppercase tracking-wide text-ink-3">
                <th className="px-4 py-3">Post</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bdr">
              {posts.map((post) => {
                const scheduled =
                  post.status === 'published' && post.publishedAt && post.publishedAt > new Date();
                return (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {post.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.coverImageUrl} alt="" className="h-10 w-16 flex-shrink-0 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-16 flex-shrink-0 rounded bg-gray-100" />
                        )}
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                            {post.isFeatured && <Star className="h-3.5 w-3.5 flex-shrink-0 fill-amber-400 text-amber-400" />}
                            {post.title}
                            {post.noIndex && <EyeOff className="h-3.5 w-3.5 flex-shrink-0 text-ink-3" />}
                          </p>
                          <p className="truncate text-xs text-ink-3">
                            /blog/{post.slug} · {post.readingMinutes} min read
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${STATUS_STYLES[post.status]} font-medium`}>
                        {scheduled ? 'scheduled' : post.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{post.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-2">
                      {post.publishedAt ? formatPostDate(post.publishedAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {post.status === 'published' && !scheduled && (
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            className="rounded p-2 text-ink-3 transition hover:bg-gray-100 hover:text-ink"
                            title="View live"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}
                        <Link
                          href={`/admin/blog/${post.id}/edit`}
                          className="rounded p-2 text-ink-3 transition hover:bg-gray-100 hover:text-ink"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <DeletePostButton id={post.id} title={post.title} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
