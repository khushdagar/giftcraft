'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCatalogFilters } from '@/hooks/use-catalog-filters';
import { formatRupees } from '@/lib/utils';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  slug: string;
  brand?: string | null;
  priceTiers?: any[];
  images?: any[];
  isEcoCertified?: boolean;
  printingTechnique?: string;
  leadTimeDays?: number;
}

interface CatalogContentProps {
  products: Product[] | any[];
  total: number;
  page: number;
  limit: number;
  categories: any[];
  occasions: any[];
  brands: string[];
  minPrice: number;
  maxPrice: number;
  currentFilters: any;
}

export function CatalogContent({
  products,
  total,
  page,
  limit,
  categories,
  occasions,
  brands,
  minPrice: globalMinPrice,
  maxPrice: globalMaxPrice,
}: CatalogContentProps) {
  const reduce = useReducedMotion();
  const { filters, setFilter, clearAll, getActiveFilters } = useCatalogFilters();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [sort, setSort] = useState(filters.sort || 'featured');

  // Debounce search
  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    const timer = setTimeout(() => setFilter('search', value || null), 300);
    return () => clearTimeout(timer);
  };

  const totalPages = Math.ceil(total / limit);
  const activeFilters = getActiveFilters();
  const hasFilters = Object.keys(activeFilters).length > 0;
  const showEmpty = hasFilters && products.length === 0;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="border-b border-bdr bg-white py-6">
        <div className="container-gc-w">
          <h1 className="text-[22px] font-bold font-display">Browse Products</h1>
          <p className="text-sm text-ink-3 mt-1">{total} products available</p>
        </div>
      </div>

      {/* Main content */}
      <div className="container-gc-w py-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden lg:block space-y-6">
          {/* Search */}
          <div className="rounded-md border border-bdr shadow-card p-4">
            <p className="overline mb-3">SEARCH</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
              <Input
                placeholder="Search products..."
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 rounded-md h-9 text-sm"
              />
            </div>
          </div>

          {/* Category filter */}
          <div className="rounded-md border border-bdr shadow-card p-4">
            <p className="overline mb-3">CATEGORY</p>
            <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
              <button
                onClick={() => setFilter('categoryId', null)}
                className={`block w-full text-left px-2 py-1.5 rounded ${
                  !filters.categoryId ? 'bg-em-50 text-em font-semibold' : 'hover:bg-gray-50'
                }`}
              >
                All categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilter('categoryId', cat.id)}
                  className={`block w-full text-left px-2 py-1.5 rounded ${
                    filters.categoryId === cat.id
                      ? 'bg-em-50 text-em font-semibold'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price filter */}
          <div className="rounded-md border border-bdr shadow-card p-4">
            <p className="overline mb-3">PRICE RANGE</p>
            <div className="space-y-2 text-sm">
              <label className="block">
                <span className="text-xs text-ink-3 mb-1 block">Min: {formatRupees(filters.priceMin || globalMinPrice)}</span>
                <input
                  type="range"
                  min={globalMinPrice}
                  max={globalMaxPrice}
                  value={filters.priceMin || globalMinPrice}
                  onChange={(e) => setFilter('priceMin', Number(e.target.value) || null)}
                  className="w-full accent-em"
                />
              </label>
              <label className="block">
                <span className="text-xs text-ink-3 mb-1 block">Max: {formatRupees(filters.priceMax || globalMaxPrice)}</span>
                <input
                  type="range"
                  min={globalMinPrice}
                  max={globalMaxPrice}
                  value={filters.priceMax || globalMaxPrice}
                  onChange={(e) => setFilter('priceMax', Number(e.target.value) || null)}
                  className="w-full accent-em"
                />
              </label>
            </div>
          </div>

          {/* Brand filter */}
          <div className="rounded-md border border-bdr shadow-card p-4">
            <p className="overline mb-3">BRAND</p>
            <div className="flex flex-wrap gap-2">
              {brands.slice(0, 8).map((b) => (
                <button
                  key={b}
                  onClick={() => setFilter('brand', filters.brand === b ? null : b)}
                  className={`rounded-md-p px-3 py-1 text-xs font-semibold transition ${
                    filters.brand === b
                      ? 'bg-dark text-inv'
                      : 'border border-bdr text-ink hover:bg-gray-50'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Occasion filter */}
          <div className="rounded-md border border-bdr shadow-card p-4">
            <p className="overline mb-3">OCCASION</p>
            <div className="flex flex-wrap gap-2">
              {occasions.slice(0, 6).map((occ) => (
                <button
                  key={occ.id}
                  onClick={() => setFilter('occasionId', filters.occasionId === occ.id ? null : occ.id)}
                  className={`rounded-md-p px-3 py-1 text-xs font-semibold transition ${
                    filters.occasionId === occ.id
                      ? 'bg-dark text-inv'
                      : 'border border-bdr text-ink hover:bg-gray-50'
                  }`}
                >
                  {occ.name}
                </button>
              ))}
            </div>
          </div>

          {/* Eco toggle */}
          <div className="rounded-md border border-bdr shadow-card p-4">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={filters.eco}
                onChange={(e) => setFilter('eco', e.target.checked ? '1' : null)}
                className="rounded accent-em"
              />
              Eco-certified only
            </label>
          </div>

          {/* Clear all */}
          {hasFilters && (
            <Button
              onClick={clearAll}
              variant="outline"
              className="w-full rounded-md border-bdr"
            >
              Clear All Filters
            </Button>
          )}
        </aside>

        {/* Main content */}
        <div className="space-y-6">
          {/* Mobile filter button */}
          <div className="lg:hidden flex gap-2">
            <Button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              variant="outline"
              className="gap-2 rounded-md border-bdr"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
              <Input
                placeholder="Search..."
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 rounded-md h-9 text-sm"
              />
            </div>
          </div>

          {/* Active filter badges */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(activeFilters).map(([key, value]) => (
                <Badge
                  key={key}
                  className="rounded-md-p gap-1 bg-em-50 text-em-700 hover:bg-em-100 cursor-pointer"
                  onClick={() => setFilter(key, null)}
                >
                  {typeof value === 'boolean' ? key : `${key}: ${value}`}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
              <Button
                onClick={clearAll}
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Sort and count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-3">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
            </p>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setFilter('sort', e.target.value);
              }}
              className="rounded-md px-3 py-1.5 text-sm border border-bdr"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          {/* Product grid or empty state */}
          {showEmpty ? (
            <div className="rounded-md border border-bdr shadow-card bg-white p-12 text-center">
              <p className="text-5xl mb-4">🫗</p>
              <p className="text-lg font-semibold mb-2">No products found</p>
              <p className="text-sm text-ink-3 mb-6">Try adjusting your filters</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={clearAll} variant="em" className="rounded-md">
                  Clear All Filters
                </Button>
                <Button asChild variant="dark" className="rounded-md">
                  <a href="https://wa.me/919999999999">Get Help on WhatsApp</a>
                </Button>
              </div>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: {
                  transition: {
                    staggerChildren: reduce ? 0 : 0.05,
                  },
                },
              }}
            >
              {products.map((product, idx) => (
                <motion.div
                  key={product.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {totalPages > 1 && !showEmpty && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                disabled={page === 1}
                onClick={() => setFilter('page', page - 1)}
                variant="outline"
                className="rounded-md"
              >
                ← Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-ink-3">
                Page {page} of {totalPages}
              </span>
              <Button
                disabled={page === totalPages}
                onClick={() => setFilter('page', page + 1)}
                variant="outline"
                className="rounded-md"
              >
                Next →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const reduce = useReducedMotion();
  const price = product.priceTiers?.[0]?.sellPrice || 0;

  return (
    <motion.div
      whileHover={reduce ? {} : { y: -6 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link href={`/products/${product.slug}`} className="block">
        <div className="rounded-md overflow-hidden shadow-card hover:shadow-hover transition-shadow">
          {/* Image */}
          <div className="relative m-2.5 overflow-hidden rounded-md bg-elevated aspect-[4/3]">
            {product.images?.[0]?.url ? (
              <img
                src={product.images[0].url}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-5xl opacity-60">📦</div>
            )}

            {/* Badges */}
            <div className="absolute top-2 left-2 flex gap-1">
              <Badge variant="gold" className="text-[10px] py-0.5">
                MOQ 25
              </Badge>
              {product.isEcoCertified && (
                <Badge variant="em" className="text-[10px] py-0.5">
                  ECO
                </Badge>
              )}
              {product.printingTechnique && product.printingTechnique !== 'none' && (
                <span className="rounded-md-p bg-dark/10 px-2 py-0.5 text-[10px] font-semibold text-ink">
                  BRANDING
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="px-3 pb-3 pt-1">
            {product.brand && <p className="text-[11px] text-ink-3">{product.brand}</p>}
            <h3 className="mt-1 line-clamp-2 min-h-[32px] text-sm font-semibold leading-tight">
              {product.name}
            </h3>
            <p className="mt-2 font-black tabnum text-base">From {formatRupees(price)}</p>
          </div>

          {/* Add button (slides up on hover) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={reduce ? { y: 0 } : { y: '100%' }}
            whileHover={reduce ? {} : { y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-em text-inv py-2 text-center text-xs font-bold rounded-b-gc"
          >
            Add to Pack
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}
