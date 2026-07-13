import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronLeft, Clock } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatPostDate, publishedPostWhere, autoExcerpt } from '@/lib/blog';

export const revalidate = 300;

const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://giftcraft.in';

/** Drafts and future-dated posts are 404 to the public, but visible via preview links. */
async function getPost(slug: string) {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: { category: { select: { name: true, slug: true } } },
  });
  if (!post || post.status !== 'published') return null;
  if (!post.publishedAt || post.publishedAt > new Date()) return null;
  return post;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: 'Post not found' };

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || autoExcerpt(post.content);
  const image = post.ogImageUrl || post.coverImageUrl;
  const url = `${SITE}/blog/${post.slug}`;

  return {
    title,
    description,
    // A canonical pointing elsewhere means this post was first published there.
    alternates: { canonical: post.canonicalUrl || url },
    robots: post.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.tags,
      images: image ? [{ url: image, width: 1200, height: 630, alt: post.coverImageAlt || title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/** Pre-render the posts that exist at build time; the rest render on demand. */
export async function generateStaticParams() {
  const posts = await prisma.blogPost.findMany({
    where: publishedPostWhere(),
    select: { slug: true },
    take: 100,
  });
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  // Related: same category first, then anything else recent.
  const related = await prisma.blogPost.findMany({
    where: {
      ...publishedPostWhere(),
      id: { not: post.id },
      ...(post.categoryId ? { categoryId: post.categoryId } : {}),
    },
    orderBy: { publishedAt: 'desc' },
    take: 3,
  });

  const image = post.ogImageUrl || post.coverImageUrl;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription || post.excerpt || undefined,
    image: image ? [image] : undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Person', name: post.authorName || 'GiftCraft' },
    publisher: { '@type': 'Organization', name: 'GiftCraft', url: SITE },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/blog/${post.slug}` },
    keywords: post.tags.join(', ') || undefined,
  };

  return (
    <div className="min-h-screen bg-canvas">
      <script
        type="application/ld+json"
        // Structured data for Google's article rich results.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="container-gc-w px-4 py-10 md:py-14">
        <div className="mx-auto max-w-7xl">
          <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
            <ChevronLeft className="h-4 w-4" />
            All posts
          </Link>

          <header className="mt-6">
            {post.category && (
              <Link
                href={`/blog?category=${post.category.slug}`}
                className="text-xs font-semibold uppercase tracking-wider text-em hover:underline"
              >
                {post.category.name}
              </Link>
            )}
            <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-ink md:text-5xl">
              {post.title}
            </h1>
            {post.excerpt && <p className="mt-4 text-lg leading-relaxed text-ink-2">{post.excerpt}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-bdr pt-5 text-sm text-ink-3">
              <time dateTime={post.publishedAt!.toISOString()}>{formatPostDate(post.publishedAt!)}</time>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.readingMinutes} min read
              </span>
              {post.authorName && (
                <>
                  <span aria-hidden>·</span>
                  <span>By {post.authorName}</span>
                </>
              )}
            </div>
          </header>

          {post.coverImageUrl && (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-md border-2 border-bdr bg-gray-50">
              <Image
                src={post.coverImageUrl}
                alt={post.coverImageAlt || post.title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Body. The HTML is authored by super_admins through the TipTap editor,
              which emits a fixed, safe node set — no arbitrary user input lands here. */}
          <div
            className="blog-content mt-10"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {post.tags.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-2 border-t border-bdr pt-6">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-ink-2 transition hover:bg-em-50 hover:text-em"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mx-auto mt-16 max-w-5xl border-t border-bdr pt-10">
            <h2 className="text-xl font-black tracking-tight text-ink">Keep reading</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/blog/${r.slug}`}
                  className="group overflow-hidden rounded-md border-2 border-bdr bg-white transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-gray-50">
                    {r.coverImageUrl ? (
                      <Image
                        src={r.coverImageUrl}
                        alt={r.coverImageAlt || r.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-em-50 to-sky-50 text-3xl">
                        ✍️
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold leading-snug text-ink transition group-hover:text-em">
                      {r.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-ink-3">{r.readingMinutes} min read</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
