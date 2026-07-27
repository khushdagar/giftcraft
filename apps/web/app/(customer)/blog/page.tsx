import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { formatPostDate, publishedPostWhere } from '@/lib/blog';
import { Clock } from 'lucide-react';

export const metadata = {
  title: 'Blog',
  description:
    'Trends, tips, and stories on the art of thoughtful corporate gifting — from the GIVOO team.',
};

// Short revalidate so a scheduled post appears without a redeploy.
export const revalidate = 300;

interface PageProps {
  searchParams: { category?: string; tag?: string };
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { category, tag } = searchParams;

  const where = {
    ...publishedPostWhere(),
    ...(category ? { category: { slug: category } } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const [posts, categories] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: { category: { select: { name: true, slug: true } } },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
    }),
    prisma.blogCategory.findMany({
      // Only offer a category filter that can actually return something.
      where: { posts: { some: publishedPostWhere() } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
  ]);

  const [lead, ...rest] = posts;
  const isFiltered = Boolean(category || tag);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="container-gc-w px-4 py-12 md:py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="overline text-ink-3">Insights</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">The GIVOO Blog</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-2">
            Trends, tips, and stories on the art of thoughtful corporate gifting.
          </p>
        </div>

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/blog"
              className={`rounded-full border-2 px-4 py-1.5 text-xs font-semibold transition ${
                !category ? 'border-em bg-em text-white' : 'border-bdr text-ink-2 hover:border-em'
              }`}
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/blog?category=${c.slug}`}
                className={`rounded-full border-2 px-4 py-1.5 text-xs font-semibold transition ${
                  category === c.slug ? 'border-em bg-em text-white' : 'border-bdr text-ink-2 hover:border-em'
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {tag && (
          <p className="mb-8 text-center text-sm text-ink-2">
            Showing posts tagged <span className="font-semibold text-ink">#{tag}</span> ·{' '}
            <Link href="/blog" className="font-semibold text-em underline">
              Clear
            </Link>
          </p>
        )}

        {posts.length === 0 ? (
          <div className="rounded-md border-2 border-dashed border-bdr py-24 text-center">
            <p className="text-lg font-bold text-ink">
              {isFiltered ? 'No posts here yet' : 'No posts published yet'}
            </p>
            <p className="mt-2 text-sm text-ink-2">
              {isFiltered ? (
                <>
                  Try{' '}
                  <Link href="/blog" className="font-semibold text-em underline">
                    all posts
                  </Link>
                  .
                </>
              ) : (
                'Check back soon — we are writing.'
              )}
            </p>
          </div>
        ) : (
          <>
            {/* Lead post — only on the unfiltered index, where "latest" means something */}
            {lead && !isFiltered && (
              <Link
                href={`/blog/${lead.slug}`}
                className="group mb-12 grid gap-6 overflow-hidden rounded-md border-2 border-bdr bg-white md:grid-cols-2"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-50 md:aspect-auto md:h-full">
                  {lead.coverImageUrl ? (
                    <Image
                      src={lead.coverImageUrl}
                      alt={lead.coverImageAlt || lead.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                      priority
                    />
                  ) : (
                    <div className="flex h-full min-h-[240px] items-center justify-center bg-gradient-to-br from-em-50 to-sky-50 text-5xl">
                      ✍️
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center p-6 md:p-10">
                  <p className="overline text-em">
                    {lead.isFeatured ? 'Featured' : lead.category?.name ?? 'Latest'}
                  </p>
                  <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-ink transition group-hover:text-em md:text-3xl">
                    {lead.title}
                  </h2>
                  {lead.excerpt && <p className="mt-3 text-base leading-relaxed text-ink-2">{lead.excerpt}</p>}
                  <PostMeta date={lead.publishedAt!} minutes={lead.readingMinutes} author={lead.authorName} />
                </div>
              </Link>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(isFiltered ? posts : rest).map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-md border-2 border-bdr bg-white transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-gray-50">
                    {post.coverImageUrl ? (
                      <Image
                        src={post.coverImageUrl}
                        alt={post.coverImageAlt || post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-em-50 to-sky-50 text-4xl">
                        ✍️
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    {post.category && (
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-em">
                        {post.category.name}
                      </p>
                    )}
                    <h3 className="mt-1.5 text-lg font-bold leading-snug tracking-tight text-ink transition group-hover:text-em">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-2">{post.excerpt}</p>
                    )}
                    <div className="mt-auto">
                      <PostMeta date={post.publishedAt!} minutes={post.readingMinutes} author={post.authorName} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PostMeta({ date, minutes, author }: { date: Date; minutes: number; author: string | null }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
      <time dateTime={new Date(date).toISOString()}>{formatPostDate(date)}</time>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {minutes} min read
      </span>
      {author && (
        <>
          <span aria-hidden>·</span>
          <span>{author}</span>
        </>
      )}
    </div>
  );
}
