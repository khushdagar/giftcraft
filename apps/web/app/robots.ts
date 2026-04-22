import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://giftcraft.in';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/dashboard/', '/checkout/', '/login/', '/unauthorized/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
