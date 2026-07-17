'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Package } from 'lucide-react';
import { formatRupees } from '@/lib/utils';

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

const FALLBACK_GRADIENTS = [
  'linear-gradient(145deg, #D7AC55 0%, #9A6E2E 55%, #6F4D1E 100%)',
  'linear-gradient(145deg, #34332F 0%, #1A1A18 55%, #0C0C0B 100%)',
  'linear-gradient(145deg, #3FA978 0%, #1F8A5C 45%, #134E36 100%)',
  'linear-gradient(145deg, #4A90D9 0%, #2D5A9E 55%, #1A3C6E 100%)',
];

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
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 bg-white p-1">
      {t.map((src, i) => (
        <div
          key={i}
          className={`relative overflow-hidden rounded-sm bg-gray-50 flex items-center justify-center ${spanClass(i)}`}
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

export function PacksBrowser({ collections }: { collections: CollectionCard[] }) {
  const [browsing, setBrowsing] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  const [fCollections, setFCollections] = useState<string[]>([]);
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
    setFCollections([]);
  };

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
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <div className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <p className="text-xs" style={{ color: '#9B9B93' }}>
            <Link href="/" style={{ color: '#1A6B4F' }}>
              Home
            </Link>{' '}
            / <span>Curated Packs</span>
          </p>
          <h1 className="text-4xl md:text-5xl font-serif font-light mt-2">
            Curated <span className="italic" style={{ color: '#1A6B4F' }}>Packs.</span>
          </h1>
          <p className="mt-2 text-base" style={{ color: '#6B6B63' }}>
            Hand-picked gift assortments for every budget and style.
          </p>

          {/* Tabs */}
          <div className="mt-6 inline-flex gap-1 rounded-full bg-[#EFEFE9] p-1">
            <Link
              href="/catalog"
              className="px-6 py-2 rounded-full text-sm font-medium text-[#6B6B63] hover:text-ink transition"
            >
              All Products
            </Link>
            <span className="px-6 py-2 rounded-full text-sm font-medium bg-white text-ink shadow-card">
              Curated Packs
            </span>
          </div>
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
          /* ── Level 1: Collections (gradient cards) ─────────────────────── */
          <>
            <p className="text-center text-ink-2 text-base md:text-lg max-w-2xl mx-auto mb-10">
              Hand-picked gift assortments curated by our gifting experts. Each pack is ready to
              customise with your branding.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openCollection(c.id)}
                  className="relative overflow-hidden rounded-md min-h-64 group text-left transition transform hover:-translate-y-1"
                >
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image}
                      alt={c.name}
                      className="absolute inset-0 h-full w-full object-cover transition transform group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 transition transform group-hover:scale-105"
                      style={{ background: c.gradient || FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length] }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    <h3 className="font-serif text-2xl md:text-3xl text-white mb-2 leading-tight">
                      {c.name}
                    </h3>
                    {c.description && (
                      <p className="text-white/70 text-sm mb-3 line-clamp-2">{c.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-white/60 text-xs font-medium">
                      <span>
                        {c.packs.length} pack{c.packs.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-white/10 rounded-full text-white text-sm font-medium group-hover:bg-white/20 transition">
                      Browse Packs →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* ── Level 2: Catalog-style packs view (filter bar + cards) ─────── */
          <>
            {/* Back + search + sort */}
            <div className="mb-4">
              <button
                type="button"
                onClick={backToCollections}
                className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 transition hover:opacity-80"
                style={{ color: '#1A6B4F' }}
              >
                ← All Collections
              </button>

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
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="rounded-full border-2 border-bdr bg-white px-4 py-2.5 text-sm text-ink focus:border-em focus:outline-none"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
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
              {/* Filter sidebar */}
              <aside className="w-full lg:w-64 flex-shrink-0">
                <div className="bg-white rounded-md border-2 border-bdr p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
                  <h3 className="text-lg font-bold text-ink mb-4">Filters</h3>

                  {/* Categories */}
                  {catOptions.length > 0 && (
                    <div className="mb-5 pb-4 border-b border-bdr">
                      <p className="text-sm font-semibold text-ink mb-3">Categories</p>
                      <div className="space-y-2">
                        {catOptions.map((cat) => (
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
                            <span className="text-ink-3">
                              ({filtered.filter((p) => p.categories.some((c) => c.id === cat.id)).length})
                            </span>
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
                      const thumb = "appearance-none pointer-events-none absolute inset-0 h-4 w-full bg-transparent focus:outline-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#1A6B4F] [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.25)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#1A6B4F] [&::-moz-range-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.25)] [&::-moz-range-thumb]:cursor-pointer"
                      return (
                        <div className="relative h-4">
                          <div className="absolute left-[7px] right-[7px] top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-gray-200">
                            <div className="absolute inset-y-0 rounded-full bg-[#1A6B4F]" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }} />
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
                  {brandOptions.length > 0 && (
                    <div className="mb-5 pb-4 border-b border-bdr">
                      <p className="text-sm font-semibold text-ink mb-3">Brand</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {brandOptions.map((brand) => (
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
                            <span className="text-ink-3">
                              ({filtered.filter((p) => p.brands.includes(brand)).length})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Occasion */}
                  {occasionOptions.length > 0 && (
                    <div className="mb-5 pb-4 border-b border-bdr">
                      <p className="text-sm font-semibold text-ink mb-3">Occasion</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {occasionOptions.map((occ) => (
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
                            <span className="text-ink-3">
                              ({filtered.filter((p) => p.occasions.some((o) => o.id === occ.id)).length})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recipient Type */}
                  {recipientOptions.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-ink mb-3">Recipient Type</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {recipientOptions.map((tag) => (
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
                            <span className="text-ink-3">
                              ({filtered.filter((p) => p.recipients.includes(tag)).length})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </aside>

              {/* Packs as product cards */}
              <div className="flex-1 w-full">
                {filtered.length === 0 ? (
                  <div className="text-center py-16 rounded-md border-2 border-dashed border-bdr bg-white">
                    <p className="text-ink">No packs match your filters</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((pack) => (
                      <div
                        key={pack.id}
                        className="flex flex-col overflow-hidden rounded-md border-2 border-bdr bg-white group"
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

                        <div className="flex flex-1 flex-col p-4">
                          <p className="text-xs text-ink-3 mb-0.5">{pack.collectionName}</p>
                          <h3 className="text-sm font-semibold text-ink leading-snug">
                            {pack.name}
                          </h3>
                          {pack.descriptionShort && (
                            <p className="mt-1 text-xs text-ink-2 line-clamp-2">
                              {pack.descriptionShort}
                            </p>
                          )}
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
                          <div className="mt-3 flex flex-col gap-2">
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
