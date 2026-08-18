'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Package, SlidersHorizontal } from 'lucide-react';
import { formatRupees } from '@/lib/utils';
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
  description: string | null;
  descriptionShort: string | null;
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

type FlatPack = PackCard & {
  collectionId: string;
  collectionName: string;
  collectionSlug: string;
};

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

// Two levels: the collection tiles first, then that collection's packs (with
// the full filter sidebar). `?collection=<slug>` jumps straight to level 2.
// A collection page (/curated-packs/<slug>) passes `collection`, which starts
// on level 2 with that collection pre-selected and its own heading.
export function PacksBrowser({
  collections,
  collection,
  parent,
  tiles,
}: {
  collections: CollectionCard[];
  collection?: { id: string; name: string; description: string | null };
  /** Set when `collection` is a sub-collection — drives the breadcrumb and the
      back link, so "up one level" returns to the parent, not the hub. */
  parent?: { name: string; slug: string };
  /** Level-1 tiles. The hub passes only top-level collections, so a
      sub-collection never surfaces as a sibling of its own parent. Omitted
      elsewhere, where every loaded collection is a valid tile. */
  tiles?: CollectionTile[];
}) {
  const searchParams = useSearchParams();
  const [browsing, setBrowsing] = useState(!!collection);
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

  const allPacks: FlatPack[] = useMemo(
    () =>
      collections.flatMap((c) =>
        c.packs.map((p) => ({
          ...p,
          collectionId: c.id,
          collectionName: c.name,
          collectionSlug: c.slug,
        }))
      ),
    [collections]
  );

  // ── Filter option lists (derived from the products inside every pack) ──────
  const catOptions = useMemo(() => {
    const map = new Map<string, NamedRef>();
    allPacks.forEach((p) => p.categories.forEach((c) => map.set(c.id, c)));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allPacks]);

  const brandOptions = useMemo(
    () => Array.from(new Set(allPacks.flatMap((p) => p.brands))).sort(),
    [allPacks]
  );

  const occasionOptions = useMemo(() => {
    const map = new Map<string, NamedRef>();
    allPacks.forEach((p) => p.occasions.forEach((o) => map.set(o.id, o)));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allPacks]);

  const recipientOptions = useMemo(
    () => Array.from(new Set(allPacks.flatMap((p) => p.recipients))).sort(),
    [allPacks]
  );

  const priceBounds = useMemo(() => {
    const prices = allPacks.map((p) => p.fromPrice).filter((n) => n > 0);
    return { min: 0, max: prices.length ? Math.max(...prices) : 10000 };
  }, [allPacks]);

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
  // (used by the homepage "Curated collections" cards).
  useEffect(() => {
    const slug = searchParams.get('collection');
    if (!slug) return;
    const match = collections.find((c) => c.slug === slug);
    if (match) openCollection(match.id);
    // Only run on mount / when the query param changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, collections]);

  const filtered = useMemo(() => {
    let list = allPacks;
    if (fCollections.length) list = list.filter((p) => fCollections.includes(p.collectionId));
    if (fCategories.length)
      list = list.filter((p) => p.categories.some((c) => fCategories.includes(c.id)));
    if (fBrands.length) list = list.filter((p) => p.brands.some((b) => fBrands.includes(b)));
    if (fOccasions.length)
      list = list.filter((p) => p.occasions.some((o) => fOccasions.includes(o.id)));
    if (fRecipients.length)
      list = list.filter((p) => p.recipients.some((r) => fRecipients.includes(r)));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (priceMin != null) list = list.filter((p) => p.fromPrice >= priceMin);
    if (priceMax != null) list = list.filter((p) => p.fromPrice <= priceMax);

    if (sort === 'price-asc') list = [...list].sort((a, b) => a.fromPrice - b.fromPrice);
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.fromPrice - a.fromPrice);
    return list;
  }, [allPacks, fCollections, fCategories, fBrands, fOccasions, fRecipients, search, priceMin, priceMax, sort]);

  // Packs matching every active filter EXCEPT the given facet. Measuring an
  // option against the OTHER filters (not the fully-filtered list) is what lets
  // you tick more than one option in the same facet — otherwise selecting one
  // would drop every sibling to a count of 0 and hide it.
  const packsExcept = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (skip: 'categories' | 'brands' | 'occasions' | 'recipients') => {
      let list = allPacks;
      if (fCollections.length) list = list.filter((p) => fCollections.includes(p.collectionId));
      if (skip !== 'categories' && fCategories.length)
        list = list.filter((p) => p.categories.some((c) => fCategories.includes(c.id)));
      if (skip !== 'brands' && fBrands.length)
        list = list.filter((p) => p.brands.some((b) => fBrands.includes(b)));
      if (skip !== 'occasions' && fOccasions.length)
        list = list.filter((p) => p.occasions.some((o) => fOccasions.includes(o.id)));
      if (skip !== 'recipients' && fRecipients.length)
        list = list.filter((p) => p.recipients.some((r) => fRecipients.includes(r)));
      if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
      if (priceMin != null) list = list.filter((p) => p.fromPrice >= priceMin);
      if (priceMax != null) list = list.filter((p) => p.fromPrice <= priceMax);
      return list;
    };
  }, [allPacks, fCollections, fCategories, fBrands, fOccasions, fRecipients, search, priceMin, priceMax]);

  // Only options that can still narrow the results survive (count > 0). A ticked
  // option always stays visible so it can be unticked.
  const catFacets = useMemo(() => {
    const base = packsExcept('categories');
    return catOptions
      .map((c) => ({ ...c, count: base.filter((p) => p.categories.some((x) => x.id === c.id)).length }))
      .filter((c) => c.count > 0 || fCategories.includes(c.id));
  }, [catOptions, packsExcept, fCategories]);

  const brandFacets = useMemo(() => {
    const base = packsExcept('brands');
    return brandOptions
      .map((brand) => ({ brand, count: base.filter((p) => p.brands.includes(brand)).length }))
      .filter((b) => b.count > 0 || fBrands.includes(b.brand));
  }, [brandOptions, packsExcept, fBrands]);

  const occasionFacets = useMemo(() => {
    const base = packsExcept('occasions');
    return occasionOptions
      .map((o) => ({ ...o, count: base.filter((p) => p.occasions.some((x) => x.id === o.id)).length }))
      .filter((o) => o.count > 0 || fOccasions.includes(o.id));
  }, [occasionOptions, packsExcept, fOccasions]);

  const recipientFacets = useMemo(() => {
    const base = packsExcept('recipients');
    return recipientOptions
      .map((tag) => ({ tag, count: base.filter((p) => p.recipients.includes(tag)).length }))
      .filter((r) => r.count > 0 || fRecipients.includes(r.tag));
  }, [recipientOptions, packsExcept, fRecipients]);

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
      {/* Header */}
      <div className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <p className="text-xs" style={{ color: '#8F8A82' }}>
            <Link href="/" style={{ color: '#800020' }}>
              Home
            </Link>{' '}
            /{' '}
            {collection ? (
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
          {collection ? (
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
        {collections.length === 0 ? (
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
              {collection ? (
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
                  Showing {filtered.length} pack{filtered.length === 1 ? '' : 's'}
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
                className={`w-full lg:w-64 flex-shrink-0 ${
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

                  {/* Collections */}
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
                        Show {filtered.length} pack{filtered.length === 1 ? '' : 's'}
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
                {filtered.length === 0 ? (
                  <div className="text-center py-16 rounded-md border-2 border-dashed border-bdr bg-white">
                    <p className="text-ink">No packs match your filters</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((pack) => (
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
                            <p className="text-xs text-ink-3 mb-0.5">{pack.collectionName}</p>
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
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
