import { Suspense, cache } from 'react';
import type { Metadata } from 'next';
import { CatalogClient } from '@/components/catalog/catalog-client';
import { CatalogSeoContent } from '@/components/catalog/catalog-seo-content';
import { RecentlyViewed } from '@/components/product/recently-viewed';
import { getCatalogProducts, getCatalogFilters } from '@/lib/catalog-data';
import { JsonLd } from '@/components/seo/json-ld';
import { itemListSchema, breadcrumbSchema } from '@/lib/schema';
import { withPageSeo } from '@/lib/page-seo';

// Products are fetched server-side so the full grid — and every product link —
// is in the initial HTML for search engines. The client component takes over
// for filtering/sorting without refetching.
export const revalidate = 3600;

// Metadata and the page both need the product list — dedupe to ONE query per
// render (the whole-catalogue load is heavy).
const loadProducts = cache(() => getCatalogProducts());

export async function generateMetadata(): Promise<Metadata> {
  // Live count so the "N+" in the description never drifts from the grid.
  const products = await loadProducts();
  return withPageSeo('/catalog', {
    // Title is used as-is (no brand suffix is appended)
    title: 'Corporate Gifting Catalogue — Bulk Branded Gifts · GIVOO',
    description: `Browse GIVOO's corporate gifting catalogue — ${products.length}+ bulk branded gifts with per-unit pricing shown upfront and logo branding included in every price.`,
    alternates: { canonical: '/catalog' },
  });
}

export default async function CatalogPage() {
  const [products, filters] = await Promise.all([loadProducts(), getCatalogFilters()]);

  return (
    <>
      <JsonLd
        data={itemListSchema(
          products.slice(0, 50).map((p: any) => ({
            name: p.name,
            path: `/products/${p.slug}`,
            image: p.images?.[0]?.url ?? null,
            brand: p.brand ?? null,
            // The card's "from" figure — the cheapest slab.
            price: Math.min(
              ...(p.priceTiers ?? [])
                .map((t: any) => Number(t.sellPrice))
                .filter((n: number) => n > 0)
            ),
          }))
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
      <CatalogSeoContent />
      <RecentlyViewed />
    </>
  );
}
