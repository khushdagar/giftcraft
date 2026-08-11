import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, absoluteUrl } from '@/lib/site';
import { SUPPORT_PHONE, CONTACT_FALLBACK } from '@/lib/constants';

/** UN/CEFACT code for "piece" — the unit every catalog price is quoted in. */
const UNIT_PIECE = 'C62';

/** A visible slab from the product's price table. */
export interface SchemaPriceTier {
  minQty: number;
  maxQty: number | null;
  /** Per-unit sell price, exclusive of GST — exactly what the table shows. */
  sellPrice: number;
}

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
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/icon-512.png`,
      width: 512,
      height: 512,
    },
    image: `${SITE_URL}/icon-512.png`,
    description: SITE_DESCRIPTION,
    email: CONTACT_FALLBACK.email,
    telephone: SUPPORT_PHONE,
    // GIVOO is operated by Arts Shala, registered in Delhi. Only the parts we
    // can state truthfully — no invented street address.
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'New Delhi',
      addressRegion: 'DL',
      addressCountry: 'IN',
    },
    // sameAs: add real social profile URLs when they exist — never placeholders.
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
      email: CONTACT_FALLBACK.email,
      telephone: SUPPORT_PHONE,
      url: `${SITE_URL}/contact`,
    },
  };
}

/**
 * BlogPosting for an article page. Google's Article guidance wants a publisher
 * with a logo, absolute image URLs and both dates — the blog page previously
 * emitted a bare publisher and could pass a relative image through.
 */
export function articleSchema(a: {
  title: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  datePublished?: string | null;
  dateModified: string;
  authorName: string;
  keywords?: string[];
}) {
  const url = `${SITE_URL}/blog/${a.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: a.title.slice(0, 110), // Google truncates past ~110 chars
    url,
    ...(a.description ? { description: a.description } : {}),
    ...(a.image ? { image: [absoluteUrl(a.image)] } : {}),
    ...(a.datePublished ? { datePublished: a.datePublished } : {}),
    dateModified: a.dateModified,
    author: { '@type': 'Person', name: a.authorName },
    publisher: { '@id': `${SITE_URL}/#organization` },
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(a.keywords && a.keywords.length > 0 ? { keywords: a.keywords.join(', ') } : {}),
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

/** 90 days out — Merchant listings warn without priceValidUntil. */
function priceValidUntil(): string {
  return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Build the `offers` node for a bulk-priced product.
 *
 * Catalog prices are PER UNIT and drop across quantity slabs, while the page
 * also shows an order total (e.g. "10 units × ₹1,427 = ₹14,270"). A bare
 * `price` leaves that ambiguous, and a crawler that resolves it from the page
 * text instead can pick up the order total as the product price. So every
 * offer states its unit explicitly:
 *
 *   - `UnitPriceSpecification.referenceQuantity` = 1 piece → "this is per unit"
 *   - `eligibleQuantity` = the slab's quantity range (or the MOQ)
 *   - `valueAddedTaxIncluded: false` → prices are ex-GST, as displayed
 *
 * Several slabs at different prices become an AggregateOffer whose
 * lowPrice/highPrice bracket exactly the range printed in the price table
 * (listing cards show the low end, the product page the high end — both are
 * inside the range, so no surface contradicts the markup).
 */
function offersNode(o: {
  url: string;
  tiers: SchemaPriceTier[];
  /** Used when a product has no usable tier rows. */
  fallbackPrice: number;
  moq?: number | null;
  inStock: boolean;
}) {
  const availability = o.inStock
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  const common = {
    priceCurrency: 'INR',
    availability,
    itemCondition: 'https://schema.org/NewCondition',
    priceValidUntil: priceValidUntil(),
    seller: { '@id': `${SITE_URL}/#organization` },
  };

  /** Per-unit price spec — the part that makes "₹X each" unambiguous. */
  const unitSpec = (price: number) => ({
    '@type': 'UnitPriceSpecification',
    price: price.toFixed(2),
    priceCurrency: 'INR',
    valueAddedTaxIncluded: false,
    referenceQuantity: {
      '@type': 'QuantitativeValue',
      value: 1,
      unitCode: UNIT_PIECE,
    },
  });

  const qtyRange = (minQty: number, maxQty: number | null) => ({
    '@type': 'QuantitativeValue',
    minValue: minQty,
    ...(maxQty != null ? { maxValue: maxQty } : {}),
    unitCode: UNIT_PIECE,
  });

  const tiers = o.tiers
    .filter((t) => Number(t.sellPrice) > 0)
    .sort((a, b) => a.minQty - b.minQty);
  const prices = tiers.map((t) => Number(t.sellPrice));
  const distinct = new Set(prices);

  // No slab data, or one flat price across every quantity — a single Offer.
  if (tiers.length === 0 || distinct.size === 1) {
    const price = prices[0] ?? o.fallbackPrice;
    const minQty = tiers[0]?.minQty ?? o.moq ?? 1;
    return {
      '@type': 'Offer',
      url: o.url,
      price: price.toFixed(2),
      ...common,
      priceSpecification: unitSpec(price),
      eligibleQuantity: qtyRange(minQty, null),
    };
  }

  const lowest = Math.min(...prices);

  return {
    '@type': 'AggregateOffer',
    url: o.url,
    priceCurrency: 'INR',
    lowPrice: lowest.toFixed(2),
    highPrice: Math.max(...prices).toFixed(2),
    // An explicit single per-unit price alongside the range. Without it a
    // crawler wanting one number has nothing to read at the top level and can
    // fall back to page text — which is how the ORDER TOTAL for the default
    // quantity ended up in search results instead of the each-price.
    price: lowest.toFixed(2),
    priceSpecification: unitSpec(lowest),
    offerCount: tiers.length,
    availability,
    // One nested offer per visible slab, each carrying the quantity band it
    // applies to — this is the machine-readable form of the price table.
    offers: tiers.map((t) => {
      const price = Number(t.sellPrice);
      return {
        '@type': 'Offer',
        url: o.url,
        price: price.toFixed(2),
        ...common,
        priceSpecification: unitSpec(price),
        eligibleQuantity: qtyRange(t.minQty, t.maxQty),
      };
    }),
  };
}

export function productSchema(p: {
  name: string;
  slug: string;
  description?: string | null;
  sku: string;
  brand?: string | null;
  images: string[];
  /** Every visible price slab. Empty falls back to `price`. */
  tiers?: SchemaPriceTier[];
  /** Per-unit price used when no tiers are supplied. */
  price: number;
  /** Minimum order quantity, when the product sets one. */
  moq?: number | null;
  inStock: boolean;
  /** Primary category name — helps Google classify the product. */
  category?: string | null;
  /** Real aggregate from approved reviews — omit entirely when none exist. */
  aggregateRating?: { ratingValue: number; reviewCount: number };
  /** Real approved reviews only. Never synthesise these. */
  reviews?: Array<{
    author: string;
    rating: number;
    body: string;
    title?: string | null;
    datePublished: string;
  }>;
}) {
  const url = `${SITE_URL}/products/${p.slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    sku: p.sku,
    mpn: p.sku,
    url,
    ...(p.description ? { description: p.description } : {}),
    ...(p.images.length > 0 ? { image: p.images.map(absoluteUrl) } : {}),
    ...(p.category ? { category: p.category } : {}),
    brand: { '@type': 'Brand', name: p.brand || SITE_NAME },
    offers: offersNode({
      url,
      tiers: p.tiers ?? [],
      fallbackPrice: p.price,
      moq: p.moq,
      inStock: p.inStock,
    }),
    ...(p.aggregateRating && p.aggregateRating.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: p.aggregateRating.ratingValue,
            reviewCount: p.aggregateRating.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(p.reviews && p.reviews.length > 0
      ? {
          review: p.reviews.map((r) => ({
            '@type': 'Review',
            ...(r.title ? { name: r.title } : {}),
            reviewBody: r.body,
            datePublished: r.datePublished,
            author: { '@type': 'Person', name: r.author },
            reviewRating: {
              '@type': 'Rating',
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
          })),
        }
      : {}),
  };
}

/**
 * A product as it appears inside a listing page's ItemList. Price is the
 * "from" figure the card shows, so the markup matches the rendered card.
 */
export interface SchemaListProduct {
  name: string;
  path: string;
  image?: string | null;
  brand?: string | null;
  price?: number | null;
}

/** Nested Product node for listing pages — only emitted when a price exists. */
function listProductNode(item: SchemaListProduct) {
  const url = absoluteUrl(item.path);
  return {
    '@type': 'Product',
    name: item.name,
    url,
    ...(item.image ? { image: absoluteUrl(item.image) } : {}),
    ...(item.brand ? { brand: { '@type': 'Brand', name: item.brand } } : {}),
    offers: {
      '@type': 'Offer',
      url,
      price: Number(item.price).toFixed(2),
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      priceValidUntil: priceValidUntil(),
      seller: { '@id': `${SITE_URL}/#organization` },
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: Number(item.price).toFixed(2),
        priceCurrency: 'INR',
        valueAddedTaxIncluded: false,
        referenceQuantity: {
          '@type': 'QuantitativeValue',
          value: 1,
          unitCode: UNIT_PIECE,
        },
      },
    },
  };
}

/**
 * ItemList for a listing page. When every item carries a price the products
 * are nested in full (Google's product-list form); otherwise it stays a plain
 * name + URL list, since a partially-priced list is worse than none.
 */
export function itemListSchema(items: SchemaListProduct[]) {
  const priced = items.length > 0 && items.every((it) => Number(it.price) > 0);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      ...(priced
        ? { item: listProductNode(it) }
        : { name: it.name, url: absoluteUrl(it.path) }),
    })),
  };
}

/**
 * CollectionPage for a category landing page, with its products as an inline
 * ItemList. Google uses this to understand the page as a category rather than
 * a single product, and to pick up the breadcrumb trail alongside it.
 */
export function collectionPageSchema(params: {
  name: string;
  description: string;
  path: string;
  items: SchemaListProduct[];
}) {
  const priced = params.items.length > 0 && params.items.every((it) => Number(it.price) > 0);

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': absoluteUrl(params.path),
    name: params.name,
    description: params.description,
    url: absoluteUrl(params.path),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: params.items.length,
      itemListElement: params.items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        ...(priced
          ? { item: listProductNode(item) }
          : { name: item.name, url: absoluteUrl(item.path) }),
      })),
    },
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
