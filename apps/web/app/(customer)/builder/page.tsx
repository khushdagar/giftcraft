import { notFound } from 'next/navigation';
import { BuilderLayout } from '@/components/builder/builder-layout';
import { BuilderContent } from '@/components/builder/builder-content';
import { QuantityModal } from '@/components/builder/quantity-modal';

async function getBuilderData() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const [productsRes, filtersRes, packagingRes, addonsRes] = await Promise.all([
      fetch(`${baseUrl}/api/products?limit=100`, { next: { revalidate: 3600 } }),
      fetch(`${baseUrl}/api/catalog/filters`, { next: { revalidate: 3600 } }),
      fetch(`${baseUrl}/api/packaging`, { next: { revalidate: 3600 } }),
      fetch(`${baseUrl}/api/addons`, { next: { revalidate: 3600 } }),
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
      <BuilderLayout>
        <BuilderContent
          allProducts={products}
          categories={categories}
          packagingOptions={packaging}
          addonOptions={addons}
        />
      </BuilderLayout>
      <QuantityModal />
    </div>
  );
}
