import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { BuilderLayout } from '@/components/builder/builder-layout';
import { BuilderContent } from '@/components/builder/builder-content';
import { BuilderReset } from '@/components/builder/builder-reset';

export const metadata: Metadata = {
  // Root template appends "· GIVOO"
  title: 'Gift Pack Builder — Instant Transparent Pricing',
  description:
    'Build a branded corporate gift pack in minutes: pick products, add your logo, and see live per-unit pricing with GST — no sales calls.',
  alternates: { canonical: '/builder' },
};

// Server-side self-fetch must target THIS running server, whatever port it's on
// (dev may land on :3001 if :3000 is taken). Derive the origin from the incoming
// request host; fall back to the configured public URL when headers are absent.
function getBaseUrl() {
  const h = headers();
  const host = h.get('host');
  if (host) {
    const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

async function getBuilderData() {
  const baseUrl = getBaseUrl();

  try {
    const [productsRes, filtersRes, packagingRes, addonsRes] = await Promise.all([
      // The builder filters by category client-side, so it needs the WHOLE
      // catalogue — a short page would silently hide products from the pills.
      fetch(`${baseUrl}/api/products?limit=1000`, { next: { revalidate: 3600 } }),
      fetch(`${baseUrl}/api/catalog/filters`, { next: { revalidate: 3600 } }),
      // Packaging/addons drive live pricing + box suggestion and change with admin
      // edits — keep them fresh (short revalidate) so dimension/price updates apply.
      fetch(`${baseUrl}/api/packaging`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/addons`, { next: { revalidate: 60 } }),
    ]);

    if (!productsRes.ok || !filtersRes.ok || !packagingRes.ok || !addonsRes.ok) {
      throw new Error('Failed to fetch builder data');
    }

    const productsData = await productsRes.json();
    const filtersData = await filtersRes.json();
    const packagingData = await packagingRes.json();
    const addonsData = await addonsRes.json();

    return {
      products: productsData.products || [],
      categories: filtersData.categories || [],
      packaging: packagingData,
      addons: addonsData,
    };
  } catch (error) {
    console.error('Error fetching builder data:', error);
    return {
      products: [],
      categories: [],
      packaging: [],
      addons: [],
    };
  }
}

export default async function BuilderPage() {
  const { products, categories, packaging, addons } = await getBuilderData();

  // Ensure we have data before rendering
  if (!products.length) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-canvas">
      <BuilderReset />
      <BuilderLayout>
        <BuilderContent
          allProducts={products}
          categories={categories}
          packagingOptions={packaging}
          addonOptions={addons}
        />
      </BuilderLayout>
    </div>
  );
}
