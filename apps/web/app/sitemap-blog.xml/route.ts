import { prisma } from '@/lib/prisma';
import { publishedPostWhere, POSTS_PER_PAGE } from '@/lib/blog';
import { getAuthors, authorPagePath } from '@/lib/authors';
import { SITE_URL } from '@/lib/site';
import { urlsetXml, sitemapResponse, latest, type SitemapEntry } from '@/lib/sitemap-xml';

export const dynamic = 'force-dynamic';

// Blog hub, every published indexable post, category listings, and the
// paginated /blog?page=N pages (otherwise only reachable by crawling links).
// Posts marked noIndex stay out, same as the old flat sitemap.
export async function GET() {
  const entries: SitemapEntry[] = [];

  try {
    const authors = await getAuthors();
    const posts = await prisma.blogPost.findMany({
      where: { ...publishedPostWhere(), noIndex: false },
      select: { slug: true, updatedAt: true, category: { select: { slug: true } } },
      orderBy: { publishedAt: 'desc' },
    });

    // Category listings with at least one visible post — derived from the
    // posts themselves, so the set matches what actually renders.
    const categoryMax = new Map<string, Date>();
    for (const post of posts) {
      const slug = post.category?.slug;
      if (!slug) continue;
      const current = categoryMax.get(slug);
      if (!current || post.updatedAt > current) categoryMax.set(slug, post.updatedAt);
    }

    entries.push(
      {
        url: `${SITE_URL}/blog`,
        lastmod: latest(posts.map((p) => p.updatedAt)),
        changefreq: 'weekly',
        priority: 0.6,
      },
      // Author profile pages — the entities the bylines link to.
      ...authors.map((author) => ({
        url: `${SITE_URL}${authorPagePath(author.slug)}`,
        lastmod: latest(posts.map((p) => p.updatedAt)),
        changefreq: 'monthly' as const,
        priority: 0.4,
      })),
      ...posts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastmod: post.updatedAt,
        changefreq: 'monthly' as const,
        priority: 0.6,
      })),
      ...Array.from(categoryMax, ([slug, lastmod]) => ({
        url: `${SITE_URL}/blog?category=${slug}`,
        lastmod,
        changefreq: 'weekly' as const,
        priority: 0.5,
      })),
      // Page 2 onwards; each page stamped with the newest post it lists.
      ...Array.from(
        { length: Math.max(0, Math.ceil(posts.length / POSTS_PER_PAGE) - 1) },
        (_, i) => ({
          url: `${SITE_URL}/blog?page=${i + 2}`,
          lastmod: latest(
            posts.slice((i + 1) * POSTS_PER_PAGE, (i + 2) * POSTS_PER_PAGE).map((p) => p.updatedAt)
          ),
          changefreq: 'weekly' as const,
          priority: 0.4,
        })
      )
    );
  } catch (error) {
    console.error('sitemap-blog: generation failed', error);
  }

  return sitemapResponse(urlsetXml(entries));
}
