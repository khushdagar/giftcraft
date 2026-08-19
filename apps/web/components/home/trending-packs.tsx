import Link from 'next/link';
import { Package } from 'lucide-react';
import { getPacks } from '@/lib/pack-data';
import { CarouselRow } from '@/components/home/carousel-row';
import { formatRupees } from '@/lib/utils';

// Corporate MOQ (RULE 4) — packs enter the builder at the corporate minimum,
// same as the curated-packs listing.
const DEFAULT_PACK_QTY = 25;

// Collage built from the pack's own product images, for packs that carry no
// cover photo of their own — never a flat colour block.
function Collage({ tiles }: { tiles: (string | null)[] }) {
  let t = tiles.slice(0, 4);
  if (t.length === 0) t = [null];

  const spanClass = (i: number) => {
    if (t.length === 1) return 'col-span-2 row-span-2';
    if (t.length === 2) return 'col-span-1 row-span-2';
    if (t.length === 3) return i === 0 ? 'col-span-2 row-span-1' : 'col-span-1 row-span-1';
    return 'col-span-1 row-span-1';
  };

  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 bg-white">
      {t.map((src, i) => (
        <div
          key={i}
          className={`relative overflow-hidden bg-[#FAFAFA] flex items-center justify-center ${spanClass(i)}`}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Package className="w-6 h-6 text-[#8F8A82]" />
          )}
        </div>
      ))}
    </div>
  );
}

// The most popular curated packs, mirroring the Trending Products row just
// below it. `getPacks` already ranks by the admin's sortOrder then views, so
// the first few are the trending ones.
export async function TrendingPacks() {
  const packs = (await getPacks()).slice(0, 12);
  if (packs.length === 0) return null;

  return (
    <section className="bg-[#F5F1EB] py-12 md:py-24">
      <div className="container">
        <div className="flex justify-between items-end mb-8 md:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal">
            Trending <span className="italic text-[#800020]">Packs</span>
          </h2>
          {/* On mobile the link lives under the row instead — see below. */}
          <Link
            href="/curated-packs"
            className="hidden sm:block text-sm font-semibold text-[#800020] hover:opacity-70"
          >
            See All →
          </Link>
        </div>

        <CarouselRow ariaLabel="packs">
          {packs.map((pack) => (
              <div
                key={pack.id}
                className="group flex h-auto flex-col flex-shrink-0 w-[calc(50vw-22px)] sm:w-64 lg:w-72 bg-white border border-[#E5DFD4] rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <Link href={`/products/${pack.slug}`} className="flex flex-1 flex-col">
                  <div className="relative aspect-square overflow-hidden">
                    {pack.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pack.image}
                        alt={pack.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Collage tiles={pack.productImages} />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col px-3 pt-3 sm:px-5 sm:pt-5">
                    <h3 className="text-[12px] sm:text-sm font-medium leading-snug line-clamp-2 transition-colors group-hover:text-[#800020]">
                      {pack.name}
                    </h3>
                    <p className="mt-2 text-sm sm:text-lg font-bold tabular-nums">
                      {pack.fromPrice > 0 ? formatRupees(pack.fromPrice) : '—'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-[#8F8A82] mt-0.5">
                      {pack.productCount} product{pack.productCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </Link>

                {/* mt-auto keeps the CTA on the bottom edge across cards with
                    different name lengths. */}
                <div className="mt-auto px-3 pb-3 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
                  <Link
                    href={`/builder?pack=${encodeURIComponent(pack.productIds.join(','))}&qty=${DEFAULT_PACK_QTY}`}
                    className="flex w-full items-center justify-center rounded-full bg-[#800020] py-1.5 sm:py-2 text-[12px] sm:text-sm font-semibold text-white transition hover:bg-[#6B001B]"
                  >
                    Add to Pack
                  </Link>
                </div>
              </div>
          ))}
        </CarouselRow>

        {/* Mobile placement of "See All" — below the row, where the thumb is. */}
        <Link
          href="/curated-packs"
          className="mt-4 flex sm:hidden w-full items-center justify-center rounded-full border border-[#800020] py-2.5 text-sm font-semibold text-[#800020]"
        >
          See All →
        </Link>
      </div>
    </section>
  );
}
