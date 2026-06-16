'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useBuilderStore } from '@/store/builder';
import { toast } from '@/lib/stores/toast-store';

interface ProductImage {
  id: string;
  url: string;
  isPrimary?: boolean;
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
  priceTiers?: Array<{ sellPrice: number }>;
  categories?: Array<{ categoryId: string; category?: { name: string } }>;
  images?: ProductImage[];
}

interface Category {
  id: string;
  name: string;
  subcategories?: Array<{ id: string; name: string }>;
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

export function CatalogClient() {
  const router = useRouter();
  const addProduct = useBuilderStore((state) => state.addProduct);
  const [view, setView] = useState<'products' | 'packs'>('products');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [ecoOnly, setEcoOnly] = useState(false);
  const [brandingOnly, setBrandingOnly] = useState(false);
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);

  // Fetch products and categories from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/products?limit=500'),
          fetch('/api/catalog/filters'),
        ]);

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          const prods = productsData.products || [];
          setProducts(prods);

          // Set initial price range based on actual product prices
          const prices = prods
            .map((p: Product) => p.priceTiers?.[0]?.sellPrice || 0)
            .filter((p: number) => p > 0);
          if (prices.length > 0) {
            setPriceMin(Math.min(...prices));
            setPriceMax(Math.max(...prices));
          }
        }

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || []);
        }
      } catch (error) {
        console.error('Failed to fetch catalog data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get unique brands from products
  const brands = useMemo(() => {
    return [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
  }, [products]);

  // Get price range from products
  const priceRange = useMemo(() => {
    const prices = products
      .map(p => p.priceTiers?.[0]?.sellPrice || 0)
      .filter(p => p > 0);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [products]);

  // Filter products
  const filtered = useMemo(() => {
    let result = products.filter(p => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(searchLower) &&
          !p.brand?.toLowerCase().includes(searchLower) &&
          !p.categories?.some(c => c.category?.name.toLowerCase().includes(searchLower))
        ) {
          return false;
        }
      }

      // Category filter
      if (selectedCats.size > 0) {
        const hasCategory = p.categories?.some(c => selectedCats.has(c.categoryId));
        if (!hasCategory) return false;
      }

      // Brand filter
      if (selectedBrands.size > 0 && !selectedBrands.has(p.brand || '')) {
        return false;
      }

      // Eco filter
      if (ecoOnly && !p.isEcoCertified) return false;

      // Branding filter
      if (brandingOnly && !p.printingTechnique) return false;

      // Price filter (only apply if both min and max are set)
      if (priceMin !== null && priceMax !== null) {
        const price = p.priceTiers?.[0]?.sellPrice || 0;
        if (price < priceMin || price > priceMax) return false;
      }

      return true;
    });

    // Sort
    if (sort === 'price_asc') result.sort((a, b) => (a.priceTiers?.[0]?.sellPrice || 0) - (b.priceTiers?.[0]?.sellPrice || 0));
    else if (sort === 'price_desc') result.sort((a, b) => (b.priceTiers?.[0]?.sellPrice || 0) - (a.priceTiers?.[0]?.sellPrice || 0));
    else if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [products, search, sort, selectedCats, selectedBrands, ecoOnly, brandingOnly, priceMin, priceMax]);

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

  const clearAll = () => {
    setSearch('');
    setSelectedCats(new Set());
    setSelectedBrands(new Set());
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
          <p className="text-xs" style={{ color: '#9B9B93' }}><Link href="/" style={{ color: '#1A6B4F' }}>Home</Link> / <span>Products</span></p>
          <h1 className="text-4xl md:text-5xl font-serif font-light mt-2">
            The <span className="italic" style={{ color: '#1A6B4F' }}>Catalog.</span>
          </h1>
          <p className="mt-2 text-base" style={{ color: '#6B6B63' }}>
            {products.length}+ products for every occasion.
          </p>
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
        {(search || selectedCats.size > 0 || selectedBrands.size > 0 || ecoOnly || brandingOnly || (priceMin !== null && priceMax !== null && (priceMin > (priceRange.min || 0) || priceMax < (priceRange.max || 3500)))) && (
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
            <div className={`bg-white rounded-2xl shadow p-5 ${sidebarOpen ? 'fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 lg:mb-0">
                <h3 className="font-serif text-lg">Filters</h3>
                <button className="lg:hidden text-2xl" onClick={() => setSidebarOpen(false)}>✕</button>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="mb-4 pb-3 border-b">
                  <h4 className="text-sm font-semibold mb-2">Categories</h4>
                  <div className="space-y-2">
                    {categories.map(cat => (
                      <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-emerald-700">
                        <input type="checkbox" checked={selectedCats.has(cat.id)} onChange={() => handleCatChange(cat.id)} style={{ accentColor: '#1A6B4F' }} />
                        {cat.name}
                        <span className="text-xs ml-auto" style={{ color: '#9B9B93' }}>({products.filter(p => p.categories?.some(c => c.categoryId === cat.id)).length})</span>
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
                  <div className="flex gap-2">
                    <input type="range" min={priceRange.min || 0} max={priceRange.max || 3500} value={priceMin ?? priceRange.min ?? 0} onChange={(e) => setPriceMin(Math.min(parseInt(e.target.value), (priceMax ?? priceRange.max ?? 3500) - 100))} className="w-full" style={{ accentColor: '#1A6B4F' }} />
                    <input type="range" min={priceRange.min || 0} max={priceRange.max || 3500} value={priceMax ?? priceRange.max ?? 3500} onChange={(e) => setPriceMax(Math.max(parseInt(e.target.value), (priceMin ?? priceRange.min ?? 0) + 100))} className="w-full" style={{ accentColor: '#1A6B4F' }} />
                  </div>
                </div>
              </div>

              {/* Brands */}
              {brands.length > 0 && (
                <div className="mb-4 pb-3 border-b">
                  <h4 className="text-sm font-semibold mb-2">Brand</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {brands.filter((b): b is string => !!b).map(brand => (
                      <label key={brand} className="flex items-center gap-2 text-sm cursor-pointer hover:text-emerald-700">
                        <input type="checkbox" checked={selectedBrands.has(brand)} onChange={() => handleBrandChange(brand)} style={{ accentColor: '#1A6B4F' }} />
                        {brand}
                        <span className="text-xs ml-auto" style={{ color: '#9B9B93' }}>({products.filter(p => p.brand === brand).length})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Eco Toggle */}
              <div className="mb-4 pb-3 border-b flex justify-between items-center">
                <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">🍃 Eco-Friendly Only</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={ecoOnly} onChange={(e) => setEcoOnly(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              {/* Branding Toggle */}
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">🎨 Branding Available</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={brandingOnly} onChange={(e) => setBrandingOnly(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

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
                      hsnCode: p.hsnCode,
                      gstRate: p.gstRate,
                      leadTimeDays: p.leadTimeDays,
                      dimensionL: (p as any).dimensionL,
                      dimensionW: (p as any).dimensionW,
                      dimensionH: (p as any).dimensionH,
                      quantity: 1,
                      sellPrice: tierPrice,
                      priceTiers: p.priceTiers,
                      images: p.images,
                    });

                    // Show success toast
                    toast.success(`${p.name} added to pack!`, 3000);
                  };

                  return (
                    <div key={p.id} className="bg-white rounded-md shadow hover:shadow-lg hover:translate-y-[-4px] transition overflow-hidden flex flex-col">
                      <Link href={`/products/${p.slug}`} className="block cursor-pointer flex-1">
                        <div className="relative aspect-square m-2.5 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: '#F5F5F0' }}>
                          {p.images && p.images.length > 0 ? (
                            <img
                              src={p.images.find(img => img.isPrimary)?.url || p.images[0]?.url}
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
                      <div className="flex gap-2 px-3.5 pb-3.5">
                        <button onClick={handleAddToPack} className="flex-1 h-8 bg-emerald-700 text-white text-xs font-semibold rounded-full hover:bg-emerald-800 transition">Add to Pack</button>
                        <Link href={`/products/${p.slug}`} className="flex-1 h-8 border-2 border-emerald-700 text-emerald-700 text-xs font-semibold rounded-full hover:bg-emerald-50 transition flex items-center justify-center">View Details</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#1A1A18', color: '#FAFAF7' }} className="py-8 text-center text-xs">
        <p className="font-serif mb-2" style={{ color: 'rgba(26,107,79,.6)' }}>GiftCraft</p>
        <p style={{ color: 'rgba(250,250,247,.25)' }}>© 2026 Arts Shala. All Rights Reserved. Made with ♥ in Delhi</p>
      </footer>
    </div>
  );
}
