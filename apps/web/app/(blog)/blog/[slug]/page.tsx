import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { publishedPostWhere, autoExcerpt, extractFaqs, BLOG_AUTHOR } from '@/lib/blog';
import { getAuthorByName, authorPagePath } from '@/lib/authors';
import { PostArticle } from '@/components/blog/post-article';
import { JsonLd } from '@/components/seo/json-ld';
import { articleSchema, faqSchema } from '@/lib/schema';
import { SITE_NAME } from '@/lib/site';
import { withPageSeo } from '@/lib/page-seo';

export const revalidate = 300;

const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://givoo.in';

/** Drafts and future-dated posts are 404 to the public; admins preview them at /blog/preview/[id]. */
async function getPost(slug: string) {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: { category: { select: { name: true, slug: true } } },
  });
  if (!post || post.status !== 'published') return null;
  if (!post.publishedAt || post.publishedAt > new Date()) return null;
  return post;
}

/**
 * The image link previews (Google Chat, WhatsApp, LinkedIn, X) actually load.
 *
 * Uploads are stored as WebP, which most unfurlers refuse as an og:image — the
 * tags were present but the card rendered without a picture. The share image
 * is therefore served through /blog/[slug]/og.jpg (route.ts next to this
 * file), a 1200×630 JPEG rendition of the post's cover image — the cover is
 * the share image, there is no separate one. The `?v=` cache-buster changes
 * whenever the post is edited. Posts without a cover use the site card.
 */
function shareImage(post: { slug: string; coverImageUrl: string | null; updatedAt: Date }) {
  if (post.coverImageUrl) {
    return { url: `${SITE}/blog/${post.slug}/og.jpg?v=${post.updatedAt.getTime()}`, type: 'image/jpeg' };
  }
  return { url: `${SITE}/opengraph-image`, type: 'image/png' };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: 'Post not found' };

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || autoExcerpt(post.content);
  const image = shareImage(post);
  const imageAlt = post.coverImageAlt || title;
  const url = `${SITE}/blog/${post.slug}`;
  const author = await getAuthorByName(post.authorName);
  const authorName = author?.name || post.authorName || BLOG_AUTHOR;
  const authorPath = author ? authorPagePath(author.slug) : null;

  return withPageSeo(`/blog/${post.slug}`, {
    title,
    description,
    // <meta name="author"> + <link rel="author"> pointing at the profile page.
    authors: [authorPath ? { name: authorName, url: `${SITE}${authorPath}` } : { name: authorName }],
    // A canonical pointing elsewhere means this post was first published there.
    alternates: { canonical: post.canonicalUrl || url },
    // Spread, never `robots: undefined` — an explicit undefined key OVERRIDES the
    // root layout instead of inheriting it, which silently exempted this route
    // from the site-wide SITE_NOINDEX kill switch.
    ...(post.noIndex ? { robots: { index: false, follow: true } } : {}),
    // A nested `openGraph` REPLACES the root layout's object rather than merging
    // with it, so siteName and locale have to be restated here.
    openGraph: {
      type: 'article',
      siteName: SITE_NAME,
      locale: 'en_IN',
      title,
      description,
      url,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [authorName],
      tags: post.tags,
      images: [{ url: image.url, secureUrl: image.url, type: image.type, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: image.url, alt: imageAlt }],
    },
  });
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

  const author = await getAuthorByName(post.authorName);
  const authorName = author?.name || post.authorName || BLOG_AUTHOR;
  const authorPath = author ? authorPagePath(author.slug) : null;

  const image = post.coverImageUrl;
  // Publisher/logo, absolute image URLs and the @id wiring all come from the
  // shared builder. The publisher is inlined there: blog pages deliberately do
  // NOT render the site-wide Organization node (see app/(blog)/layout.tsx).
  const jsonLd = articleSchema({
    title: post.title,
    slug: post.slug,
    description: post.metaDescription || post.excerpt,
    image,
    datePublished: post.publishedAt?.toISOString() ?? null,
    dateModified: post.updatedAt.toISOString(),
    authorName,
    authorPath,
    keywords: post.tags,
  });
  // FAQPage is generated from the body whenever the author has written an
  // "FAQs" section — nothing to configure in the admin.
  const faqs = extractFaqs(post.content);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Structured data for Google's article (and FAQ) rich results. */}
      <JsonLd data={jsonLd} />
      {faqs.length > 0 && <JsonLd data={faqSchema(faqs)} />}

      <PostArticle post={post} related={related} authorName={authorName} authorPath={authorPath} />
    </div>
  );
}
