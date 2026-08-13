'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Trash2, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlist';
import { useCompareStore, MAX_COMPARE } from '@/store/compare';
import { CompareBar } from '@/components/compare/compare-bar';
import { toast } from '@/lib/stores/toast-store';

/**
 * The wishlist ("shortlist") page. Everything here is localStorage-backed via
 * the wishlist store — no server data. The bulk CTA hands the shortlisted ids
 * to the builder through the same ?pack= URL curated packs use, so the whole
 * shortlist lands in the pack pre-added and priced at live tiers.
 */
export function WishlistContent() {
  const items = useWishlistStore((s) => s.items);
  const remove = useWishlistStore((s) => s.remove);
  const clear = useWishlistStore((s) => s.clear);
  const compareItems = useCompareStore((s) => s.items);
  const toggleCompare = useCompareStore((s) => s.toggle);

  // localStorage only exists client-side; render the empty frame until mounted
  // so server and client HTML agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const list = mounted ? items : [];

  const builderHref = `/builder?pack=${encodeURIComponent(list.map((i) => i.id).join(','))}`;

  return (
    <div className="bg-canvas min-h-[60vh] pb-16">
      <div className="container-gc-w pt-8">
        <p className="text-xs text-ink-3">
          <Link href="/" className="hover:text-ink">Home</Link>
          {' / '}
          <span className="text-ink">Wishlist</span>
        </p>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl font-light tracking-tight text-ink">Your Wishlist</h1>
            <p className="mt-2 text-sm text-ink-2">
              {list.length > 0
                ? `${list.length} shortlisted product${list.length === 1 ? '' : 's'} — add them all to a gift pack in one click.`
                : 'Products you shortlist while browsing will show up here.'}
            </p>
          </div>

          {list.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clear}
                className="text-xs font-semibold text-ink-2 transition hover:text-red-600"
              >
                Clear all
              </button>
              <Link
                href={builderHref}
                className="inline-flex items-center gap-2 rounded-full bg-em px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-em-700"
              >
                Add all to Gift Builder
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        {list.length === 0 ? (
          <div className="mt-12 rounded-md border border-bdr bg-white px-6 py-20 text-center">
            <Heart className="mx-auto h-10 w-10 text-ink-3" />
            <h2 className="mt-4 text-lg font-semibold text-ink">Nothing shortlisted yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">
              Tap the heart on any product to shortlist it while you compare — then bring the whole
              shortlist into the gift builder at once.
            </p>
            <Link
              href="/catalog"
              className="mt-6 inline-block rounded-full bg-em px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-em-700"
            >
              Browse the Catalog
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-md bg-white shadow-card transition-shadow hover:shadow-hover"
              >
                <Link href={`/products/${item.slug}`} className="block flex-1">
                  <div className="relative m-2.5 aspect-square overflow-hidden rounded-2xl bg-gray-50">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-5xl opacity-60">📦</div>
                    )}
                  </div>
                  <div className="px-3.5 pb-2">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-ink">
                      {item.name}
                    </h3>
                  </div>
                </Link>
                <div className="flex gap-2 px-3.5 pb-3.5">
                  <Link
                    href={`/products/${item.slug}`}
                    className="flex h-9 flex-1 items-center justify-center rounded-full border-2 border-em text-xs font-semibold text-em transition hover:bg-em-50"
                  >
                    View Details
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const ok = toggleCompare({
                        id: item.id,
                        name: item.name,
                        slug: item.slug,
                        image: item.image,
                      });
                      if (!ok) toast.error(`You can compare up to ${MAX_COMPARE} products`);
                    }}
                    aria-pressed={compareItems.some((c) => c.id === item.id)}
                    aria-label={`Compare ${item.name}`}
                    title="Compare"
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                      compareItems.some((c) => c.id === item.id)
                        ? 'border-em bg-em text-white'
                        : 'border-bdr text-ink-2 hover:border-em hover:text-em'
                    }`}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove ${item.name} from wishlist`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-bdr text-ink-2 transition hover:border-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating comparison tray */}
      <CompareBar />
    </div>
  );
}
