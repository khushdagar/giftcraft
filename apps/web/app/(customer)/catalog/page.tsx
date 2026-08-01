import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CatalogClient } from '@/components/catalog/catalog-client';
import { getCatalogProducts, getCatalogFilters } from '@/lib/catalog-data';
import { JsonLd } from '@/components/seo/json-ld';
import { itemListSchema, breadcrumbSchema } from '@/lib/schema';

// Products are fetched server-side so the full grid — and every product link —
// is in the initial HTML for search engines. The client component takes over
// for filtering/sorting without refetching.
export const revalidate = 3600;

export const metadata: Metadata = {
  // Root template appends "· GIVOO"
  title: 'Corporate Gifts Catalog — Bulk Branded Gifting Products',
  description:
    'Browse bulk corporate gifting products with transparent per-unit pricing. Filter by occasion, category, brand and budget — branding included in every price.',
  alternates: { canonical: '/catalog' },
};

export default async function CatalogPage() {
  const [products, filters] = await Promise.all([getCatalogProducts(), getCatalogFilters()]);

  return (
    <>
      <JsonLd
        data={itemListSchema(
          products.slice(0, 50).map((p: any) => ({ name: p.name, path: `/products/${p.slug}` }))
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Catalog', path: '/catalog' },
        ])}
      />
      <Suspense>
        <CatalogClient initialProducts={products as any[]} initialFilters={filters} />
      </Suspense>
    </>
  );
}
