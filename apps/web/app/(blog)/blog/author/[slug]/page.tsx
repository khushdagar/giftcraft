import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronLeft, Clock, BadgeCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { publishedPostWhere, formatPostDate, autoExcerpt } from '@/lib/blog';
import { getAuthors, authorPagePath } from '@/lib/authors';
import { JsonLd } from '@/components/seo/json-ld';
import { profilePageSchema } from '@/lib/schema';
import { absoluteUrl } from '@/lib/site';
import { withPageSeo } from '@/lib/page-seo';

export const revalidate = 300;

/**
 * Author profile page — the entity behind every blog byline. Bylines link
 * here (rel="author") and each post's BlogPosting.author @id resolves to the
 * Person node this page emits, so content is attributable to a real author.
 */

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const author = (await getAuthors()).find((a) => a.slug === params.slug);
  if (!author) return { title: 'Author not found' };

  const path = authorPagePath(author.slug);
  return withPageSeo(path, {
    title: `${author.name} — ${author.role}`,
    description: author.summary,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type: 'profile',
      title: `${author.name} — ${author.role}`,
      description: author.summary,
      url: absoluteUrl(path),
    },
  });
}

export default async function AuthorPage({ params }: { params: { slug: string } }) {
  const authors = await getAuthors();
  const author = authors.find((a) => a.slug === params.slug);
  if (!author) notFound();

  // Rows saved before the author picker existed have authorName null, which
  // renders as the default author — so those count as the default's posts.
  const isDefault = author.id === authors[0]!.id;
  const posts = await prisma.blogPost.findMany({
    where: {
      ...publishedPostWhere(),
      OR: [{ authorName: author.name }, ...(isDefault ? [{ authorName: null }] : [])],
    },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      coverImageAlt: true,
      readingMinutes: true,
      publishedAt: true,
      category: { select: { name: true } },
    },
  });

  const jsonLd = profilePageSchema({
    name: author.name,
    path: authorPagePath(author.slug),
    role: author.role,
    description: author.summary,
    knowsAbout: author.knowsAbout,
    sameAs: author.sameAs,
  });

  return (
    <div className="min-h-screen bg-canvas">
      <JsonLd data={jsonLd} />

      <div className="container-gc-w px-4 py-10 md:py-14">
        <div className="mx-auto max-w-7xl">
          <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
            <ChevronLeft className="h-4 w-4" />
            All posts
          </Link>

          {/* Profile */}
          <header className="mt-6 rounded-md border-2 border-bdr bg-white p-6 md:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-em-50 to-sky-50 text-3xl font-black text-em">
                {author.name.charAt(0)}
              </div>
              <div>
                <p className="overline text-em">Author</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-ink md:text-4xl">
                  {author.name}
                </h1>
                <p className="mt-1 text-sm font-semibold text-ink-2">{author.role}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {author.bio.map((para) => (
                <p key={para.slice(0, 40)} className="text-base leading-relaxed text-ink-2">
                  {para}
                </p>
              ))}
            </div>

            {author.credentials.length > 0 && (
              <ul className="mt-6 space-y-2 border-t border-bdr pt-6">
                {author.credentials.map((cred) => (
                  <li key={cred} className="flex items-start gap-2 text-sm text-ink-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-em" />
                    {cred}
                  </li>
                ))}
              </ul>
            )}
          </header>

          {/* Posts by this author */}
          {posts.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-black tracking-tight text-ink">
                Articles by {author.name}
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
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
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-2">
                        {post.excerpt || autoExcerpt(post.content, 120)}
                      </p>
                      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-ink-3">
                        <time dateTime={post.publishedAt!.toISOString()}>{formatPostDate(post.publishedAt!)}</time>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readingMinutes} min read
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
