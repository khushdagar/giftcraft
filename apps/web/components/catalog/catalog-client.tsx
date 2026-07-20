'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { useBuilderStore } from '@/store/builder';
import { toast } from '@/lib/stores/toast-store';
import { resolveSwatchHex } from '@/lib/color-name';

interface ProductImage {
  id: string;
  url: string;
  isPrimary?: boolean;
}

interface ColorVariant {
  id?: string;
  kind?: string;
  value: string;
  hexColor?: string | null;
  imageUrl?: string | null;
}

interface Product {
  id: string;
  name: string;
  brand?: string;
  slug: string;
  icon?: string;
  moq?: number;
  isEcoCertified?: boolean;
  printingTechnique?: string;
  leadTimeDays?: number;
  recipientTags?: string[];
  occasionIds?: string[];
  priceTiers?: Array<{ sellPrice: number }>;
  categories?: Array<{ categoryId: string; category?: { name: string } }>;
  images?: ProductImage[];
  variants?: ColorVariant[];
}

interface Category {
  id: string;
  name: string;
  slug?: string;
  subcategories?: Array<{ id: string; name: string }>;
}

interface Occasion {
  id: string;
  name: string;
  slug?: string;
  isCollection?: boolean;
}

// Mapping of printing techniques to badges
const TECH_BADGES: Record<string, string> = {
  'screen_print': '🎨 Screen Print',
  'digital_print': '🎨 Digital Print',
  'embroidery': '🎨 Embroidery',
  'uv_print': '🎨 UV Print',
  'laser_engrave': '🎨 Laser Engraved',
  'foil_stamp': '🎨 Foil Stamped',
  'pad_print': '🎨 Pad Printed',
  'dtf_print': '🎨 DTF Printing',
  'deboss': '🎨 Debossing',
};

function formatPrice(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

// When `pack` is passed, the catalog renders scoped to a single curated pack:
// only that pack's products are shown, the sidebar filters derive from just
// those products, and the header swaps to the pack's name + a "Customise" CTA.
export interface CatalogPackContext {
  name: string;
  description?: string | null;
  productIds: string[];
  builderHref: string;
}

export function CatalogClient({ pack }: { pack?: CatalogPackContext } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addProduct = useBuilderStore((state) => state.addProduct);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  // Per-card image override when a colour swatch is hovered/selected.
  const [variantImg, setVariantImg] = useState<Record<string, string | null>>({});
  // Which card is currently hovered (to show its second image).
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Filters
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedOccasions, setSelectedOccasions] = useState<Set<string>>(new Set());
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [ecoOnly, setEcoOnly] = useState(false);
  const [brandingOnly, setBrandingOnly] = useState(false);
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);

  // Seed the sidebar filters from the URL query params (e.g. when arriving from a
  // nav "Occasions" dropdown link or a homepage category tile). Categories link by
  // id; occasions link by slug — so we map the slug/name back to the occasion id
  // the filter actually matches on. Runs after the filter data has loaded (so the
  // slug→id lookup works) and again whenever the URL changes (clicking another
  // occasion/category while already on the catalog re-selects it).
  useEffect(() => {
    if (loading) return;

    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      const cat = categories.find(
        (c) =>
          c.id === categoryParam ||
          c.slug === categoryParam ||
          c.name.toLowerCase() === categoryParam.toLowerCase()
      );
      setSelectedCats(new Set([cat ? cat.id : categoryParam]));
    }

    const occasionParam = searchParams.get('occasion');
    if (occasionParam) {
      const occ = occasions.find(
        (o) =>
          o.slug === occasionParam ||
          o.id === occasionParam ||
          o.name.toLowerCase() === occasionParam.toLowerCase()
      );
      if (occ) setSelectedOccasions(new Set([occ.id]));
    }

    const recipientParam = searchParams.get('recipient');
    if (recipientParam) {
      setSelectedRecipients(new Set([recipientParam]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams, categories, occasions]);

  // Fetch products and categories from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/products?limit=1000'),
          fetch('/api/catalog/filters'),
        ]);

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          let prods = productsData.products || [];

          // Scoped to a curated pack: keep only the pack's products, in the
          // order the admin arranged them. Everything downstream (filter facets,
          // grid, counts) then reflects just this pack.
          if (pack) {
            const order = new Map(pack.productIds.map((id, i) => [id, i]));
            prods = prods
              .filter((p: Product) => order.has(p.id))
              .sort((a: Product, b: Product) => (order.get(a.id)! - order.get(b.id)!));
          }

          setProducts(prods);

          // Set initial price range based on actual product prices
          const prices = prods
            .map((p: Product) => p.priceTiers?.[0]?.sellPrice || 0)
            .filter((p: number) => p > 0);
          if (prices.length > 0) {
            setPriceMin(0);
            setPriceMax(Math.max(...prices));
          }
        }

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || []);
          setOccasions(categoriesData.occasions || []);
        }
      } catch (error) {
        console.error('Failed to fetch catalog data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Curated collections (isCollection) are hidden from the sidebar — they're
  // surfaced via the homepage section and can still be applied through the
  // ?occasion= URL param.
  const sidebarOccasions = useMemo(
    () => occasions.filter(o => !o.isCollection),
    [occasions]
  );

  // Get price range from products
  const priceRange = useMemo(() => {
    const prices = products
      .map(p => p.priceTiers?.[0]?.sellPrice || 0)
      .filter(p => p > 0);
    return {
      min: 0,
      max: Math.max(...prices),
    };
  }, [products]);

  // One predicate per filter, so a facet's option counts can be computed against
  // every OTHER active filter while ignoring its own. Counting against the fully
  // filtered list instead would zero out every unselected option in a facet the
  // moment you tick one of them, making multi-select impossible.
  const predicates = useMemo(() => ({
    search: (p: Product) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        !!p.brand?.toLowerCase().includes(q) ||
        !!p.categories?.some(c => c.category?.name.toLowerCase().includes(q))
      );
    },
    cats: (p: Product) =>
      selectedCats.size === 0 || !!p.categories?.some(c => selectedCats.has(c.categoryId)),
    brands: (p: Product) => selectedBrands.size === 0 || selectedBrands.has(p.brand || ''),
    occasions: (p: Product) =>
      selectedOccasions.size === 0 || !!p.occasionIds?.some(id => selectedOccasions.has(id)),
    recipients: (p: Product) =>
      selectedRecipients.size === 0 || !!p.recipientTags?.some(t => selectedRecipients.has(t)),
    eco: (p: Product) => !ecoOnly || !!p.isEcoCertified,
    branding: (p: Product) => !brandingOnly || !!p.printingTechnique,
    price: (p: Product) => {
      if (priceMin === null || priceMax === null) return true;
      const price = p.priceTiers?.[0]?.sellPrice || 0;
      return price >= priceMin && price <= priceMax;
    },
  }), [search, selectedCats, selectedBrands, selectedOccasions, selectedRecipients, ecoOnly, brandingOnly, priceMin, priceMax]);

  type FacetKey = keyof typeof predicates;

  /** Products matching every filter except `skip` — the base for that facet's counts. */
  const productsExcept = useMemo(() => {
    const cache = new Map<FacetKey | '', Product[]>();
    return (skip?: FacetKey) => {
      const key = skip ?? '';
      if (!cache.has(key)) {
        const checks = (Object.keys(predicates) as FacetKey[]).filter(k => k !== skip);
        cache.set(key, products.filter(p => checks.every(k => predicates[k](p))));
      }
      return cache.get(key)!;
    };
  }, [products, predicates]);

  // Filter products
  const filtered = useMemo(() => {
    const result = [...productsExcept()];

    // Sort
    if (sort === 'price_asc') result.sort((a, b) => (a.priceTiers?.[0]?.sellPrice || 0) - (b.priceTiers?.[0]?.sellPrice || 0));
    else if (sort === 'price_desc') result.sort((a, b) => (b.priceTiers?.[0]?.sellPrice || 0) - (a.priceTiers?.[0]?.sellPrice || 0));
    else if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [productsExcept, sort]);

  // ── Facet options ─────────────────────────────────────────────────────────
  // Each option carries a live count and only survives if that count is > 0 —
  // a filter that can't narrow anything is noise. An option the user has already
  // ticked always stays visible, otherwise they'd have no way to untick it.
  const categoryFacets = useMemo(() => {
    const base = productsExcept('cats');
    return categories
      .map(c => ({
        ...c,
        count: base.filter(p => p.categories?.some(x => x.categoryId === c.id)).length,
      }))
      .filter(c => c.count > 0 || selectedCats.has(c.id));
  }, [categories, productsExcept, selectedCats]);

  const brandFacets = useMemo(() => {
    const base = productsExcept('brands');
    const names = [...new Set(products.map(p => p.brand).filter((b): b is string => !!b))].sort();
    return names
      .map(name => ({ name, count: base.filter(p => p.brand === name).length }))
      .filter(b => b.count > 0 || selectedBrands.has(b.name));
  }, [products, productsExcept, selectedBrands]);

  const occasionFacets = useMemo(() => {
    const base = productsExcept('occasions');
    return sidebarOccasions
      .map(o => ({ ...o, count: base.filter(p => p.occasionIds?.includes(o.id)).length }))
      .filter(o => o.count > 0 || selectedOccasions.has(o.id));
  }, [sidebarOccasions, productsExcept, selectedOccasions]);

  const recipientFacets = useMemo(() => {
    const base = productsExcept('recipients');
    const tags = new Set<string>();
    products.forEach(p => p.recipientTags?.forEach(t => t && tags.add(t)));
    return [...tags]
      .sort()
      .map(tag => ({ tag, count: base.filter(p => p.recipientTags?.includes(tag)).length }))
      .filter(r => r.count > 0 || selectedRecipients.has(r.tag));
  }, [products, productsExcept, selectedRecipients]);

  // Toggles: hide when nothing in the current result set could match.
  const ecoCount = useMemo(
    () => productsExcept('eco').filter(p => p.isEcoCertified).length,
    [productsExcept]
  );
  const brandingCount = useMemo(
    () => productsExcept('branding').filter(p => p.printingTechnique).length,
    [productsExcept]
  );

  const handleCatChange = (catId: string) => {
    const newCats = new Set(selectedCats);
    if (newCats.has(catId)) newCats.delete(catId);
    else newCats.add(catId);
    setSelectedCats(newCats);
  };

  const handleBrandChange = (brand: string) => {
    const newBrands = new Set(selectedBrands);
    if (newBrands.has(brand)) newBrands.delete(brand);
    else newBrands.add(brand);
    setSelectedBrands(newBrands);
  };

  const toggleSetValue = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    value: string
  ) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const clearAll = () => {
    setSearch('');
    setSelectedCats(new Set());
    setSelectedBrands(new Set());
    setSelectedOccasions(new Set());
    setSelectedRecipients(new Set());
    setEcoOnly(false);
    setBrandingOnly(false);
    setPriceMin(priceRange.min || null);
    setPriceMax(priceRange.max || null);
    setSort('featured');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF7' }}>
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Loading products...</p>
          <div className="inline-block h-8 w-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>

      <div className="py-8 md:py-12" style={{ background: '#FAFAF7' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          {pack ? (
            <>
              <p className="text-xs" style={{ color: '#9B9B93' }}>
                <Link href="/" style={{ color: '#1A6B4F' }}>Home</Link> /{' '}
                <Link href="/packs" style={{ color: '#1A6B4F' }}>Curated Packs</Link> /{' '}
                <span>{pack.name}</span>
              </p>
              <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-em-50 px-3 py-1 text-xs font-medium text-em-700 mb-2">
                    ✨ Curated Pack
                  </span>
                  <h1 className="text-4xl md:text-5xl font-serif font-light">
                    {pack.name}
                  </h1>
                  {pack.description && (
                    <p className="mt-2 text-base" style={{ color: '#6B6B63' }}>
                      {pack.description}
                    </p>
                  )}
                </div>
                <Link
                  href={pack.builderHref}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-em px-6 py-3.5 text-base font-bold text-white transition hover:bg-em-600 hover:-translate-y-0.5 whitespace-nowrap"
                >
                  Customise this Pack <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs" style={{ color: '#9B9B93' }}><Link href="/" style={{ color: '#1A6B4F' }}>Home</Link> / <span>Products</span></p>
              <h1 className="text-4xl md:text-5xl font-serif font-light mt-2">
                The <span className="italic" style={{ color: '#1A6B4F' }}>Catalog.</span>
              </h1>
              <p className="mt-2 text-base" style={{ color: '#6B6B63' }}>
                {products.length}+ products for every occasion.
              </p>

              {/* Tabs — mirror the Curated Packs page toggle */}
              <div className="mt-6 inline-flex gap-1 rounded-full bg-[#EFEFE9] p-1">
                <span className="px-6 py-2 rounded-full text-sm font-medium bg-white text-ink shadow-card">
                  All Products
                </span>
                <Link
                  href="/packs"
                  className="px-6 py-2 rounded-full text-sm font-medium text-[#6B6B63] hover:text-ink transition"
                >
                  Curated Packs
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-10 pb-20">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 mb-4 items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: '#9B9B93' }} />
            <input type="text" placeholder="Search products by name, brand, or category..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-11 pl-10 pr-4 rounded-full text-sm border" style={{ borderColor: '#D4D4CF', background: '#FFF' }} />
          </div>
          <button className="md:hidden h-11 px-4 rounded-full border flex items-center gap-2" style={{ borderColor: '#E8E8E3', color: '#1A1A18' }} onClick={() => setSidebarOpen(!sidebarOpen)}>☰ Filters</button>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 px-4 rounded-full border text-sm font-medium" style={{ borderColor: '#E8E8E3', background: '#FFF', color: '#1A1A18' }}>
            <option value="featured">Sort: Featured</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="name">Name: A → Z</option>
          </select>
        </div>

        {/* Active Filters */}
        {(search || selectedCats.size > 0 || selectedBrands.size > 0 || selectedOccasions.size > 0 || selectedRecipients.size > 0 || ecoOnly || brandingOnly || (priceMin !== null && priceMax !== null && (priceMin > (priceRange.min || 0) || priceMax < (priceRange.max || 3500)))) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Array.from(selectedCats).map(catId => {
              const cat = categories.find(c => c.id === catId);
              return (
                <button key={catId} onClick={() => handleCatChange(catId)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#E8F5EF', color: '#0F4934' }}>
                  {cat?.name} ✕
                </button>
              );
            })}
            {Array.from(selectedBrands).map(brand => (
              <button key={brand} onClick={() => handleBrandChange(brand)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#E8F5EF', color: '#0F4934' }}>
                Brand: {brand} ✕
              </button>
            ))}
            {Array.from(selectedOccasions).map(occId => {
              const occ = occasions.find(o => o.id === occId);
              return (
                <button key={occId} onClick={() => toggleSetValue(setSelectedOccasions, occId)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#E8F5EF', color: '#0F4934' }}>
                  {occ?.name} ✕
                </button>
              );
            })}
            {Array.from(selectedRecipients).map(tag => (
              <button key={tag} onClick={() => toggleSetValue(setSelectedRecipients, tag)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#E8F5EF', color: '#0F4934' }}>
                {tag} ✕
              </button>
            ))}
            {ecoOnly && <button onClick={() => setEcoOnly(false)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#E8F5EF', color: '#0F4934' }}>Eco-Friendly ✕</button>}
            {brandingOnly && <button onClick={() => setBrandingOnly(false)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#E8F5EF', color: '#0F4934' }}>Branding Available ✕</button>}
            {(priceMin !== null && priceMax !== null && (priceMin > (priceRange.min || 0) || priceMax < (priceRange.max || 3500))) && <button onClick={() => { setPriceMin(priceRange.min || null); setPriceMax(priceRange.max || null); }} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#E8F5EF', color: '#0F4934' }}>Price: {formatPrice(priceMin)}–{formatPrice(priceMax)} ✕</button>}
            {search && <button onClick={() => setSearch('')} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#E8F5EF', color: '#0F4934' }}>Search: "{search}" ✕</button>}
            <button onClick={clearAll} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#F5F5F0', color: '#6B6B63' }}>Clear All</button>
          </div>
        )}

        <p className="text-xs mb-4" style={{ color: '#9B9B93' }}>Showing {filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className={`lg:col-span-1 ${sidebarOpen ? 'fixed inset-0 z-40 bg-black/30 lg:bg-transparent lg:static' : 'hidden lg:block'}`} onClick={() => setSidebarOpen(false)}>
            <div className={`bg-white rounded-2xl shadow p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto ${sidebarOpen ? 'fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 lg:mb-0">
                <h3 className="font-serif text-lg">Filters</h3>
                <button className="lg:hidden text-2xl" onClick={() => setSidebarOpen(false)}>✕</button>
              </div>

              {/* Categories */}
              {categoryFacets.length > 0 && (
                <div className="mb-4 pb-3 border-b">
                  <h4 className="text-sm font-semibold mb-2">Categories</h4>
                  <div className="space-y-2">
                    {categoryFacets.map(cat => (
                      <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-emerald-700">
                        <input type="checkbox" checked={selectedCats.has(cat.id)} onChange={() => handleCatChange(cat.id)} style={{ accentColor: '#1A6B4F' }} />
                        {cat.name}
                        <span className="text-xs ml-auto" style={{ color: '#9B9B93' }}>({cat.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Range */}
              <div className="mb-4 pb-3 border-b">
                <h4 className="text-sm font-semibold mb-2">Price Range</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{formatPrice(priceMin ?? priceRange.min ?? 0)}</span>
                    <span>{formatPrice(priceMax ?? priceRange.max ?? 3500)}</span>
                  </div>
                  {(() => {
                    const rMin = priceRange.min || 0
                    const rMax = priceRange.max || 3500
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
                        <input type="range" min={rMin} max={rMax} value={vMin} onChange={(e) => setPriceMin(Math.min(parseInt(e.target.value), vMax - 100))} className={thumb} style={{ zIndex: vMin > rMax - 100 ? 4 : 3 }} />
                        <input type="range" min={rMin} max={rMax} value={vMax} onChange={(e) => setPriceMax(Math.max(parseInt(e.target.value), vMin + 100))} className={thumb} style={{ zIndex: 4 }} />
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Brands */}
              {brandFacets.length > 0 && (
                <div className="mb-4 pb-3 border-b">
                  <h4 className="text-sm font-semibold mb-2">Brand</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {brandFacets.map(({ name, count }) => (
                      <label key={name} className="flex items-center gap-2 text-sm cursor-pointer hover:text-emerald-700">
                        <input type="checkbox" checked={selectedBrands.has(name)} onChange={() => handleBrandChange(name)} style={{ accentColor: '#1A6B4F' }} />
                        {name}
                        <span className="text-xs ml-auto" style={{ color: '#9B9B93' }}>({count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Occasion */}
              {occasionFacets.length > 0 && (
                <div className="mb-4 pb-3 border-b">
                  <h4 className="text-sm font-semibold mb-2">Occasion</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {occasionFacets.map(occ => (
                      <label key={occ.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-emerald-700">
                        <input type="checkbox" checked={selectedOccasions.has(occ.id)} onChange={() => toggleSetValue(setSelectedOccasions, occ.id)} style={{ accentColor: '#1A6B4F' }} />
                        {occ.name}
                        <span className="text-xs ml-auto" style={{ color: '#9B9B93' }}>({occ.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipient Type */}
              {recipientFacets.length > 0 && (
                <div className="mb-4 pb-3 border-b">
                  <h4 className="text-sm font-semibold mb-2">Recipient Type</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {recipientFacets.map(({ tag, count }) => (
                      <label key={tag} className="flex items-center gap-2 text-sm cursor-pointer hover:text-emerald-700">
                        <input type="checkbox" checked={selectedRecipients.has(tag)} onChange={() => toggleSetValue(setSelectedRecipients, tag)} style={{ accentColor: '#1A6B4F' }} />
                        {tag}
                        <span className="text-xs ml-auto" style={{ color: '#9B9B93' }}>({count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Eco Toggle */}
              {(ecoCount > 0 || ecoOnly) && (
                <div className="mb-4 pb-3 border-b flex justify-between items-center">
                  <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">🍃 Eco-Friendly Only <span className="text-xs" style={{ color: '#9B9B93' }}>({ecoCount})</span></label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={ecoOnly} onChange={(e) => setEcoOnly(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>
              )}

              {/* Branding Toggle */}
              {(brandingCount > 0 || brandingOnly) && (
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">🎨 Branding Available <span className="text-xs" style={{ color: '#9B9B93' }}>({brandingCount})</span></label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={brandingOnly} onChange={(e) => setBrandingOnly(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>
              )}

              {sidebarOpen && (
                <div className="flex gap-2 mt-6">
                  <button onClick={() => setSidebarOpen(false)} className="flex-1 h-11 bg-emerald-700 text-white rounded-full font-semibold text-sm">Show Results</button>
                  <button onClick={clearAll} className="h-11 px-4 border rounded-full text-sm" style={{ borderColor: '#E8E8E3' }}>Clear</button>
                </div>
              )}
            </div>
          </div>

          {/* Product Grid */}
          <div className="lg:col-span-3">
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-4">📦</p>
                <h3 className="font-serif text-xl mb-2">No products match your filters.</h3>
                <p className="text-sm mb-6" style={{ color: '#6B6B63' }}>Try adjusting your search or clearing some filters.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={clearAll} className="px-6 h-10 bg-emerald-700 text-white rounded-full font-semibold text-sm">Clear All Filters</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filtered.map(p => {
                  const tierPrice = p.priceTiers?.[0]?.sellPrice || 0;

                  const handleAddToPack = (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Add product to builder
                    addProduct({
                      id: p.id,
                      name: p.name,
                      slug: p.slug,
                      brand: p.brand,
                      printingTechnique: p.printingTechnique,
                      hsnCode: (p as any).hsnCode,
                      gstRate: (p as any).gstRate,
                      leadTimeDays: p.leadTimeDays,
                      dimensionL: (p as any).dimensionL ?? (p as any).lengthCm,
                      dimensionW: (p as any).dimensionW ?? (p as any).widthCm,
                      dimensionH: (p as any).dimensionH ?? (p as any).heightCm,
                      quantity: 1,
                      sellPrice: tierPrice,
                      priceTiers: (p as any).priceTiers,
                      images: p.images,
                    });

                    // Show success toast
                    toast.success(`${p.name} added to pack!`, 3000);
                  };

                  const colorVariants = (p.variants || []).filter((v) => (v.kind ?? 'color') === 'color');
                  const baseUrl = p.images?.find(img => img.isPrimary)?.url || p.images?.[0]?.url;
                  // A second, distinct image to reveal on hover (if the product has one).
                  const secondUrl = p.images?.find(img => img.url !== baseUrl)?.url;
                  const override = variantImg[p.id]; // string | null | undefined
                  const displayUrl =
                    override !== undefined
                      ? (override || baseUrl)
                      : (hoveredCard === p.id && secondUrl ? secondUrl : baseUrl);
                  return (
                    <div
                      key={p.id}
                      onMouseEnter={() => setHoveredCard(p.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      className="bg-white rounded-md shadow hover:shadow-lg hover:translate-y-[-4px] transition overflow-hidden flex flex-col"
                    >
                      <Link href={`/products/${p.slug}`} className="block cursor-pointer flex-1">
                        <div className="relative aspect-square m-2.5 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: '#F5F5F0' }}>
                          {displayUrl ? (
                            <img
                              src={displayUrl}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                          ) : (
                            <span className="text-5xl opacity-70 transition hover:scale-110">{p.icon || '📦'}</span>
                          )}
                          {p.moq && <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-1 rounded-full uppercase" style={{ background: '#FBF5E9', color: '#886528' }}>Min {p.moq}</span>}
                          {p.isEcoCertified && <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-1 rounded-full uppercase" style={{ background: '#E8F5EF', color: '#0F4934' }}>🍃 Eco</span>}
                          {p.printingTechnique && <span className="absolute bottom-2 right-2 text-[8px] font-bold px-2 py-1 rounded-full uppercase" style={{ background: 'rgba(26,107,79,.08)', color: '#0F4934' }}>{TECH_BADGES[p.printingTechnique] || '🎨 ' + p.printingTechnique}</span>}
                        </div>
                        <div className="px-3.5 pb-3.5">
                          {p.brand && <p className="text-[11px]" style={{ color: '#9B9B93' }}>{p.brand}</p>}
                          <h4 className="text-sm font-medium line-clamp-2 my-1">{p.name}</h4>
                          {p.priceTiers && p.priceTiers[0] && (
                            <p className="text-sm font-semibold font-mono"><span className="text-[11px] font-normal" style={{ color: '#9B9B93' }}>From </span>{formatPrice(p.priceTiers[0].sellPrice)}</p>
                          )}
                          {p.printingTechnique && <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: '#9B9B93' }}>{TECH_BADGES[p.printingTechnique] || p.printingTechnique}</p>}
                        </div>
                      </Link>
                      {/* Colour swatches — hover/tap swaps the card image */}
                      {colorVariants.length > 0 && (
                        <div className="flex items-center gap-1.5 px-3.5 pb-2">
                          {colorVariants.slice(0, 6).map((v) => (
                            <button
                              key={v.id || v.value}
                              type="button"
                              title={v.value}
                              onMouseEnter={() =>
                                v.imageUrl && setVariantImg((m) => ({ ...m, [p.id]: v.imageUrl! }))
                              }
                              onClick={() =>
                                setVariantImg((m) => ({ ...m, [p.id]: v.imageUrl || null }))
                              }
                              className="h-4 w-4 rounded-full border border-[#E8E8E3] transition hover:scale-110"
                              style={{ backgroundColor: resolveSwatchHex(v.value, v.hexColor || undefined) }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex flex-col gap-2 px-3.5 pb-3.5 sm:flex-row">
                        <button onClick={handleAddToPack} className="w-full sm:flex-1 h-9 sm:h-8 bg-emerald-700 text-white text-xs font-semibold rounded-full hover:bg-emerald-800 transition whitespace-nowrap">Add to Pack</button>
                        <Link href={`/products/${p.slug}`} className="w-full sm:flex-1 h-9 sm:h-8 border-2 border-emerald-700 text-emerald-700 text-xs font-semibold rounded-full hover:bg-emerald-50 transition flex items-center justify-center whitespace-nowrap">View Details</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
