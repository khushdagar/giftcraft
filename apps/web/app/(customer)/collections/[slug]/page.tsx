import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRupees } from '@/lib/utils';

export const revalidate = 3600; // Cache for 1 hour

interface CollectionDetailPageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: CollectionDetailPageProps): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

  try {
    const res = await fetch(`${baseUrl}/api/collections/${params.slug}`);
    if (!res.ok) return { title: 'Collection — GiftCraft' };

    const collection = await res.json();
    return {
      title: `${collection.name} — GiftCraft`,
      description: collection.description || 'Curated gift collection',
    };
  } catch {
    return { title: 'Collection — GiftCraft' };
  }
}

async function getCollection(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

  try {
    const res = await fetch(`${baseUrl}/api/collections/${slug}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching collection:', error);
    return null;
  }
}

export default async function CollectionDetailPage({
  params,
}: CollectionDetailPageProps) {
  const collection = await getCollection(params.slug);

  if (!collection) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Hero Banner */}
      <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden rounded-b-2xl">
        {collection.heroImage ? (
          <img
            src={collection.heroImage}
            alt={collection.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-em-400 to-em-700" />
        )}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Content Overlay */}
        <div className="absolute inset-0 flex items-end p-6 sm:p-8">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-black text-white leading-tight">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="mt-2 text-sm sm:text-base text-white/90">
                {collection.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12 px-4 sm:px-6">
        <div className="container-gc-w mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-xs text-ink-3">
              <li>
                <Link href="/" className="hover:text-ink">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/collections" className="hover:text-ink">
                  Collections
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink font-medium truncate">
                {collection.name}
              </li>
            </ol>
          </nav>

          {/* Product Count */}
          <div className="mb-8">
            <p className="text-sm text-ink-2">
              {collection.products.length} {collection.products.length === 1 ? 'product' : 'products'}
            </p>
          </div>

          {/* Products Grid */}
          {collection.products.length === 0 ? (
            <div className="rounded-md border-2 border-bdr bg-white p-12 text-center">
              <p className="text-ink-2 mb-4">No products in this collection yet.</p>
              <Button asChild variant="em" className="rounded-md">
                <Link href="/catalog">Browse all products</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {collection.products.map((product: any) => {
                const primaryImage = product.images?.[0];

                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="group"
                  >
                    <div className="rounded-md border-2 border-bdr overflow-hidden transition hover:shadow-hover">
                      {/* Product Image */}
                      <div className="aspect-square bg-gray-50 overflow-hidden">
                        {primaryImage?.url ? (
                          <img
                            src={primaryImage.url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <span className="text-3xl">📦</span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-3 bg-white">
                        {/* Brand */}
                        {product.brand && (
                          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-1">
                            {product.brand}
                          </p>
                        )}

                        {/* Name */}
                        <p className="font-medium text-sm text-ink line-clamp-2">
                          {product.name}
                        </p>

                        {/* Price */}
                        <p className="mt-2 font-black text-lg text-ink tabnum">
                          {formatRupees(product.price)}
                        </p>

                        {/* CTA Button */}
                        <button
                          className="mt-3 w-full py-2 px-3 rounded-md bg-em text-white text-xs font-semibold hover:bg-em-600 transition"
                          onClick={(e) => {
                            e.preventDefault();
                            // Navigate to builder with this product
                            window.location.href = `/builder`;
                          }}
                        >
                          Add to Pack
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
