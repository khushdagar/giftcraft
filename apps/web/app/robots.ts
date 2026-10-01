import type { MetadataRoute } from 'next';
import { SITE_URL, SITE_NOINDEX } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  if (SITE_NOINDEX) {
    return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] } };
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api/',
        '/dashboard',
        '/checkout',
        '/login',
        '/register',
        '/unauthorized',
        '/vendor',
        '/builder?',
        '/blog?tag',
        '/thank-you',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
