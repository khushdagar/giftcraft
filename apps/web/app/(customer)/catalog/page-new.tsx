'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  icon: string;
  moq: number;
  eco: boolean;
  technique: string;
  tiers: number[];
  occasions: string[];
  recipients: string[];
  leadDays: number;
  featured: boolean;
  image?: string;
}

interface Collection {
  name: string;
  desc: string;
  bgClass: string;
  productIds: string[];
}

// Mock data (same structure as HTML)
const PRODUCTS: Product[] = [
  {
    id: 'flask-500',
    name: 'Stainless Steel Flask 500ml',
    brand: 'Borosil',
    category: 'Drinkware',
    subcategory: 'Insulated Bottles',
    icon: '🧴',
    moq: 25,
    eco: true,
    technique: 'Laser Engraved',
    tiers: [1200, 1050, 920, 830, 760, 700],
    occasions: ['Diwali', 'Onboarding', 'Client'],
    recipients: ['Employees', 'Clients'],
    leadDays: 10,
    featured: true,
  },
  {
    id: 'notebook-a5',
    name: 'Premium Leather Notebook A5',
    brand: 'Classmate',
    category: 'Stationery',
    subcategory: 'Notebooks',
    icon: '📓',
    moq: 25,
    eco: false,
    technique: 'Foil Stamped',
    tiers: [340, 310, 280, 250, 230, 210],
    occasions: ['Onboarding', 'Client', 'Birthday'],
    recipients: ['Employees', 'Clients'],
    leadDays: 7,
    featured: true,
  },
  {
    id: 'pen-set',
    name: 'Jotter Ballpoint Pen Set',
    brand: 'Parker',
    category: 'Stationery',
    subcategory: 'Pens',
    icon: '🖊️',
    moq: 50,
    eco: false,
    technique: 'Laser Engraved',
    tiers: [420, 380, 340, 310, 280, 260],
    occasions: ['Onboarding', 'Client', 'Work Anniversary'],
    recipients: ['Employees', 'Clients', 'Vendors'],
    leadDays: 5,
    featured: true,
  },
  {
    id: 'backpack',
    name: 'Urban Laptop Backpack',
    brand: 'Wildcraft',
    category: 'Bags',
    subcategory: 'Backpacks',
    icon: '🎒',
    moq: 25,
    eco: true,
    technique: 'Screen Printed',
    tiers: [2400, 2100, 1850, 1650, 1500, 1400],
    occasions: ['Onboarding', 'Farewell'],
    recipients: ['Employees'],
    leadDays: 14,
    featured: true,
  },
  {
    id: 'speaker',
    name: 'Go 3 Bluetooth Speaker',
    brand: 'JBL',
    category: 'Tech',
    subcategory: 'Speakers',
    icon: '🔊',
    moq: 25,
    eco: false,
    technique: 'UV Printed',
    tiers: [3200, 2900, 2650, 2400, 2200, 2050],
    occasions: ['Diwali', 'Birthday', 'Farewell'],
    recipients: ['Employees', 'Clients'],
    leadDays: 10,
    featured: true,
  },
  {
    id: 'mug',
    name: 'Ceramic Travel Mug 350ml',
    brand: 'Starbucks',
    category: 'Drinkware',
    subcategory: 'Mugs',
    icon: '☕',
    moq: 10,
    eco: false,
    technique: 'Pad Printed',
    tiers: [680, 620, 560, 510, 470, 440],
    occasions: ['Christmas', 'Birthday', "Women's Day"],
    recipients: ['Employees', 'Clients', 'Friends & Family'],
    leadDays: 8,
    featured: true,
  },
  {
    id: 'tshirt',
    name: 'Premium Cotton T-Shirt',
    brand: 'Bewakoof',
    category: 'Apparel',
    subcategory: 'T-Shirts',
    icon: '👕',
    moq: 50,
    eco: true,
    technique: 'DTF Printing',
    tiers: [450, 400, 360, 320, 290, 270],
    occasions: ['Onboarding', 'Holi'],
    recipients: ['Employees'],
    leadDays: 12,
    featured: false,
  },
  {
    id: 'chocolates',
    name: 'Artisan Chocolate Box',
    brand: 'Smoor',
    category: 'Food',
    subcategory: 'Chocolates',
    icon: '🍫',
    moq: 10,
    eco: false,
    technique: 'None',
    tiers: [850, 780, 720, 660, 610, 570],
    occasions: ['Diwali', 'Christmas', 'Birthday', "Women's Day"],
    recipients: ['Employees', 'Clients', 'Friends & Family'],
    leadDays: 5,
    featured: true,
  },
];

const CATEGORIES = {
  Drinkware: ['Insulated Bottles', 'Mugs'],
  Stationery: ['Notebooks', 'Pens'],
  Bags: ['Backpacks'],
  Tech: ['Speakers', 'Chargers'],
  Apparel: ['T-Shirts'],
  Food: ['Chocolates'],
  Home: ['Plants', 'Accessories'],
  Wellness: ['Candles'],
};

const OCCASIONS = [
  'Diwali',
  'Holi',
  'Christmas',
  'New Year',
  "Women's Day",
  'Onboarding',
  'Client',
  'Birthday',
  'Work Anniversary',
  'Farewell',
];

const RECIPIENTS = [
  'Employees',
  'Clients',
  'Vendors',
  'Partners',
  'Friends & Family',
  'Children',
];

const COLLECTIONS: Collection[] = [
  {
    name: 'Budget-Friendly Under ₹500',
    desc: 'Thoughtful gifts that won\'t break the bank.',
    bgClass: 'bg-gradient-to-br from-yellow-100 via-amber-200 to-yellow-700',
    productIds: PRODUCTS.filter((p) => p.tiers[0] <= 500).map((p) => p.id),
  },
  {
    name: 'Premium Executive Collection',
    desc: 'Luxury gifts for your most valued relationships.',
    bgClass: 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900',
    productIds: PRODUCTS.filter((p) => p.tiers[0] >= 800).map((p) => p.id),
  },
  {
    name: 'Eco-Friendly Gifts',
    desc: 'Sustainable choices for conscious companies. 🍃',
    bgClass: 'bg-gradient-to-br from-em-50 via-em-400 to-em-700',
    productIds: PRODUCTS.filter((p) => p.eco).map((p) => p.id),
  },
];

function formatPrice(price: number): string {
  return '₹' + price.toLocaleString('en-IN');
}

export default function CatalogPage() {
  const [viewMode, setViewMode] = useState<'products' | 'packs'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );
  const [selectedSubcategories, setSelectedSubcategories] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedOccasions, setSelectedOccasions] = useState<Set<string>>(
    new Set()
  );
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(
    new Set()
  );
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(3500);
  const [ecoOnly, setEcoOnly] = useState(false);
  const [brandingOnly, setBrandingOnly] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const uniqueBrands = useMemo(
    () =>
      Array.from(new Set(PRODUCTS.map((p) => p.brand))).sort(),
    []
  );

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = PRODUCTS.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.subcategory.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategories.size === 0 ||
        selectedCategories.has(p.category) ||
        (selectedSubcategories.size === 0 &&
          Array.from(selectedCategories).some(
            (cat) =>
              CATEGORIES[cat as keyof typeof CATEGORIES]?.includes(
                p.subcategory
              )
          ));

      const matchesSubcategory =
        selectedSubcategories.size === 0 ||
        selectedSubcategories.has(p.subcategory);

      const matchesBrand =
        selectedBrands.size === 0 || selectedBrands.has(p.brand);

      const matchesOccasion =
        selectedOccasions.size === 0 ||
        Array.from(selectedOccasions).some((occ) =>
          p.occasions.includes(occ)
        );

      const matchesRecipient =
        selectedRecipients.size === 0 ||
        Array.from(selectedRecipients).some((rec) =>
          p.recipients.includes(rec)
        );

      const matchesPrice =
        p.tiers[0] >= priceMin && p.tiers[0] <= priceMax;

      const matchesEco = !ecoOnly || p.eco;
      const matchesBranding =
        !brandingOnly || p.technique !== 'None';

      return (
        matchesSearch &&
        matchesCategory &&
        matchesSubcategory &&
        matchesBrand &&
        matchesOccasion &&
        matchesRecipient &&
        matchesPrice &&
        matchesEco &&
        matchesBranding
      );
    });

    // Sort
    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.tiers[0] - b.tiers[0]);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.tiers[0] - a.tiers[0]);
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return result;
  }, [
    searchQuery,
    selectedCategories,
    selectedSubcategories,
    selectedBrands,
    selectedOccasions,
    selectedRecipients,
    priceMin,
    priceMax,
    ecoOnly,
    brandingOnly,
    sortBy,
  ]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategories(new Set());
    setSelectedSubcategories(new Set());
    setSelectedBrands(new Set());
    setSelectedOccasions(new Set());
    setSelectedRecipients(new Set());
    setPriceMin(0);
    setPriceMax(3500);
    setEcoOnly(false);
    setBrandingOnly(false);
    setSortBy('featured');
  }, []);

  const toggleCategory = (cat: string) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(cat)) {
      newSet.delete(cat);
    } else {
      newSet.add(cat);
    }
    setSelectedCategories(newSet);
  };

  const toggleSubcategory = (sub: string) => {
    const newSet = new Set(selectedSubcategories);
    if (newSet.has(sub)) {
      newSet.delete(sub);
    } else {
      newSet.add(sub);
    }
    setSelectedSubcategories(newSet);
  };

  const toggleBrand = (brand: string) => {
    const newSet = new Set(selectedBrands);
    if (newSet.has(brand)) {
      newSet.delete(brand);
    } else {
      newSet.add(brand);
    }
    setSelectedBrands(newSet);
  };

  const toggleOccasion = (occ: string) => {
    const newSet = new Set(selectedOccasions);
    if (newSet.has(occ)) {
      newSet.delete(occ);
    } else {
      newSet.add(occ);
    }
    setSelectedOccasions(newSet);
  };

  const toggleRecipient = (rec: string) => {
    const newSet = new Set(selectedRecipients);
    if (newSet.has(rec)) {
      newSet.delete(rec);
    } else {
      newSet.add(rec);
    }
    setSelectedRecipients(newSet);
  };

  return (
    <div className="bg-canvas min-h-screen">
      {/* Header Section */}
      <section className="py-7 md:py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-sm text-ink-3 mb-2 animate-fade-up">
            <Link href="/" className="text-em hover:opacity-75">
              Home
            </Link>
            {' / '}
            <span id="breadcrumb-page">Products</span>
          </div>
          <h1
            className="text-3xl md:text-5xl font-display font-medium mb-2 animate-fade-up"
            style={{ animationDelay: '0.06s' }}
          >
            The <span className="italic text-em">Catalog.</span>
          </h1>
          <p
            className="text-lg md:text-xl text-ink-2 mb-6 animate-fade-up"
            style={{ animationDelay: '0.12s' }}
          >
            500+ products for every occasion.
          </p>

          {/* Tabs */}
          <div
            className="flex gap-1 bg-elevated rounded-full w-fit animate-fade-up p-1"
            style={{ animationDelay: '0.18s' }}
          >
            <button
              onClick={() => setViewMode('products')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition ${
                viewMode === 'products'
                  ? 'bg-surface text-ink shadow-card'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              All Products
            </button>
            <button
              onClick={() => setViewMode('packs')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition ${
                viewMode === 'packs'
                  ? 'bg-surface text-ink shadow-card'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              Curated Packs
            </button>
          </div>
        </div>
      </section>

      {/* Products View */}
      {viewMode === 'products' && (
        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            {/* Toolbar */}
            <div
              className="flex flex-col md:flex-row gap-3 mb-6 animate-fade-up"
              style={{ animationDelay: '0.24s' }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                <input
                  type="text"
                  placeholder="Search products by name, brand, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-bdr-2 rounded-full bg-surface text-ink outline-none transition focus:border-em"
                />
              </div>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden h-11 px-4 bg-surface border-2 border-bdr rounded-full text-sm font-semibold text-ink flex items-center gap-2"
              >
                ☰ Filters
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-11 px-4 pr-10 border-2 border-bdr bg-surface text-sm font-semibold text-ink rounded-full outline-none appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B93' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '36px',
                }}
              >
                <option value="featured">Sort: Featured</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="name">Name: A → Z</option>
              </select>
            </div>

            {/* Active Filters */}
            {(selectedCategories.size > 0 ||
              selectedBrands.size > 0 ||
              selectedOccasions.size > 0 ||
              selectedRecipients.size > 0 ||
              ecoOnly ||
              brandingOnly ||
              priceMin > 0 ||
              priceMax < 3500 ||
              searchQuery) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.from(selectedCategories).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-em-50 text-em-700 hover:bg-em hover:text-white transition"
                  >
                    {cat} ✕
                  </button>
                ))}
                {Array.from(selectedBrands).map((brand) => (
                  <button
                    key={brand}
                    onClick={() => toggleBrand(brand)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-em-50 text-em-700 hover:bg-em hover:text-white transition"
                  >
                    {brand} ✕
                  </button>
                ))}
                {ecoOnly && (
                  <button
                    onClick={() => setEcoOnly(false)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-em-50 text-em-700 hover:bg-em hover:text-white transition"
                  >
                    Eco-Friendly ✕
                  </button>
                )}
                {brandingOnly && (
                  <button
                    onClick={() => setBrandingOnly(false)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-em-50 text-em-700 hover:bg-em hover:text-white transition"
                  >
                    Branding Available ✕
                  </button>
                )}
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-elevated text-ink-2 hover:bg-recessed transition"
                >
                  Clear All
                </button>
              </div>
            )}

            <p className="text-sm text-ink-3 mb-6">
              Showing {filteredProducts.length} product
              {filteredProducts.length !== 1 ? 's' : ''}
            </p>

            {/* Main Layout */}
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
              {/* Sidebar */}
              <aside
                className={`fixed inset-0 z-50 md:relative md:z-0 md:sticky md:top-20 md:max-h-[calc(100vh-120px)] overflow-y-auto ${
                  sidebarOpen ? 'bg-black/30 backdrop-blur' : 'hidden md:block'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <div
                  className="bg-surface rounded-2xl shadow-card p-5 md:p-0 md:shadow-none md:rounded-0 md:bg-transparent fixed bottom-0 left-0 right-0 md:static max-h-[85vh] md:max-h-none overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center md:hidden mb-4">
                    <h3 className="font-display text-lg">Filters</h3>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-ink-2"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Category Filter */}
                  <FilterSection title="Category">
                    <div className="space-y-1">
                      {Object.entries(CATEGORIES).map(([cat, subs]) => {
                        const count = PRODUCTS.filter(
                          (p) => p.category === cat
                        ).length;
                        return (
                          <div key={cat}>
                            <label className="flex items-center gap-2 p-1 text-sm font-medium text-ink cursor-pointer hover:text-em">
                              <input
                                type="checkbox"
                                checked={selectedCategories.has(cat)}
                                onChange={() => toggleCategory(cat)}
                                className="w-4 h-4 accent-em cursor-pointer"
                              />
                              {cat}
                              <span className="ml-auto text-xs text-ink-3">
                                ({count})
                              </span>
                            </label>
                            {selectedCategories.has(cat) && (
                              <div className="pl-6 space-y-1 mt-2 mb-2">
                                {subs.map((sub) => {
                                  const subCount = PRODUCTS.filter(
                                    (p) => p.subcategory === sub
                                  ).length;
                                  return (
                                    <label
                                      key={sub}
                                      className="flex items-center gap-2 p-1 text-xs text-ink-2 cursor-pointer hover:text-em"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedSubcategories.has(sub)}
                                        onChange={() => toggleSubcategory(sub)}
                                        className="w-3 h-3 accent-em cursor-pointer"
                                      />
                                      {sub}
                                      <span className="ml-auto text-ink-3">
                                        ({subCount})
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </FilterSection>

                  {/* Price Range */}
                  <FilterSection title="Price Range">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="range"
                            min="0"
                            max="3500"
                            value={priceMin}
                            onChange={(e) => setPriceMin(+e.target.value)}
                            className="flex-1 h-1 bg-recessed rounded accent-em cursor-pointer"
                          />
                          <input
                            type="range"
                            min="0"
                            max="3500"
                            value={priceMax}
                            onChange={(e) => setPriceMax(+e.target.value)}
                            className="flex-1 h-1 bg-recessed rounded accent-em cursor-pointer"
                          />
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-ink">
                          <span>{formatPrice(priceMin)}</span>
                          <span>{formatPrice(priceMax)}</span>
                        </div>
                      </div>
                    </div>
                  </FilterSection>

                  {/* Brand Filter */}
                  <FilterSection title="Brand">
                    <div className="space-y-1">
                      {uniqueBrands.map((brand) => {
                        const count = PRODUCTS.filter(
                          (p) => p.brand === brand
                        ).length;
                        return (
                          <label
                            key={brand}
                            className="flex items-center gap-2 p-1 text-sm cursor-pointer hover:text-em"
                          >
                            <input
                              type="checkbox"
                              checked={selectedBrands.has(brand)}
                              onChange={() => toggleBrand(brand)}
                              className="w-4 h-4 accent-em cursor-pointer"
                            />
                            <span className="flex-1 text-ink">{brand}</span>
                            <span className="text-xs text-ink-3">{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </FilterSection>

                  {/* Occasion Filter */}
                  <FilterSection title="Occasion">
                    <div className="space-y-1">
                      {OCCASIONS.map((occ) => {
                        const count = PRODUCTS.filter((p) =>
                          p.occasions.includes(occ)
                        ).length;
                        return (
                          <label
                            key={occ}
                            className="flex items-center gap-2 p-1 text-sm cursor-pointer hover:text-em"
                          >
                            <input
                              type="checkbox"
                              checked={selectedOccasions.has(occ)}
                              onChange={() => toggleOccasion(occ)}
                              className="w-4 h-4 accent-em cursor-pointer"
                            />
                            <span className="flex-1 text-ink">{occ}</span>
                            <span className="text-xs text-ink-3">{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </FilterSection>

                  {/* Recipient Filter */}
                  <FilterSection title="Recipient Type">
                    <div className="space-y-1">
                      {RECIPIENTS.map((rec) => {
                        const count = PRODUCTS.filter((p) =>
                          p.recipients.includes(rec)
                        ).length;
                        return (
                          <label
                            key={rec}
                            className="flex items-center gap-2 p-1 text-sm cursor-pointer hover:text-em"
                          >
                            <input
                              type="checkbox"
                              checked={selectedRecipients.has(rec)}
                              onChange={() => toggleRecipient(rec)}
                              className="w-4 h-4 accent-em cursor-pointer"
                            />
                            <span className="flex-1 text-ink">{rec}</span>
                            <span className="text-xs text-ink-3">{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </FilterSection>

                  {/* Eco Toggle */}
                  <FilterSection title="">
                    <label className="flex items-center gap-2 p-1 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ecoOnly}
                        onChange={(e) => setEcoOnly(e.target.checked)}
                        className="w-4 h-4 accent-em cursor-pointer"
                      />
                      <span className="text-ink">🍃 Eco-Friendly Only</span>
                    </label>
                  </FilterSection>

                  {/* Branding Toggle */}
                  <FilterSection title="">
                    <label className="flex items-center gap-2 p-1 text-sm cursor-pointer border-b-0">
                      <input
                        type="checkbox"
                        checked={brandingOnly}
                        onChange={(e) => setBrandingOnly(e.target.checked)}
                        className="w-4 h-4 accent-em cursor-pointer"
                      />
                      <span className="text-ink">🎨 Branding Available</span>
                    </label>
                  </FilterSection>

                  {/* Mobile Actions */}
                  <div className="md:hidden flex gap-2 mt-8 pt-4 border-t border-bdr">
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="flex-1 h-11 bg-em text-white rounded-full font-semibold text-sm"
                    >
                      Show Results
                    </button>
                    <button
                      onClick={clearFilters}
                      className="h-11 px-4 border-2 border-bdr rounded-full text-sm text-ink-2 font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </aside>

              {/* Product Grid */}
              <main>
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-5xl mb-4">📦</div>
                    <h3 className="text-2xl font-display font-medium mb-2">
                      No products match your filters.
                    </h3>
                    <p className="text-ink-2 mb-6 max-w-sm mx-auto">
                      Try adjusting your search or clearing some filters.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                      <button
                        onClick={clearFilters}
                        className="px-6 h-10 bg-em text-white rounded-full font-semibold text-sm"
                      >
                        Clear All Filters
                      </button>
                      <a
                        href={`https://wa.me/919876543210?text=${encodeURIComponent(
                          'Hi, I could not find what I was looking for. Can you help?'
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 h-10 border-2 border-bdr rounded-full font-semibold text-sm text-ink-2 flex items-center gap-2"
                      >
                        💬 Contact Us
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </main>
            </div>
          </div>
        </section>
      )}

      {/* Packs View */}
      {viewMode === 'packs' && (
        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <p className="text-center text-ink-2 text-base md:text-lg max-w-2xl mx-auto mb-12">
              Hand-picked gift assortments curated by our gifting experts. Each
              pack is ready to customise with your branding.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {COLLECTIONS.map((collection) => (
                <button
                  key={collection.name}
                  onClick={() => setViewMode('products')}
                  className={`relative overflow-hidden rounded-md min-h-64 group cursor-pointer transition transform hover:-translate-y-1`}
                >
                  <div
                    className={`absolute inset-0 ${collection.bgClass} transition transform group-hover:scale-105`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    <h3 className="font-display text-2xl md:text-3xl text-white mb-2 leading-tight">
                      {collection.name}
                    </h3>
                    <p className="text-white/50 text-sm mb-3">
                      {collection.desc}
                    </p>
                    <p className="text-white/35 text-xs font-semibold">
                      {collection.productIds.length} products
                    </p>
                    <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-white/10 rounded-full text-white text-sm font-semibold hover:bg-white/20 transition">
                      Browse Pack →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// Helper Components
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pb-4 mb-4 border-b border-bdr last:border-b-0 last:mb-0 last:pb-0">
      {title && (
        <h4 className="font-display text-sm font-semibold text-ink mb-3">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`}>
      <article className="bg-surface rounded-2xl shadow-card overflow-hidden transition transform hover:-translate-y-1 hover:shadow-hover cursor-pointer group">
        {/* Image */}
        <div className="relative aspect-square bg-elevated flex items-center justify-center overflow-hidden">
          <div className="text-6xl group-hover:scale-110 transition duration-500">
            {product.icon}
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gold-50 text-gold-700">
              MIN {product.moq}
            </span>
            {product.eco && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-em-50 text-em-700">
                🍃 ECO
              </span>
            )}
            {product.technique !== 'None' && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-em-50/20 text-em-700 text-[10px]">
                🎨 {product.technique}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <p className="text-xs text-ink-3 uppercase font-semibold mb-1">
            {product.brand}
          </p>
          <h3 className="text-sm font-semibold text-ink line-clamp-2 min-h-9 mb-2">
            {product.name}
          </h3>
          <p className="text-base font-bold text-em tabular-nums mb-1">
            From {formatPrice(product.tiers[0])}
          </p>
          <p className="text-xs text-ink-3 uppercase tracking-wider">
            {product.technique !== 'None'
              ? product.technique
              : 'No branding'}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={(e) => {
            e.preventDefault();
            // Add to builder logic
          }}
          className="w-[calc(100%-28px)] mx-3.5 mb-3 h-8 bg-em text-white text-xs font-semibold rounded-full hover:bg-em-600 transition opacity-0 group-hover:opacity-100"
        >
          Add to Pack
        </button>
      </article>
    </Link>
  );
}
