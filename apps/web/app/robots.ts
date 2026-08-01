import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
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
