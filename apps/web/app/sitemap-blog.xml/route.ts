import { prisma } from '@/lib/prisma';
import { publishedPostWhere } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';
import { urlsetXml, sitemapResponse, latest, type SitemapEntry } from '@/lib/sitemap-xml';

export const dynamic = 'force-dynamic';

// The blog hub and every published indexable post — nothing else. Author
// profiles, category filters and paginated listings are reachable by crawling
// links and are deliberately kept out of the sitemap.
export async function GET() {
  const entries: SitemapEntry[] = [];

  try {
    const posts = await prisma.blogPost.findMany({
      where: { ...publishedPostWhere(), noIndex: false },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    });

    entries.push(
      {
        url: `${SITE_URL}/blog`,
        lastmod: latest(posts.map((p) => p.updatedAt)),
        changefreq: 'weekly',
        priority: 0.6,
      },
      ...posts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastmod: post.updatedAt,
        changefreq: 'monthly' as const,
        priority: 0.6,
      }))
    );
  } catch (error) {
    console.error('sitemap-blog: generation failed', error);
  }

  return sitemapResponse(urlsetXml(entries));
}
