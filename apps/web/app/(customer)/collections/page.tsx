import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collections — GiftCraft',
  description: 'Curated gift collections for every occasion',
};

// Gradient fallbacks for collection cards (same as Occasions palette)
const GRADIENT_FALLBACKS = [
  'from-[#E8A040] via-[#B8651A] to-[#8B4513]', // Diwali - warm gold
  'from-[#E040A0] via-[#F0C040] to-[#40B0E0]', // Holi - colorful
  'from-[#8B1A1A] via-[#2D5016] to-[#1a3a10]', // Christmas - red/green
  'from-[#1A1A50] via-[#C4963C] to-[#6B2E6B]', // New Year - navy/gold
  'from-[#C86494] via-[#E8A0C0] to-[#9B4D78]', // Women's Day - pink
  'from-[#1A6B4F] via-[#2A7EC4] to-[#145A42]', // Onboarding - emerald/blue
  'from-[#2A2A28] via-[#4A4540] to-[#3A3530]', // Client - charcoal
  'from-[#7B2D8B] via-[#C4402A] to-[#D4872A]', // Birthday - purple/red
];

interface Collection {
  id: string;
  name: string;
  description?: string;
  heroImage?: string;
  sortOrder: number;
  products: Array<{
    id: string;
    name: string;
  }>;
}

async function getCollections(): Promise<Collection[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const res = await fetch(`${baseUrl}/api/collections?browse=true`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      throw new Error('Failed to fetch collections');
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching collections:', error);
    return [];
  }
}

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <div className="min-h-screen bg-canvas py-12 px-4 sm:px-6">
      <div className="container-gc-w mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-xs text-ink-3 mb-6">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <span>/</span>
            <span className="text-ink font-medium">Collections</span>
          </nav>

          {/* Header */}
          <div>
            <p className="overline text-ink-3">Curated for You</p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-black italic text-ink">
              Gift <span className="text-em">Collections.</span>
            </h1>
            <p className="mt-2 text-sm text-ink-2 max-w-md">
              Browse our hand-picked collections of premium gifts for every occasion.
            </p>
          </div>
        </div>

        {/* Collections Grid */}
        {collections.length === 0 ? (
          <div className="rounded-md border-2 border-bdr bg-white p-12 text-center">
            <p className="text-ink-2 mb-4">No collections available at the moment.</p>
            <p className="text-xs text-ink-3">Check back soon for curated gift collections!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {collections.map((collection, idx) => {
              const gradientBg = GRADIENT_FALLBACKS[idx % GRADIENT_FALLBACKS.length];

              return (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  className="group relative block aspect-[16/10] overflow-hidden rounded-md border-2 border-bdr transition hover:shadow-hover"
                >
                  {/* Background Image or Gradient */}
                  {collection.heroImage ? (
                    <img
                      src={collection.heroImage}
                      alt={collection.name}
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradientBg}`} />
                  )}

                  {/* Dark Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* Content Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-between p-4">
                    {/* Top: Product count badge (optional) */}
                    <div className="flex justify-end">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-ink">
                        {collection.products.length} items
                      </div>
                    </div>

                    {/* Bottom: Name and description */}
                    <div>
                      <h3 className="font-display text-xl sm:text-2xl font-black text-white leading-tight">
                        {collection.name}
                      </h3>
                      {collection.description && (
                        <p className="mt-2 text-xs sm:text-sm text-white/90 line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                      <p className="mt-3 text-xs font-semibold text-white/70">
                        View collection →
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
