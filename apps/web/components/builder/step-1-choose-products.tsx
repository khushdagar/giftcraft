'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { resolveChosenVariants } from '@/lib/variants';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { GiftPackSummary } from './gift-pack-summary';

interface Product {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  printingTechnique?: string;
  hsnCode?: string;
  gstRate?: number;
  leadTimeDays?: number;
  weightG?: number | null;
  priceTiers?: Array<{ tier: number; minQty: number; maxQty: number | null; sellPrice: number }>;
  images?: Array<{ url: string }>;
  categories?: Array<{ categoryId: string }>;
  variants?: Array<{ kind: string; value: string; hexColor?: string | null }>;
}

interface StepProps {
  allProducts: Product[];
  categories: Array<{ id: string; name: string }>;
  presetIds?: string[];
}

// How many cards to mount at a time. The grid grows as the user scrolls rather
// than rendering the whole catalogue up front.
const PAGE_SIZE = 12;

export function Step1ChooseProducts({ allProducts, categories, presetIds }: StepProps) {
  const {
    products: selected,
    addProduct,
    removeProduct,
    reorderProducts,
    packQuantity,
  } = useBuilderStore();

  // Clicking anywhere on a card adds or removes it — the whole tile and the
  // button share this, so the card never navigates away from the builder.
  const toggleProduct = (product: any, tierPrice: number, isSelected: boolean) => {
    if (isSelected) {
      removeProduct(product.id);
      return;
    }
    addProduct({
      id: product.id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      printingTechnique: product.printingTechnique,
      hsnCode: product.hsnCode,
      gstRate: product.gstRate,
      leadTimeDays: product.leadTimeDays,
      weightG: product.weightG,
      dimensionL: product.dimensionL ?? product.lengthCm,
      dimensionW: product.dimensionW ?? product.widthCm,
      dimensionH: product.dimensionH ?? product.heightCm,
      quantity: 1, // one unit of this product per pack
      sellPrice: tierPrice,
      moq: product.moq,
      priceTiers: product.priceTiers,
      images: product.images,
      // Adding straight off a card asks for no options, so record the product's
      // defaults (first option per kind). Without this the order line arrived
      // with no colour or size at all.
      variants: resolveChosenVariants(product.variants),
    });
  };

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const reduceMotion = useReducedMotion();
  // When arriving from the Budget Planner, start by showing only the recommended
  // picks; the user can switch to the full catalogue.
  const [showPresetOnly, setShowPresetOnly] = useState((presetIds?.length ?? 0) > 0);

  // Calculate tier pricing
  const allTiers: Array<{ tier: number; minQty: number; maxQty: number | null; sellPrice: number }> = [];
  selected.forEach((p) => {
    if (p.priceTiers) {
      p.priceTiers.forEach((tier) => {
        if (!allTiers.find((t) => t.tier === tier.tier)) {
          allTiers.push(tier);
        }
      });
    }
  });
  const tiers = allTiers.sort((a, b) => a.tier - b.tier);

  const filteredProducts = useMemo(() => {
    let result = allProducts;

    if (showPresetOnly && presetIds && presetIds.length > 0) {
      const set = new Set(presetIds);
      result = result.filter((p) => set.has(p.id));
    } else if (selectedCategory) {
      result = result.filter((p) =>
        p.categories?.some((c) => c.categoryId === selectedCategory)
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.brand?.toLowerCase().includes(query)
      );
    }

    // Products already in the pack float to the top (in the order they were
    // added) so the user always sees their current selection first.
    const selectedOrder = new Map(selected.map((p, i) => [p.id, i]));
    return [...result].sort((a, b) => {
      const aRank = selectedOrder.get(a.id);
      const bRank = selectedOrder.get(b.id);
      if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
      if (aRank !== undefined) return -1;
      if (bRank !== undefined) return 1;
      return 0;
    });
  }, [allProducts, selectedCategory, searchQuery, showPresetOnly, presetIds, selected]);

  // Grow the grid as the sentinel below it scrolls into view.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = visibleCount < filteredProducts.length;

  // Any change of filter starts the list over from the top.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, searchQuery, showPresetOnly]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredProducts.length));
        }
      },
      // Load the next batch slightly before it's reached, so scrolling never stalls.
      { rootMargin: '400px' }
    );
    io.observe(el);
    return () => io.disconnect();
    // visibleCount is a dep so the observer re-fires when a short batch doesn't
    // fill the viewport and the sentinel is still on screen.
  }, [filteredProducts.length, visibleCount]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      {/* Main Layout: Builder Panel (left, 1.4fr) + Gift Pack (right, 1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-6 items-start">
        {/* LEFT: Builder Panel (white card with header, search, pills, grid) */}
        <div className="min-w-0 bg-white rounded-2xl p-2 md:p-7 py-4 shadow-sm">
          {/* Header */}
          <p className="overline text-ink-3">STEP 01</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-1 leading-none">Choose the craft.</h2>
          <p className="text-sm text-ink-2 mt-3 mb-5">
            Select products to include in your gift pack. Prices shown for <span className="font-semibold">{packQuantity} packs</span> (Tier {
              tiers.find((t) => packQuantity >= t.minQty && (t.maxQty === null || packQuantity <= t.maxQty))?.tier || 1
            }).
          </p>

          {/* Budget Planner picks banner */}
          {showPresetOnly && presetIds && presetIds.length > 0 && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-md border-2 border-em-200 bg-em-50 px-4 py-3">
              <p className="text-sm text-em-700">
                Showing your <span className="font-bold">{presetIds.length}</span> budget-matched picks from the planner.
              </p>
              <button
                type="button"
                onClick={() => setShowPresetOnly(false)}
                className="text-sm font-semibold text-em-700 underline whitespace-nowrap"
              >
                Show all products
              </button>
            </div>
          )}

          {/* Search Input */}
          <div className="relative mb-4">
            <Input
              type="text"
              placeholder="Search products by name, brand, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-full border-2 px-4 py-3 pl-11"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
          </div>

          {/* Category Pills (horizontal) — hidden while showing planner picks */}
          {!showPresetOnly && (
          <div className="overflow-x-auto pb-2 mb-5">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                  !selectedCategory
                    ? 'bg-em text-white'
                    : 'bg-elevated text-ink-2 hover:bg-recessed'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-em text-white'
                      : 'bg-elevated text-ink-2 hover:bg-recessed'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Product Grid */}
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleProducts.map((product) => {
                const isSelected = selected.some((p) => p.id === product.id);
                // Price for the tier that matches the current pack quantity
                const tier =
                  product.priceTiers?.find(
                    (t) => packQuantity >= t.minQty && (t.maxQty === null || packQuantity <= t.maxQty)
                  ) || product.priceTiers?.[0];
                const tierPrice = tier?.sellPrice || 0;

                return (
                  <motion.div
                    key={product.id}
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                    animate={reduceMotion ? {} : { opacity: 1, scale: 1 }}
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.3 }}
                    whileHover={reduceMotion ? {} : { y: -4 }}
                    onClick={() => toggleProduct(product, tierPrice, isSelected)}
                    className={`rounded-md border-2 overflow-hidden cursor-pointer transition-shadow ${
                      isSelected
                        ? 'border-em bg-em-50 shadow-md'
                        : 'border-bdr bg-white hover:shadow-lg'
                    }`}
                  >
                    <div className="relative aspect-square bg-gray-50 overflow-hidden group">
                      {product.images?.[0]?.url ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          className="object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-3xl opacity-60">
                          📦
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-em/20 flex items-center justify-center">
                          <div className="bg-em text-white rounded-full p-2">
                            <span className="text-lg font-black">✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3.5">
                      {product.brand && (
                        <p className="text-[10px] text-ink-3 uppercase font-semibold tracking-wide">
                          {product.brand}
                        </p>
                      )}
                      <h4 className="text-sm font-bold leading-snug line-clamp-2 mt-1 text-ink min-h-[2.5rem]">
                        {product.name}
                      </h4>
                      <p className="text-base font-black tabnum text-em mt-2">
                        {formatRupees(tierPrice)}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProduct(product, tierPrice, isSelected);
                        }}
                        className={`w-full mt-3 rounded-full py-2 text-xs font-bold transition ${
                          isSelected
                            ? 'bg-em text-white hover:bg-em-600'
                            : 'bg-dark text-white hover:-translate-y-0.5 hover:shadow-md'
                        }`}
                      >
                        {isSelected ? '✓ Added' : '+ Add to Pack'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {/* Scroll sentinel — mounting the next batch when it comes into view. */}
            {hasMore && (
              <div ref={sentinelRef} className="py-6 text-center">
                <p className="text-xs text-ink-3">
                  Showing {visibleProducts.length} of {filteredProducts.length}
                </p>
              </div>
            )}
            {filteredProducts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-ink-3">No products found</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Your Gift Pack (sticky) */}
        <GiftPackSummary />
      </div>
    </div>
  );
}