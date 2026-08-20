'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Package, SlidersHorizontal } from 'lucide-react';
import { formatRupees } from '@/lib/utils';
import { usePackListing } from '@/hooks/use-pack-listing';
import type { PackFilters, PackPage, PackScope } from '@/lib/pack-query';
import {
  CollectionTileGrid,
  type CollectionTile,
} from '@/components/packs/collection-tile-grid';

interface NamedRef {
  id: string;
  name: string;
}

interface PackCard {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  gradient: string | null;
  productCount: number;
  fromPrice: number;
  productImages: (string | null)[];
  productIds: string[];
  categories: NamedRef[];
  brands: string[];
  occasions: NamedRef[];
  recipients: string[];
}

interface CollectionCard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  gradient: string | null;
  packs: PackCard[];
}

// Stable empty default for the optional `collections` prop. An inline `= []`
// mints a new array every render, which invalidates every memo derived from it.
const NO_COLLECTIONS: CollectionCard[] = [];

// Corporate MOQ (RULE 4) — packs enter checkout at the corporate minimum.
const DEFAULT_PACK_QTY = 25;

// Collage built from the pack's actual product images (a bundle preview).
// Missing images fall back to a product placeholder tile — never a flat colour.
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
          className={`relative overflow-hidden bg-gray-50 flex items-center justify-center ${spanClass(i)}`}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Package className="w-6 h-6 text-ink-3" />
          )}
        </div>
      ))}
    </div>
  );
}

function checkoutHref(pack: PackCard) {
  return `/builder?pack=${encodeURIComponent(pack.productIds.join(','))}&qty=${DEFAULT_PACK_QTY}`;
}

const toggle = (arr: string[], val: string) =>
  arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

/**
 * Reads the ?collection= deep link and hands the slug up.
 *
 * Separate component on purpose — same reason as CatalogUrlParams in
 * catalog-client.tsx: useSearchParams() opts its whole client subtree out of
 * static HTML. Called inside PacksBrowser it stripped the pack grid from the
 * prerendered markup of every curated-pack page and failed `next build` with
 * "useSearchParams() should be wrapped in a suspense boundary". Isolated here
 * behind Suspense, only this empty node is client-only.
 */
function PacksUrlParams({ onCollection }: { onCollection: (slug: string) => void }) {
  const searchParams = useSearchParams();
  const slug = searchParams.get('collection');

  useEffect(() => {
    if (slug) onCollection(slug);
  }, [slug, onCollection]);

  return null;
}

// Two levels: the collection tiles first, then that collection's packs (with
// the full filter sidebar). `?collection=<slug>` jumps straight to level 2.
// A collection page (/curated-packs/<slug>) passes `collection`, which starts
// on level 2 with that collection pre-selected and its own heading.
export function PacksBrowser({
  collections = NO_COLLECTIONS,
  source,
  initialPage,
  scope,
  collection,
  parent,
  tiles,
}: {
  /** Legacy collection grouping. Omitted by the budget/occasion pages. */
  collections?: CollectionCard[];
  /** Which slice of the catalogue this page lists — sent with every request. */
  source: PackScope;
  /**
   * Page 1, rendered on the server. The grid starts from this without a
   * request; later pages and every filter change are fetched from
   * /api/packs/list. The full catalogue is never sent to the browser.
   */
  initialPage: PackPage;
  /** Heading, breadcrumb and back link for a budget band or an occasion. */
  scope?: {
    title: string;
    description: string | null;
    breadcrumb: { name: string; href: string }[];
    backHref: string;
    backLabel: string;
  };
  collection?: { id: string; name: string; description: string | null };
  /** Set when `collection` is a sub-collection — drives the breadcrumb and the
      back link, so "up one level" returns to the parent, not the hub. */
  parent?: { name: string; slug: string };
  /** Level-1 tiles. The hub passes only top-level collections, so a
      sub-collection never surfaces as a sibling of its own parent. Omitted
      elsewhere, where every loaded collection is a valid tile. */
  tiles?: CollectionTile[];
}) {
  const [browsing, setBrowsing] = useState(!!collection || !!scope);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  const [fCollections, setFCollections] = useState<string[]>(collection ? [collection.id] : []);
  const [fCategories, setFCategories] = useState<string[]>([]);
  const [fBrands, setFBrands] = useState<string[]>([]);
  const [fOccasions, setFOccasions] = useState<string[]>([]);
  const [fRecipients, setFRecipients] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);

  // Everything that decides which packs match, in the shape the server takes.
  const filters: PackFilters = useMemo(
    () => ({
      categories: fCategories,
      brands: fBrands,
      occasions: fOccasions,
      recipients: fRecipients,
      priceMin,
      priceMax,
      search,
      sort,
    }),
    [fCategories, fBrands, fOccasions, fRecipients, priceMin, priceMax, search, sort]
  );

  // Filtering, faceting, sorting and paging all happen on the server now — see
  // lib/pack-query.ts. Only the cards actually on screen cross the wire.
  const listing = usePackListing({ scope: source, filters, initialPage });

  const visible = listing.packs;
  const shown = visible.length;
  const total = listing.total;
  const { hasMore, loadMore } = listing;

  // Facet lists arrive with page 1, already counted against the OTHER active
  // filters and already stripped of options that can no longer narrow anything.
  const catFacets = listing.facets.categories;
  const brandFacets = listing.facets.brands;
  const occasionFacets = listing.facets.occasions;
  const recipientFacets = listing.facets.recipients;
  const priceBounds = listing.facets.priceBounds;

  const openCollection = (id: string) => {
    setFCollections([id]);
    setFCategories([]);
    setFBrands([]);
    setFOccasions([]);
    setFRecipients([]);
    setSearch('');
    setPriceMin(null);
    setPriceMax(null);
    setBrowsing(true);
  };

  const backToCollections = () => {
    setBrowsing(false);
    setSidebarOpen(false);
    setFCollections([]);
  };

  // Deep-link support: /curated-packs?collection=<slug> opens that collection
  // (used by the homepage "Curated collections" cards). Fed by PacksUrlParams.
  const openCollectionBySlug = useCallback(
    (slug: string) => {
      const match = collections.find((c) => c.slug === slug);
      if (match) openCollection(match.id);
      // openCollection only sets state — stable enough to leave out.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [collections]
  );

  const hasActiveFilters =
    fCategories.length > 0 ||
    fBrands.length > 0 ||
    fOccasions.length > 0 ||
    fRecipients.length > 0 ||
    priceMin != null ||
    priceMax != null ||
    search.trim().length > 0;

  const clearAll = () => {
    setFCategories([]);
    setFBrands([]);
    setFOccasions([]);
    setFRecipients([]);
    setPriceMin(null);
    setPriceMax(null);
    setSearch('');
  };

  return (
    <div className="min-h-screen" style={{ background: '#F5F1EB' }}>
      <Suspense fallback={null}>
        <PacksUrlParams onCollection={openCollectionBySlug} />
      </Suspense>
      {/* Header */}
      <div className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <p className="text-xs" style={{ color: '#8F8A82' }}>
            <Link href="/" style={{ color: '#800020' }}>
              Home
            </Link>{' '}
            /{' '}
            {scope ? (
              <>
                {scope.breadcrumb.map((b) => (
                  <span key={b.href}>
                    <Link href={b.href} style={{ color: '#800020' }}>
                      {b.name}
                    </Link>{' '}
                    /{' '}
                  </span>
                ))}
                <span>{scope.title}</span>
              </>
            ) : collection ? (
              <>
                <Link href="/curated-packs" style={{ color: '#800020' }}>
                  Curated Packs
                </Link>{' '}
                /{' '}
                {parent && (
                  <>
                    <Link href={`/curated-packs/${parent.slug}`} style={{ color: '#800020' }}>
                      {parent.name}
                    </Link>{' '}
                    /{' '}
                  </>
                )}
                <span>{collection.name}</span>
              </>
            ) : (
              <span>Curated Packs</span>
            )}
          </p>
          {scope ? (
            <>
              <h1 className="text-4xl md:text-5xl font-serif font-light mt-2">{scope.title}</h1>
              {scope.description && (
                <p className="mt-2 text-base max-w-2xl" style={{ color: '#5C5852' }}>
                  {scope.description}
                </p>
              )}
            </>
          ) : collection ? (
            <>
              <h1 className="text-4xl md:text-5xl font-serif font-light mt-2">{collection.name}</h1>
              {collection.description && (
                <p className="mt-2 text-base max-w-2xl" style={{ color: '#5C5852' }}>
                  {collection.description}
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-5xl font-serif font-light mt-2">
                Curated <span className="italic" style={{ color: '#800020' }}>Packs.</span>
              </h1>
              <p className="mt-2 text-base" style={{ color: '#5C5852' }}>
                Hand-picked gift assortments for every budget and style — ready to customise with
                your branding.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-10 pb-20">
        {/* Nothing in this scope at all, as opposed to nothing matching the
            current filters — initialPage is the unfiltered first page. */}
        {initialPage.total === 0 ? (
          <div className="text-center py-20 rounded-md border-2 border-dashed border-bdr bg-white">
            <p className="text-lg text-ink">No curated packs yet</p>
            <p className="mt-1 text-sm text-ink-2">
              Check back soon — or{' '}
              <Link href="/builder" className="text-em font-medium">
                build your own from scratch →
              </Link>
            </p>
          </div>
        ) : !browsing ? (
          /* ── Level 1: pick a collection ─────────────────────────────────── */
          <CollectionTileGrid
            tiles={
              tiles ??
              collections.map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                image: c.image,
                gradient: c.gradient,
                href: `/curated-packs/${c.slug}`,
              }))
            }
          />
        ) : (
          /* ── Level 2: that collection's packs (filter bar + cards) ──────── */
          <>
            {/* Back + search + sort */}
            <div className="mb-4">
              {/* On a collection page there is no in-page level 1 to return to,
                  so the link leaves for the collections hub. */}
              {scope ? (
                <Link
                  href={scope.backHref}
                  className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 transition hover:opacity-80"
                  style={{ color: '#800020' }}
                >
                  ← {scope.backLabel}
                </Link>
              ) : collection ? (
                <Link
                  href={parent ? `/curated-packs/${parent.slug}` : '/curated-packs'}
                  className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 transition hover:opacity-80"
                  style={{ color: '#800020' }}
                >
                  ← {parent ? parent.name : 'All Collections'}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={backToCollections}
                  className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 transition hover:opacity-80"
                  style={{ color: '#800020' }}
                >
                  ← All Collections
                </button>
              )}

              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-ink-3" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search packs by name…"
                    className="w-full rounded-full border-2 border-bdr bg-white pl-10 pr-4 py-2.5 text-sm text-ink focus:border-em focus:outline-none"
                  />
                </div>
                {/* Filters + Sort share one row on mobile; `md:contents` dissolves
                    the wrapper from md up so the original layout is unchanged. */}
                <div className="flex gap-2 md:contents">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden inline-flex flex-1 md:flex-none items-center justify-center gap-2 rounded-full border-2 border-bdr bg-white px-4 py-2.5 text-sm font-medium text-ink"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                  </button>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                    className="flex-1 md:flex-none min-w-0 rounded-full border-2 border-bdr bg-white px-4 py-2.5 text-sm text-ink focus:border-em focus:outline-none"
                  >
                    <option value="featured">Sort: Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <p className="text-sm text-ink-2">
                  Showing {shown} of {total} pack{total === 1 ? '' : 's'}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-medium text-ink-3 hover:text-ink underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Filter sidebar — static column on desktop, bottom-sheet drawer on mobile */}
              <aside
                className={`w-full lg:w-64 flex-shrink-0 lg:self-stretch ${
                  sidebarOpen
                    ? 'fixed inset-0 z-40 bg-black/30 lg:static lg:z-auto lg:bg-transparent lg:inset-auto'
                    : 'hidden lg:block'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`bg-white border-2 border-bdr p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:rounded-md lg:bottom-auto ${
                    sidebarOpen
                      ? 'fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl'
                      : 'rounded-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-ink">Filters</h3>
                    <button
                      type="button"
                      className="lg:hidden text-2xl leading-none text-ink-2"
                      onClick={() => setSidebarOpen(false)}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Categories */}
                  {catFacets.length > 0 && (
                    <div className="mb-5 pb-4 border-b border-bdr">
                      <p className="text-sm font-semibold text-ink mb-3">Categories</p>
                      <div className="space-y-2">
                        {catFacets.map((cat) => (
                          <label
                            key={cat.id}
                            className="flex items-center justify-between gap-2 cursor-pointer text-sm text-ink-2 hover:text-ink"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={fCategories.includes(cat.id)}
                                onChange={() => setFCategories((p) => toggle(p, cat.id))}
                                className="w-4 h-4 rounded accent-em"
                              />
                              {cat.name}
                            </span>
                            <span className="text-ink-3">({cat.count})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Range */}
                  <div className="mb-5 pb-4 border-b border-bdr">
                    <p className="text-sm font-semibold text-ink mb-3">Price Range</p>
                    <div className="flex justify-between text-xs font-semibold text-ink mb-2 tabular-nums">
                      <span>{formatRupees(priceMin ?? priceBounds.min)}</span>
                      <span>{formatRupees(priceMax ?? priceBounds.max)}</span>
                    </div>
                    {(() => {
                      const rMin = priceBounds.min
                      const rMax = priceBounds.max
                      const vMin = priceMin ?? rMin
                      const vMax = priceMax ?? rMax
                      const span = Math.max(rMax - rMin, 1)
                      const leftPct = ((vMin - rMin) / span) * 100
                      const rightPct = ((vMax - rMin) / span) * 100
                      const thumb = "appearance-none pointer-events-none absolute inset-0 h-4 w-full bg-transparent focus:outline-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#800020] [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.25)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#800020] [&::-moz-range-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.25)] [&::-moz-range-thumb]:cursor-pointer"
                      return (
                        <div className="relative h-4">
                          <div className="absolute left-[7px] right-[7px] top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-gray-200">
                            <div className="absolute inset-y-0 rounded-full bg-[#800020]" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }} />
                          </div>
                          <input
                            type="range"
                            min={rMin}
                            max={rMax}
                            value={vMin}
                            onChange={(e) => setPriceMin(Math.min(Number(e.target.value), vMax))}
                            className={thumb}
                            style={{ zIndex: vMin >= rMax ? 4 : 3 }}
                          />
                          <input
                            type="range"
                            min={rMin}
                            max={rMax}
                            value={vMax}
                            onChange={(e) => setPriceMax(Math.max(Number(e.target.value), vMin))}
                            className={thumb}
                            style={{ zIndex: 4 }}
                          />
                        </div>
                      )
                    })()}
                  </div>

                  {/* Collections — legacy grouping; absent on the budget and
                      occasion pages, which pass no collections at all. */}
                  {collections.length > 0 && (
                  <div className="mb-5 pb-4 border-b border-bdr">
                    <p className="text-sm font-semibold text-ink mb-3">Collections</p>
                    <div className="space-y-2">
                      {collections.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center justify-between gap-2 cursor-pointer text-sm text-ink-2 hover:text-ink"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={fCollections.includes(c.id)}
                              onChange={() => setFCollections((p) => toggle(p, c.id))}
                              className="w-4 h-4 rounded accent-em"
                            />
                            {c.name}
                          </span>
                          <span className="text-ink-3">({c.packs.length})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Brand */}
                  {brandFacets.length > 0 && (
                    <div className="mb-5 pb-4 border-b border-bdr">
                      <p className="text-sm font-semibold text-ink mb-3">Brand</p>
                      <div className="space-y-2">
                        {brandFacets.map(({ brand, count }) => (
                          <label
                            key={brand}
                            className="flex items-center justify-between gap-2 cursor-pointer text-sm text-ink-2 hover:text-ink"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={fBrands.includes(brand)}
                                onChange={() => setFBrands((p) => toggle(p, brand))}
                                className="w-4 h-4 rounded accent-em"
                              />
                              {brand}
                            </span>
                            <span className="text-ink-3">({count})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Occasion */}
                  {occasionFacets.length > 0 && (
                    <div className="mb-5 pb-4 border-b border-bdr">
                      <p className="text-sm font-semibold text-ink mb-3">Occasion</p>
                      <div className="space-y-2">
                        {occasionFacets.map((occ) => (
                          <label
                            key={occ.id}
                            className="flex items-center justify-between gap-2 cursor-pointer text-sm text-ink-2 hover:text-ink"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={fOccasions.includes(occ.id)}
                                onChange={() => setFOccasions((p) => toggle(p, occ.id))}
                                className="w-4 h-4 rounded accent-em"
                              />
                              {occ.name}
                            </span>
                            <span className="text-ink-3">({occ.count})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recipient Type */}
                  {recipientFacets.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-ink mb-3">Recipient Type</p>
                      <div className="space-y-2">
                        {recipientFacets.map(({ tag, count }) => (
                          <label
                            key={tag}
                            className="flex items-center justify-between gap-2 cursor-pointer text-sm text-ink-2 hover:text-ink"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={fRecipients.includes(tag)}
                                onChange={() => setFRecipients((p) => toggle(p, tag))}
                                className="w-4 h-4 rounded accent-em"
                              />
                              {tag}
                            </span>
                            <span className="text-ink-3">({count})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mobile drawer actions */}
                  {sidebarOpen && (
                    <div className="lg:hidden flex gap-2 mt-6">
                      <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="flex-1 rounded-full bg-em px-4 py-2.5 text-sm font-semibold text-white"
                      >
                        Show {total} pack{total === 1 ? '' : 's'}
                      </button>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearAll}
                          className="rounded-full border-2 border-bdr px-4 py-2.5 text-sm font-medium text-ink-2"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </aside>

              {/* Packs as product cards — two across on mobile, matching the
                  catalog product grid. One full-width card per screen made
                  browsing a long list of packs feel much longer than it is. */}
              <div className="flex-1 w-full">
                {total === 0 && !listing.isLoading ? (
                  <div className="text-center py-16 rounded-md border-2 border-dashed border-bdr bg-white">
                    <p className="text-ink">No packs match your filters</p>
                  </div>
                ) : (
                  <>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {visible.map((pack) => (
                      <div
                        key={pack.id}
                        className="flex flex-col overflow-hidden rounded-md border-2 border-bdr bg-white group transition hover:shadow-md hover:border-em/40"
                      >
                        {/* Clicking the card (image + details) expands the
                            pack's contents in place — "View Details" below is
                            the way out to the full pack page. */}
                        <Link
                          href={`/products/${pack.slug}`}
                          className="flex flex-1 flex-col"
                          aria-label={`View details for ${pack.name}`}
                        >
                          <div className="relative aspect-square">
                            {pack.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={pack.image}
                                alt={pack.name}
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            ) : (
                              <Collage tiles={pack.productImages} />
                            )}
                          </div>

                          <div className="flex flex-1 flex-col px-4 pt-4">
                            {/* The collection caption that used to sit here has
                                been empty on every card since packs stopped
                                being browsed through collections. */}
                            <h3 className="text-sm font-semibold text-ink leading-snug transition group-hover:text-em">
                              {pack.name}
                            </h3>
                            <p className="mt-1 text-sm text-ink-2">
                              From{' '}
                              <span className="font-bold text-ink tabular-nums">
                                {pack.fromPrice > 0 ? formatRupees(pack.fromPrice) : '—'}
                              </span>
                              <span className="text-ink-3"> /pack</span>
                            </p>
                            <p className="text-xs text-ink-3 mt-0.5">
                              {pack.productCount} product{pack.productCount === 1 ? '' : 's'}
                            </p>
                          </div>
                        </Link>

                        <div className="flex flex-col gap-2 px-4 pb-4 pt-3">
                          <Link
                            href={checkoutHref(pack)}
                            className="flex w-full items-center justify-center rounded-full bg-em px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-em-600"
                          >
                            Add to Pack
                          </Link>
                          <Link
                            href={`/products/${pack.slug}`}
                            className="flex w-full items-center justify-center rounded-full border-2 border-em px-4 py-2.5 text-sm font-semibold text-em transition hover:bg-em-50"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paging is button-only by design — an auto-loading grid
                      makes the footer unreachable. */}
                  {hasMore && (
                    <div className="flex justify-center pt-8">
                      <button
                        type="button"
                        onClick={loadMore}
                        // The next page is a network round-trip now, not a slice
                        // of an array already in memory, so the button has to say
                        // it is working and refuse a second click meanwhile.
                        disabled={listing.isLoadingMore}
                        className="rounded-full border-2 border-em px-6 py-2.5 text-sm font-semibold text-em transition hover:bg-em-50 disabled:opacity-60"
                      >
                        {listing.isLoadingMore ? 'Loading…' : 'Load more packs'}
                      </button>
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
