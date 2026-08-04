import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatPostDate, publishedPostWhere, POSTS_PER_PAGE, BLOG_AUTHOR } from '@/lib/blog';
import { Clock } from 'lucide-react';

// Short revalidate so a scheduled post appears without a redeploy.
export const revalidate = 300;

interface PageProps {
  searchParams: { category?: string; tag?: string; page?: string };
}

/** `1` for anything that isn't a positive integer, so junk never 404s page 1. */
function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/** The canonical path for a given facet + page. Page 1 never carries `?page=`. */
function listingPath({
  category,
  tag,
  page,
}: {
  category?: string;
  tag?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (tag) params.set('tag', tag);
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/blog?${qs}` : '/blog';
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const page = parsePage(searchParams.page);
  const { category, tag } = searchParams;

  const categoryName = category
    ? (await prisma.blogCategory.findUnique({ where: { slug: category }, select: { name: true } }))
        ?.name
    : undefined;

  const base = categoryName
    ? `${categoryName} — GIVOO Blog`
    : tag
      ? `Posts tagged #${tag} — GIVOO Blog`
      : 'Blog';
  const title = page > 1 ? `${base} — Page ${page}` : base;

  const description = categoryName
    ? `${categoryName} articles on corporate gifting from the GIVOO team.`
    : 'Trends, tips, and stories on the art of thoughtful corporate gifting — from the GIVOO team.';

  return {
    title,
    description,
    // Each page is its own canonical — paginated pages are distinct content, not
    // duplicates of page 1. Tag views are thin slices of the same posts, so they
    // stay out of the index while still passing link equity through.
    alternates: { canonical: listingPath({ category, tag, page }) },
    robots: tag ? { index: false, follow: true } : undefined,
  };
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { category, tag } = searchParams;
  const page = parsePage(searchParams.page);

  const where = {
    ...publishedPostWhere(),
    ...(category ? { category: { slug: category } } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const [total, posts, categories] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      include: { category: { select: { name: true, slug: true } } },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
    }),
    prisma.blogCategory.findMany({
      // Only offer a category filter that can actually return something.
      where: { posts: { some: publishedPostWhere() } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  // An empty page 3 is a soft 404 to Google — return a real one.
  if (page > totalPages && total > 0) notFound();

  const isFiltered = Boolean(category || tag);
  // The lead treatment only means something on the first, unfiltered page.
  const showLead = !isFiltered && page === 1;
  const [lead, ...rest] = posts;

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
          {totalPages > 1 && (
            <p className="mt-3 text-sm text-ink-3">
              Page {page} of {totalPages}
            </p>
          )}
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
            {lead && showLead && (
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
              {(showLead ? rest : posts).map((post) => (
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

            <Pagination page={page} totalPages={totalPages} category={category} tag={tag} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Numbered, crawlable pagination. Every page is a plain <Link>, so a crawler
 * can walk the whole archive without running JavaScript.
 */
function Pagination({
  page,
  totalPages,
  category,
  tag,
}: {
  page: number;
  totalPages: number;
  category?: string;
  tag?: string;
}) {
  if (totalPages <= 1) return null;

  // A sliding window around the current page, with the first and last always
  // reachable — keeps the crawl depth of any page down to two clicks.
  const window = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const pages = Array.from(window)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const linkClass =
    'inline-flex h-10 min-w-10 items-center justify-center rounded-full border-2 px-3 text-sm font-semibold transition';

  return (
    <nav aria-label="Blog pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link
          href={listingPath({ category, tag, page: page - 1 })}
          rel="prev"
          className={`${linkClass} border-bdr text-ink-2 hover:border-em`}
        >
          Previous
        </Link>
      )}

      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - pages[i - 1]! > 1 && <span className="text-ink-3">…</span>}
          {p === page ? (
            <span aria-current="page" className={`${linkClass} border-em bg-em text-white`}>
              {p}
            </span>
          ) : (
            <Link href={listingPath({ category, tag, page: p })} className={`${linkClass} border-bdr text-ink-2 hover:border-em`}>
              {p}
            </Link>
          )}
        </span>
      ))}

      {page < totalPages && (
        <Link
          href={listingPath({ category, tag, page: page + 1 })}
          rel="next"
          className={`${linkClass} border-bdr text-ink-2 hover:border-em`}
        >
          Next
        </Link>
      )}
    </nav>
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
      <span aria-hidden>·</span>
      <span>{author || BLOG_AUTHOR}</span>
    </div>
  );
}
