import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthors } from '@/lib/authors';
import { prisma } from '@/lib/prisma';
import { AuthorManager } from '@/components/admin/blog/author-manager';

export const dynamic = 'force-dynamic';

export default async function BlogAuthorsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') redirect('/');

  const authors = await getAuthors();

  // How many posts carry each byline — shown in the list and used to warn
  // before a rename. Null bylines belong to the default (oldest) author.
  const counts = await prisma.blogPost.groupBy({
    by: ['authorName'],
    _count: { _all: true },
  });
  const postCounts: Record<string, number> = {};
  for (const c of counts) {
    const name = c.authorName ?? authors[0]!.name;
    postCounts[name] = (postCounts[name] ?? 0) + c._count._all;
  }

  return (
    <>
      <div className="mb-6">
        <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
          <ChevronLeft className="h-4 w-4" />
          Back to posts
        </Link>
        <h1 className="mt-2 text-3xl font-normal tracking-tight text-ink">Authors</h1>
        <p className="mt-1 text-sm text-ink-2">
          Each author gets a public profile page with Person schema, and every post byline links to its
          author. Profiles are published verbatim — only add real people with bios they have approved.
        </p>
      </div>

      <AuthorManager
        initialAuthors={authors.map((a) => ({
          id: a.id,
          name: a.name,
          slug: a.slug,
          role: a.role,
          summary: a.summary,
          bio: a.bio,
          credentials: a.credentials,
          knowsAbout: a.knowsAbout,
          sameAs: a.sameAs,
        }))}
        postCounts={postCounts}
      />
    </>
  );
}
