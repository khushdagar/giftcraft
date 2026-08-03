import type { MetadataRoute } from 'next';
import { SITE_URL, SITE_NOINDEX } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  // Site-wide noindex (SITE_NOINDEX=true): the meta robots tag from the root
  // layout does the actual work. Crawling stays ALLOWED — see lib/site.ts — but
  // the sitemap is dropped, since advertising a list of noindexed URLs is
  // contradictory and just burns crawl budget.
  if (SITE_NOINDEX) {
    return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // NOTE: no trailing slashes — the site serves /login (not /login/), and
      // "Disallow: /login/" would NOT match /login.
      //
      // Private token URLs (/quote/*, /approve/*, /claim/*, /orders/*,
      // /disputes/*) are intentionally NOT listed here: they carry an
      // X-Robots-Tag: noindex header (next.config.js). Blocking them in
      // robots.txt would prevent Google from ever seeing that noindex.
      disallow: [
        '/admin',
        '/api/',
        '/dashboard',
        '/checkout',
        '/login',
        '/register',
        '/unauthorized',
        '/vendor',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
