import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, absoluteUrl } from '@/lib/site';

/**
 * schema.org JSON-LD builders. Values must always mirror what is visibly
 * rendered on the page (schema-vs-content mismatches risk manual actions).
 * NEVER add aggregateRating/review here unless it comes from real review rows.
 */

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description: SITE_DESCRIPTION,
    // sameAs: add real social profile URLs when they exist — never placeholders.
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
      url: `${SITE_URL}/contact`,
    },
  };
}

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/catalog?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbSchema(crumbs: Array<{ name: string; path?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: absoluteUrl(c.path) } : {}),
    })),
  };
}

export function productSchema(p: {
  name: string;
  slug: string;
  description?: string | null;
  sku: string;
  brand?: string | null;
  images: string[];
  /** Lowest visible per-unit sell price (tier 1). */
  price: number;
  inStock: boolean;
  /** Real aggregate from approved reviews — omit entirely when none exist. */
  aggregateRating?: { ratingValue: number; reviewCount: number };
}) {
  // 90 days out — Merchant listings warn without priceValidUntil.
  const priceValidUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.sku,
    ...(p.description ? { description: p.description } : {}),
    ...(p.images.length > 0 ? { image: p.images.map(absoluteUrl) } : {}),
    brand: { '@type': 'Brand', name: p.brand || SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${p.slug}`,
      price: p.price.toFixed(2),
      priceCurrency: 'INR',
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      priceValidUntil,
      seller: { '@id': `${SITE_URL}/#organization` },
    },
    ...(p.aggregateRating && p.aggregateRating.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: p.aggregateRating.ratingValue,
            reviewCount: p.aggregateRating.reviewCount,
          },
        }
      : {}),
  };
}

export function itemListSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: absoluteUrl(it.path),
    })),
  };
}

export function faqPageSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}
