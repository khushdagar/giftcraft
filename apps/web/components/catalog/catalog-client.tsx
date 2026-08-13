'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, ArrowRight, Heart } from 'lucide-react';
import { useBuilderStore } from '@/store/builder';
import { useWishlistStore } from '@/store/wishlist';
import { useTopLoading } from '@/components/ui/top-loading-bar';
import { toast } from '@/lib/stores/toast-store';
import { resolveSwatchHex } from '@/lib/color-name';
import { CollapsibleRichText } from '@/components/catalog/collapsible-rich-text';
import { printingTechniqueLabel } from '@/lib/printing';

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
  tags?: string[];
  sku?: string;
  material?: string;
  descriptionShort?: string;
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

// When `category` is passed, the catalog renders scoped to a single category:
// only that category's products are shown, every sidebar facet derives from
// just those products, and the header swaps to the category name + copy. Used
// by the /category/[slug] landing pages.
export interface CatalogCategoryContext {
  id: string;
  name: string;
  slug: string;
  /**
   * Sanitized HTML — the category description is authored in the admin with a
   * rich-text editor, so it must be rendered as markup, not printed as a
   * string. Sanitization happens on the server (lib/rich-text) before it gets
   * here; this component never receives raw stored HTML.
   */
  descriptionHtml?: string | null;
}

// When `occasion` is passed, the catalog renders scoped to a single occasion or
// curated collection — used by the /occasion/[slug] landing pages. Membership is
// resolved server-side (explicit links + tag matches) into `occasionIds` on each
// product, so the scope filter here is the same test the sidebar facet uses.
export interface CatalogOccasionContext {
  id: string;
  name: string;
  slug: string;
  /** True for curated Collections (isCollection) rather than occasion tiles. */
  isCollection?: boolean;
  /** Sanitized HTML — see the note on CatalogCategoryContext.descriptionHtml. */
  descriptionHtml?: string | null;
}

type UrlFilterParams = { category?: string; occasion?: string; recipient?: string; search?: string };

/**
 * Reads the filter query params and hands them to the catalog.
 *
 * This is a separate component on purpose: useSearchParams() opts its entire
 * client subtree out of static HTML, so calling it inside CatalogClient would
 * strip the product grid from the prerendered markup of /category/[slug] —
 * exactly the links search engines need. Isolated here (behind Suspense) the
 * grid still renders server-side and only this empty node is client-only.
 */
function CatalogUrlParams({ onChange }: { onChange: (params: UrlFilterParams) => void }) {
  const searchParams = useSearchParams();
  const category = searchParams.get('category') ?? undefined;
  const occasion = searchParams.get('occasion') ?? undefined;
  const recipient = searchParams.get('recipient') ?? undefined;
  const search = searchParams.get('search') ?? undefined;

  useEffect(() => {
    onChange({ category, occasion, recipient, search });
  }, [category, occasion, recipient, search, onChange]);

  return null;
}

/**
 * Narrow the full catalogue to the active scope. Hoisted out of the component
 * so the state initialisers below can all share it.
 */
function applyScope(
  list: Product[],
  pack?: CatalogPackContext,
  category?: CatalogCategoryContext,
  occasion?: CatalogOccasionContext,
  /**
   * Extra category/occasion ids ticked in the sidebar on a scoped landing page.
   * The page's own id is always part of the scope — the URL says so — and these
   * widen it, so /category/apparel + "Drinkware" shows the union of both.
   */
  extras?: Set<string>
): Product[] {
  if (pack) {
    // Keep the admin's arrangement order for a curated pack.
    const order = new Map(pack.productIds.map((id, i) => [id, i]));
    return list
      .filter((p) => order.has(p.id))
      .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }
  if (category) {
    const ids = new Set([category.id, ...(extras ?? [])]);
    return list.filter((p) => p.categories?.some((c) => ids.has(c.categoryId)));
  }
  if (occasion) {
    const ids = new Set([occasion.id, ...(extras ?? [])]);
    return list.filter((p) => p.occasionIds?.some((id) => ids.has(id)));
  }
  return list;
}

/**
 * Identity of a brand for filtering: case- and whitespace-insensitive, because
 * the same brand is entered inconsistently across the product master.
 */
function brandKey(brand: string | null | undefined): string {
  return (brand || '').trim().toLowerCase();
}

/**
 * How many capitals a spelling carries — used to pick which variant of a brand
 * to display, so "Uppercase" wins over "uppercase" and "DailyObjects" over
 * "dailyobjects".
 */
function capitals(s: string): number {
  return (s.match(/[A-Z]/g) || []).length;
}

// "From" price = the cheapest tier (highest MOQ slab), not the first tier.
function minTierPrice(p: Product): number {
  const prices = (p.priceTiers || []).map((t) => t.sellPrice).filter((n) => n > 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

function tierOnePrices(list: Product[]): number[] {
  return list.map(minTierPrice).filter((n) => n > 0);
}

export function CatalogClient({
  pack,
  category,
  occasion,
  initialProducts,
  initialFilters,
}: {
  pack?: CatalogPackContext;
  category?: CatalogCategoryContext;
  occasion?: CatalogOccasionContext;
  /** Server-fetched products — makes the grid render in the initial HTML (SEO). */
  initialProducts?: Product[];
  initialFilters?: { categories: Category[]; occasions: Occasion[] };
} = {}) {
  const addProduct = useBuilderStore((state) => state.addProduct);
  const wishlistItems = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  // The wishlist persists to localStorage, so the server renders it empty —
  // wait for hydration before painting filled hearts to avoid a mismatch.
  const [wishlistMounted, setWishlistMounted] = useState(false);
  useEffect(() => setWishlistMounted(true), []);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Seed from server-rendered data when provided (applying the same scope the
  // fetch path does), so there is no empty-grid first paint.
  const scopedInitial = useMemo(
    () => applyScope(initialProducts ?? [], pack, category, occasion),
    [initialProducts, pack, category, occasion]
  );
  const [products, setProducts] = useState<Product[]>(() => scopedInitial);
  // The UNSCOPED catalogue, kept alongside the scoped list so ticking an extra
  // category/occasion in the sidebar can widen the scope without another fetch.
  // On a scoped landing page the server only sends that page's slice, so until
  // the client fetch below lands this holds just that slice — which is exactly
  // the current scope, so nothing renders wrong in the meantime.
  const [catalogAll, setCatalogAll] = useState<Product[]>(initialProducts ?? []);
  // True once `catalogAll` really holds the whole catalogue. On an unscoped
  // /catalog render the server already sent everything; on a scoped landing page
  // it takes the client fetch below. Counts in the scope-nav block stay hidden
  // until then rather than showing numbers that are only true of the slice.
  const [hasFullCatalog, setHasFullCatalog] = useState(
    !pack && !category && !occasion && !!initialProducts
  );
  const [scopeExtras, setScopeExtras] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>(initialFilters?.categories ?? []);
  const [occasions, setOccasions] = useState<Occasion[]>(initialFilters?.occasions ?? []);
  const [loading, setLoading] = useState(!initialProducts);
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
  const [priceMin, setPriceMin] = useState<number | null>(() =>
    tierOnePrices(scopedInitial).length > 0 ? 0 : null
  );
  const [priceMax, setPriceMax] = useState<number | null>(() => {
    const prices = tierOnePrices(scopedInitial);
    return prices.length > 0 ? Math.max(...prices) : null;
  });

  // Filter params lifted out of the URL by <CatalogUrlParams> below. Held as
  // plain strings so the seeding effect depends on primitives, not on the
  // searchParams object identity.
  const [urlParams, setUrlParams] = useState<UrlFilterParams>({});
  const { category: categoryParam, occasion: occasionParam, recipient: recipientParam, search: searchParam } = urlParams;
  // Stable identity — CatalogUrlParams effect depends on this callback.
  const handleUrlParams = useCallback((params: UrlFilterParams) => setUrlParams(params), []);

  // Seed the search box from ?search= (the navbar search lands here). Kept in its
  // own effect keyed only on the param so a re-render of the filter data can't
  // re-fill the box after the user has cleared it.
  useEffect(() => {
    if (searchParam) setSearch(searchParam);
  }, [searchParam]);

  // Seed the sidebar filters from the URL query params (e.g. when arriving from a
  // nav "Occasions" dropdown link or a homepage category tile). Categories link by
  // id; occasions link by slug — so we map the slug/name back to the occasion id
  // the filter actually matches on. Runs after the filter data has loaded (so the
  // slug→id lookup works) and again whenever the URL changes (clicking another
  // occasion/category while already on the catalog re-selects it).
  useEffect(() => {
    if (loading) return;

    if (categoryParam) {
      const cat = categories.find(
        (c) =>
          c.id === categoryParam ||
          c.slug === categoryParam ||
          c.name.toLowerCase() === categoryParam.toLowerCase()
      );
      setSelectedCats(new Set([cat ? cat.id : categoryParam]));
    }

    if (occasionParam) {
      const occ = occasions.find(
        (o) =>
          o.slug === occasionParam ||
          o.id === occasionParam ||
          o.name.toLowerCase() === occasionParam.toLowerCase()
      );
      if (occ) setSelectedOccasions(new Set([occ.id]));
    }

    if (recipientParam) {
      setSelectedRecipients(new Set([recipientParam]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, categoryParam, occasionParam, recipientParam, categories, occasions]);

  // Fetch products and categories from API (skipped when the server already
  // provided them — the /catalog page passes initialProducts/initialFilters).
  useEffect(() => {
    if (initialProducts) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/products?limit=1000'),
          fetch('/api/catalog/filters'),
        ]);

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          // Scoped to a curated pack or a category: keep only that scope's
          // products. Everything downstream (filter facets, grid, counts) then
          // reflects just this scope.
          const all = productsData.products || [];
          const prods = applyScope(all, pack, category, occasion, scopeExtras);

          setCatalogAll(all);
          setHasFullCatalog(true);
          setProducts(prods);

          // Set initial price range based on actual product prices
          const prices = tierOnePrices(prods);
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

  // On a scoped landing page (/category/[slug], /occasion/[slug], a pack) the
  // server only sends that page's own slice, so the sidebar's OTHER categories /
  // occasions have nothing to widen the scope with — ticking one looked like a
  // dead checkbox. Pull the whole catalogue once in the background; the scope
  // effect below re-derives the grid the moment it lands, and the per-option
  // counts stop being hidden.
  useEffect(() => {
    // No initialProducts → the fetch above already loads the whole catalogue.
    if (hasFullCatalog || !initialProducts) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/products?limit=1000');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setCatalogAll(data.products || []);
        setHasFullCatalog(true);
      } catch (error) {
        console.error('Failed to load full catalog for sidebar filters:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Widening/narrowing the scope from the sidebar re-derives the product list
  // from the full catalogue already in memory — no refetch. The price bounds are
  // reset with it, otherwise a bound left over from the narrower scope would
  // silently hide the products the visitor just asked to see.
  // Also depends on `catalogAll` so a box ticked before the fetch lands is
  // honoured the moment the full catalogue arrives, rather than being dropped.
  useEffect(() => {
    const prods = applyScope(catalogAll, pack, category, occasion, scopeExtras);
    setProducts(prods);
    const prices = tierOnePrices(prods);
    if (prices.length > 0) {
      setPriceMin(0);
      setPriceMax(Math.max(...prices));
    }
    // pack/category/occasion are object props with a fresh identity every
    // render — listing them here would loop. They never change for a mounted
    // page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeExtras, catalogAll]);

  // Curated collections (isCollection) are hidden from the sidebar — they're
  // surfaced via the homepage section and can still be applied through the
  // ?occasion= URL param.
  const sidebarOccasions = useMemo(
    () => occasions.filter(o => !o.isCollection),
    [occasions]
  );

  // Product counts for the scope-nav rows, measured against the WHOLE catalogue
  // rather than the current scope — these rows widen the scope, so what matters
  // is how many products an option would bring in. Declared before the nav lists
  // below, which filter themselves on these counts.
  const scopeNavCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!occasion && !category) return counts;
    for (const p of catalogAll) {
      const ids = occasion ? p.occasionIds ?? [] : (p.categories ?? []).map(c => c.categoryId);
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
    // occasion/category are object props with a fresh identity each render, but
    // they never change for a mounted page — only which ONE of them is set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogAll, occasion, category]);

  // Sibling links for the /occasion/[slug] nav block. A curated Collection page
  // lists the other Collections, an occasion page lists the other occasions —
  // mixing the two would send visitors between unrelated kinds of page.
  // An option with nothing behind it can't widen anything, so it's dropped once
  // the real counts are known — the page's own scope and anything already ticked
  // always stay, otherwise the visitor would lose the row they're standing on or
  // have no way to untick.
  const occasionNavItems = useMemo(
    () =>
      occasion
        ? occasions.filter(
            o =>
              !!o.isCollection === !!occasion.isCollection &&
              (o.id === occasion.id ||
                scopeExtras.has(o.id) ||
                !hasFullCatalog ||
                (scopeNavCounts.get(o.id) ?? 0) > 0)
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [occasions, occasion, scopeExtras, hasFullCatalog, scopeNavCounts]
  );

  const categoryNavItems = useMemo(
    () =>
      category
        ? categories.filter(
            c =>
              c.id === category.id ||
              c.slug === category.slug ||
              scopeExtras.has(c.id) ||
              !hasFullCatalog ||
              (scopeNavCounts.get(c.id) ?? 0) > 0
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, category, scopeExtras, hasFullCatalog, scopeNavCounts]
  );

  // Get price range from products
  const priceRange = useMemo(() => {
    const prices = products
      .map(minTierPrice)
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
  const searchWords = useMemo(
    () => search.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [search]
  );

  const predicates = useMemo(() => ({
    // Every word must appear somewhere in the product's searchable text, so
    // "eco bottle" narrows while a single word still matches broadly (name,
    // brand, sku, material, tags, description, category names).
    search: (p: Product) => {
      if (!searchWords.length) return true;
      const haystack = [
        p.name,
        p.brand,
        p.sku,
        p.material,
        p.descriptionShort,
        ...(p.tags ?? []),
        ...(p.recipientTags ?? []),
        ...(p.categories?.map(c => c.category?.name) ?? []),
      ].filter(Boolean).join(' ').toLowerCase();
      return searchWords.every(w => haystack.includes(w));
    },
    cats: (p: Product) =>
      selectedCats.size === 0 || !!p.categories?.some(c => selectedCats.has(c.categoryId)),
    brands: (p: Product) => selectedBrands.size === 0 || selectedBrands.has(brandKey(p.brand)),
    occasions: (p: Product) =>
      selectedOccasions.size === 0 || !!p.occasionIds?.some(id => selectedOccasions.has(id)),
    recipients: (p: Product) =>
      selectedRecipients.size === 0 || !!p.recipientTags?.some(t => selectedRecipients.has(t)),
    eco: (p: Product) => !ecoOnly || !!p.isEcoCertified,
    branding: (p: Product) => !brandingOnly || !!p.printingTechnique,
    price: (p: Product) => {
      if (priceMin === null || priceMax === null) return true;
      const price = minTierPrice(p);
      return price >= priceMin && price <= priceMax;
    },
  }), [searchWords, selectedCats, selectedBrands, selectedOccasions, selectedRecipients, ecoOnly, brandingOnly, priceMin, priceMax]);

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
    if (sort === 'price_asc') result.sort((a, b) => minTierPrice(a) - minTierPrice(b));
    else if (sort === 'price_desc') result.sort((a, b) => minTierPrice(b) - minTierPrice(a));
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

  // Brands are grouped case-insensitively — the product master has the same
  // brand typed both ways ("Uppercase" / "uppercase"), and two checkboxes for
  // one brand is just a broken filter. One row per brand, counts summed.
  const brandFacets = useMemo(() => {
    const base = productsExcept('brands');
    const groups = new Map<string, { key: string; label: string; count: number }>();
    for (const p of products) {
      const key = brandKey(p.brand);
      if (!key) continue;
      const label = (p.brand || '').trim();
      const existing = groups.get(key);
      if (!existing) groups.set(key, { key, label, count: 0 });
      else if (capitals(label) > capitals(existing.label)) existing.label = label;
    }
    for (const p of base) {
      const group = groups.get(brandKey(p.brand));
      if (group) group.count++;
    }
    return [...groups.values()]
      .sort((a, b) => a.label.localeCompare(b.label))
      .filter(b => b.count > 0 || selectedBrands.has(b.key));
  }, [products, productsExcept, selectedBrands]);

  /** Display label for a selected brand key, for the active-filter chips. */
  const brandLabels = useMemo(
    () => new Map(brandFacets.map(b => [b.key, b.label])),
    [brandFacets]
  );

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
    // Back to just this page's own category/occasion — never to an empty scope,
    // which would contradict the URL.
    setScopeExtras(new Set());
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

  // While products load, the global top loading bar is the only indicator.
  useTopLoading(loading);
  if (loading) return null;

  return (
    <div className="min-h-screen" style={{ background: '#F5F1EB' }}>
      {/* Query-param filters. Only the unscoped catalog is reachable via
          ?category=/?occasion=/?recipient= links, and keeping this out of the
          scoped pages preserves their fully server-rendered HTML. */}
      {!pack && !category && (
        <Suspense fallback={null}>
          <CatalogUrlParams onChange={handleUrlParams} />
        </Suspense>
      )}

      <div className="py-8 md:py-12" style={{ background: '#F5F1EB' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          {pack ? (
            <>
              <p className="text-xs" style={{ color: '#8F8A82' }}>
                <Link href="/" style={{ color: '#800020' }}>Home</Link> /{' '}
                <Link href="/curated-packs" style={{ color: '#800020' }}>Curated Packs</Link> /{' '}
                <span>{pack.name}</span>
              </p>
              <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-em-50 px-3 py-1 text-xs font-medium text-em-700 mb-2">
                    Curated Pack
                  </span>
                  <h1 className="text-4xl md:text-5xl font-serif font-light">
                    {pack.name}
                  </h1>
                  {pack.description && (
                    <p className="mt-2 text-base" style={{ color: '#5C5852' }}>
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
          ) : category ? (
            <>
              <p className="text-xs" style={{ color: '#8F8A82' }}>
                <Link href="/" style={{ color: '#800020' }}>Home</Link> /{' '}
                <Link href="/categories" style={{ color: '#800020' }}>Categories</Link> /{' '}
                <span>{category.name}</span>
              </p>
              <h1 className="text-4xl md:text-5xl font-serif font-light mt-2">{category.name}</h1>
              {category.descriptionHtml && (
                <CollapsibleRichText
                  html={category.descriptionHtml}
                  className="blog-content mt-2 max-w-7xl"
                  style={{ color: '#5C5852' }}
                />
              )}
              <p className="mt-2 text-sm" style={{ color: '#8F8A82' }}>
                {products.length} product{products.length === 1 ? '' : 's'} available for bulk order
              </p>
            </>
          ) : occasion ? (
            <>
              <p className="text-xs" style={{ color: '#8F8A82' }}>
                <Link href="/" style={{ color: '#800020' }}>Home</Link> /{' '}
                <Link href="/occasions" style={{ color: '#800020' }}>Occasions</Link> /{' '}
                <span>{occasion.name}</span>
              </p>
              {occasion.isCollection && (
                <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-em-50 px-3 py-1 text-xs font-medium text-em-700">
                   Curated Collection
                </span>
              )}
              <h1 className="text-4xl md:text-5xl font-serif font-light mt-2">{occasion.name}</h1>
              {occasion.descriptionHtml && (
                <CollapsibleRichText
                  html={occasion.descriptionHtml}
                  className="blog-content mt-2 max-w-7xl"
                  style={{ color: '#5C5852' }}
                />
              )}
              <p className="mt-2 text-sm" style={{ color: '#8F8A82' }}>
                {products.length} product{products.length === 1 ? '' : 's'} available for bulk order
              </p>
            </>
          ) : (
            <>
              <p className="text-xs" style={{ color: '#8F8A82' }}><Link href="/" style={{ color: '#800020' }}>Home</Link> / <span>Products</span></p>
              <h1 className="text-4xl md:text-5xl font-serif font-light mt-2">
                The <span className="italic" style={{ color: '#800020' }}>Catalog.</span>
              </h1>
              <p className="mt-2 text-base" style={{ color: '#5C5852' }}>
                {products.length}+ products for every occasion.
              </p>

              {/* Tabs — mirror the Curated Packs page toggle */}
              <div className="mt-6 inline-flex gap-1 rounded-full bg-[#EFEFE9] p-1">
                <span className="px-6 py-2 rounded-full text-sm font-medium bg-white text-ink shadow-card">
                  All Products
                </span>
                <Link
                  href="/curated-packs"
                  className="px-6 py-2 rounded-full text-sm font-medium text-[#5C5852] hover:text-ink transition"
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
            <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: '#8F8A82' }} />
            <input type="text" placeholder="Search products by name, brand, or category..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-11 pl-10 pr-4 rounded-full text-sm border" style={{ borderColor: '#D3CBBC', background: '#FFF' }} />
          </div>
          {/* Filters + Sort share one row on mobile. `md:contents` dissolves this
              wrapper on desktop, so the select keeps its original placement. */}
          <div className="flex gap-2 md:contents">
          <button className="md:hidden h-11 flex-1 px-4 rounded-full border flex items-center justify-center gap-2 text-sm font-medium" style={{ borderColor: '#E5DFD4', color: '#222222' }} onClick={() => setSidebarOpen(!sidebarOpen)}>☰ Filters</button>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 flex-1 md:flex-none min-w-0 px-4 rounded-full border text-sm font-medium" style={{ borderColor: '#E5DFD4', background: '#FFF', color: '#222222' }}>
            <option value="featured">Sort: Featured</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="name">Name: A → Z</option>
          </select>
          </div>
        </div>

        {/* Active Filters */}
        {(search || scopeExtras.size > 0 || selectedCats.size > 0 || selectedBrands.size > 0 || selectedOccasions.size > 0 || selectedRecipients.size > 0 || ecoOnly || brandingOnly || (priceMin !== null && priceMax !== null && (priceMin > (priceRange.min || 0) || priceMax < (priceRange.max || 3500)))) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Widened scope on a landing page — labelled with a + so it reads as
                "this page, plus Drinkware" rather than a plain filter. */}
            {Array.from(scopeExtras).map(id => {
              const name = category
                ? categories.find(c => c.id === id)?.name
                : occasions.find(o => o.id === id)?.name;
              return (
                <button key={id} onClick={() => toggleSetValue(setScopeExtras, id)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#FBF4F5', color: '#560015' }}>
                  + {name} ✕
                </button>
              );
            })}
            {Array.from(selectedCats).map(catId => {
              const cat = categories.find(c => c.id === catId);
              return (
                <button key={catId} onClick={() => handleCatChange(catId)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#FBF4F5', color: '#560015' }}>
                  {cat?.name} ✕
                </button>
              );
            })}
            {Array.from(selectedBrands).map(brand => (
              <button key={brand} onClick={() => handleBrandChange(brand)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#FBF4F5', color: '#560015' }}>
                Brand: {brandLabels.get(brand) ?? brand} ✕
              </button>
            ))}
            {Array.from(selectedOccasions).map(occId => {
              const occ = occasions.find(o => o.id === occId);
              return (
                <button key={occId} onClick={() => toggleSetValue(setSelectedOccasions, occId)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#FBF4F5', color: '#560015' }}>
                  {occ?.name} ✕
                </button>
              );
            })}
            {Array.from(selectedRecipients).map(tag => (
              <button key={tag} onClick={() => toggleSetValue(setSelectedRecipients, tag)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#FBF4F5', color: '#560015' }}>
                {tag} ✕
              </button>
            ))}
            {ecoOnly && <button onClick={() => setEcoOnly(false)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#FBF4F5', color: '#560015' }}>Eco-Friendly ✕</button>}
            {brandingOnly && <button onClick={() => setBrandingOnly(false)} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#FBF4F5', color: '#560015' }}>Branding Available ✕</button>}
            {(priceMin !== null && priceMax !== null && (priceMin > (priceRange.min || 0) || priceMax < (priceRange.max || 3500))) && <button onClick={() => { setPriceMin(priceRange.min || null); setPriceMax(priceRange.max || null); }} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#FBF4F5', color: '#560015' }}>Price: {formatPrice(priceMin)}–{formatPrice(priceMax)} ✕</button>}
            {search && <button onClick={() => setSearch('')} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#FBF4F5', color: '#560015' }}>Search: "{search}" ✕</button>}
            <button onClick={clearAll} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" style={{ background: '#FAFAFA', color: '#5C5852' }}>Clear All</button>
          </div>
        )}

        <p className="text-xs mb-4" style={{ color: '#8F8A82' }}>Showing {filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className={`lg:col-span-1 ${sidebarOpen ? 'fixed inset-0 z-40 bg-black/30 lg:bg-transparent lg:static' : 'hidden lg:block'}`} onClick={() => setSidebarOpen(false)}>
            <div className={`bg-white rounded-2xl shadow p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto ${sidebarOpen ? 'fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 lg:mb-0">
                <h3 className="font-serif text-lg">Filters</h3>
                <button className="lg:hidden text-2xl" onClick={() => setSidebarOpen(false)}>✕</button>
              </div>

              {/* Scoped landing pages (/category/[slug], /occasion/[slug]) put
                  their own group FIRST, since that's the axis the visitor is
                  browsing on. Ticking others widens the scope to the union, so
                  Apparel + Drinkware shows both — the page's own entry stays
                  checked and locked, because the URL and the H1 say it's there.
                  Only one of these two blocks can render at a time. */}
              {occasion && occasionNavItems.length > 0 && (
                <div className="mb-4 pb-3 border-b">
                  <h4 className="text-sm font-semibold mb-2">
                    {occasion.isCollection ? 'Collections' : 'Occasion'}
                  </h4>
                  <div className="space-y-2">
                    {occasionNavItems.map(occ => {
                      const isScope = occ.id === occasion.id;
                      const count = scopeNavCounts.get(occ.id) ?? 0;
                      return (
                        <label
                          key={occ.id}
                          className={`flex items-center gap-2 text-sm ${isScope ? 'cursor-default' : 'cursor-pointer hover:text-emerald-700'}`}
                          style={isScope ? { color: '#560015', fontWeight: 600 } : undefined}
                          title={isScope ? `You're on the ${occ.name} page` : undefined}
                        >
                          <input
                            type="checkbox"
                            checked={isScope || scopeExtras.has(occ.id)}
                            disabled={isScope}
                            onChange={() => toggleSetValue(setScopeExtras, occ.id)}
                            style={{ accentColor: '#800020' }}
                          />
                          {occ.name}
                          {hasFullCatalog && (
                            <span className="text-xs ml-auto" style={{ color: '#8F8A82' }}>({count})</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {category && categoryNavItems.length > 0 && (
                <div className="mb-4 pb-3 border-b">
                  <h4 className="text-sm font-semibold mb-2">Categories</h4>
                  <div className="space-y-2">
                    {categoryNavItems.map(cat => {
                      const isScope = cat.slug === category.slug || cat.id === category.id;
                      const count = scopeNavCounts.get(cat.id) ?? 0;
                      return (
                        <label
                          key={cat.id}
                          className={`flex items-center gap-2 text-sm ${isScope ? 'cursor-default' : 'cursor-pointer hover:text-emerald-700'}`}
                          style={isScope ? { color: '#560015', fontWeight: 600 } : undefined}
                          title={isScope ? `You're on the ${cat.name} page` : undefined}
                        >
                          <input
                            type="checkbox"
                            checked={isScope || scopeExtras.has(cat.id)}
                            disabled={isScope}
                            onChange={() => toggleSetValue(setScopeExtras, cat.id)}
                            style={{ accentColor: '#800020' }}
                          />
                          {cat.name}
                          {hasFullCatalog && (
                            <span className="text-xs ml-auto" style={{ color: '#8F8A82' }}>({count})</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {!category && categoryFacets.length > 0 && (
                <div className="mb-4 pb-3 border-b">
                  <h4 className="text-sm font-semibold mb-2">Categories</h4>
                  <div className="space-y-2">
                    {categoryFacets.map(cat => (
                      <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-emerald-700">
                        <input type="checkbox" checked={selectedCats.has(cat.id)} onChange={() => handleCatChange(cat.id)} style={{ accentColor: '#800020' }} />
                        {cat.name}
                        <span className="text-xs ml-auto" style={{ color: '#8F8A82' }}>({cat.count})</span>
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
                    const thumb = "appearance-none pointer-events-none absolute inset-0 h-4 w-full bg-transparent focus:outline-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#800020] [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.25)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#800020] [&::-moz-range-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.25)] [&::-moz-range-thumb]:cursor-pointer"
                    return (
                      <div className="relative h-4">
                        <div className="absolute left-[7px] right-[7px] top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-gray-200">
                          <div className="absolute inset-y-0 rounded-full bg-[#800020]" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }} />
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
                  <div className="space-y-1">
                    {brandFacets.map(({ key, label, count }) => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:text-emerald-700">
                        <input type="checkbox" checked={selectedBrands.has(key)} onChange={() => handleBrandChange(key)} style={{ accentColor: '#800020' }} />
                        {label}
                        <span className="text-xs ml-auto" style={{ color: '#8F8A82' }}>({count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Occasion — skipped on an occasion page, where the navigation
                  block above already occupies this axis. */}
              {!occasion && occasionFacets.length > 0 && (
                <div className="mb-4 pb-3 border-b">
                  <h4 className="text-sm font-semibold mb-2">Occasion</h4>
                  <div className="space-y-2">
                    {occasionFacets.map(occ => (
                      <label key={occ.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-emerald-700">
                        <input type="checkbox" checked={selectedOccasions.has(occ.id)} onChange={() => toggleSetValue(setSelectedOccasions, occ.id)} style={{ accentColor: '#800020' }} />
                        {occ.name}
                        <span className="text-xs ml-auto" style={{ color: '#8F8A82' }}>({occ.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipient Type */}
              {recipientFacets.length > 0 && (
                <div className="mb-4 pb-3 border-b">
                  <h4 className="text-sm font-semibold mb-2">Recipient Type</h4>
                  <div className="space-y-2">
                    {recipientFacets.map(({ tag, count }) => (
                      <label key={tag} className="flex items-center gap-2 text-sm cursor-pointer hover:text-emerald-700">
                        <input type="checkbox" checked={selectedRecipients.has(tag)} onChange={() => toggleSetValue(setSelectedRecipients, tag)} style={{ accentColor: '#800020' }} />
                        {tag}
                        <span className="text-xs ml-auto" style={{ color: '#8F8A82' }}>({count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Eco Toggle */}
              {(ecoCount > 0 || ecoOnly) && (
                <div className="mb-4 pb-3 border-b flex justify-between items-center">
                  <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">Eco-Friendly Only <span className="text-xs" style={{ color: '#8F8A82' }}>({ecoCount})</span></label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={ecoOnly} onChange={(e) => setEcoOnly(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>
              )}

              {/* Branding Toggle */}
              {(brandingCount > 0 || brandingOnly) && (
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">Branding Available <span className="text-xs" style={{ color: '#8F8A82' }}>({brandingCount})</span></label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={brandingOnly} onChange={(e) => setBrandingOnly(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>
              )}

              {sidebarOpen && (
                <div className="flex gap-2 mt-6">
                  <button onClick={() => setSidebarOpen(false)} className="flex-1 h-11 bg-emerald-700 text-white rounded-full font-semibold text-sm">Show Results</button>
                  <button onClick={clearAll} className="h-11 px-4 border rounded-full text-sm" style={{ borderColor: '#E5DFD4' }}>Clear</button>
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
                <p className="text-sm mb-6" style={{ color: '#5C5852' }}>Try adjusting your search or clearing some filters.</p>
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

                  const wishlisted =
                    wishlistMounted && wishlistItems.some((i) => i.id === p.id);
                  const handleToggleWishlist = (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist({
                      id: p.id,
                      name: p.name,
                      slug: p.slug,
                      image: p.images?.find((img) => img.isPrimary)?.url || p.images?.[0]?.url,
                    });
                    toast.success(
                      wishlisted ? `${p.name} removed from wishlist` : `${p.name} added to wishlist`,
                      3000
                    );
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
                        <div className="relative aspect-square m-2.5 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: '#FAFAFA' }}>
                          {displayUrl ? (
                            <img
                              src={displayUrl}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                          ) : (
                            <span className="text-5xl opacity-70 transition hover:scale-110">{p.icon || '📦'}</span>
                          )}
                          {p.moq && <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-1 rounded-full uppercase" style={{ background: '#F5F1EB', color: '#222222' }}>Min {p.moq}</span>}
                          <button
                            type="button"
                            onClick={handleToggleWishlist}
                            aria-pressed={wishlisted}
                            aria-label={wishlisted ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
                            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white"
                            style={{ border: '1px solid #E5DFD4' }}
                          >
                            <Heart className={`h-3.5 w-3.5 transition ${wishlisted ? 'fill-em text-em' : 'text-ink'}`} />
                          </button>
                          {p.isEcoCertified && <span className="absolute top-10 right-2 text-[9px] font-bold px-2 py-1 rounded-full uppercase" style={{ background: '#FBF4F5', color: '#560015' }}>Eco</span>}
                          {/* Only badge techniques we have a label for — an unmapped value must render nothing, not a fallback. */}
                          {printingTechniqueLabel(p.printingTechnique) && <span className="absolute bottom-2 right-2 text-[8px] font-bold px-2 py-1 rounded-full uppercase" style={{ background: 'rgba(128, 0, 32,.08)', color: '#560015' }}>{printingTechniqueLabel(p.printingTechnique)}</span>}
                        </div>
                        <div className="px-3.5 pb-3.5">
                          {/* {p.brand && <p className="text-[11px]" style={{ color: '#8F8A82' }}>{p.brand}</p>} */}
                          <h4 className="text-sm font-medium line-clamp-2 my-1">{p.name}</h4>
                          {minTierPrice(p) > 0 && (
                            <p className="text-sm font-semibold font-mono"><span className="text-[11px] font-normal" style={{ color: '#8F8A82' }}>From </span>{formatPrice(minTierPrice(p))}</p>
                          )}
                          {/* {printingTechniqueLabel(p.printingTechnique) && <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: '#8F8A82' }}>{printingTechniqueLabel(p.printingTechnique)}</p>} */}
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
                              className="h-4 w-4 rounded-full border border-[#E5DFD4] transition hover:scale-110"
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
