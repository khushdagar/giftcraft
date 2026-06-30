'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { BOX_SIZE_THRESHOLDS } from '@/lib/constants';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { X, Plus, Minus, Search } from 'lucide-react';

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
}

interface StepProps {
  allProducts: Product[];
  categories: Array<{ id: string; name: string }>;
  presetIds?: string[];
}

export function Step1ChooseProducts({ allProducts, categories, presetIds }: StepProps) {
  const {
    products: selected,
    addProduct,
    removeProduct,
    reorderProducts,
    getProductsSubtotal,
    packQuantity,
    setPackQuantity,
  } = useBuilderStore();

  const router = useRouter();
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

    return result;
  }, [allProducts, selectedCategory, searchQuery, showPresetOnly, presetIds]);

  const productsSubtotal = getProductsSubtotal();
  // Price of one gift pack (one of each selected product)
  const perPackPrice = selected.reduce((sum, p) => sum + p.sellPrice, 0);

  const boxSize = useMemo(() => {
    const threshold = BOX_SIZE_THRESHOLDS.find(
      (t) => selected.length <= t.max
    );
    return threshold?.label || 'XL';
  }, [selected.length]);

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
              {filteredProducts.map((product) => {
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
                    onClick={() => router.push(`/products/${product.slug}`)}
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
                          if (isSelected) {
                            removeProduct(product.id);
                          } else {
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
                              dimensionL: (product as any).dimensionL ?? (product as any).lengthCm,
                              dimensionW: (product as any).dimensionW ?? (product as any).widthCm,
                              dimensionH: (product as any).dimensionH ?? (product as any).heightCm,
                              quantity: 1, // one unit of this product per pack
                              sellPrice: tierPrice,
                              priceTiers: product.priceTiers,
                              images: product.images,
                            });
                          }
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
            {filteredProducts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-ink-3">No products found</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Your Gift Pack (sticky) */}
        <div className="min-w-0 lg:sticky lg:top-[140px] h-fit">
          <div className="rounded-2xl bg-em-50 border-2 border-em-200 p-5 md:p-6 shadow-sm space-y-4">
            {/* Title with Count Badge */}
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-ink">Your Gift Pack</h3>
              <div className="w-6 h-6 rounded-full bg-em text-white flex items-center justify-center text-xs font-bold">{selected.length}</div>
            </div>


            {/* Icon Grid Box */}
            {selected.length > 0 ? (
              <>
                {/* Units selected — applies to the whole pack */}
                <div className="rounded-md bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-1.5">You have selected</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border-2 border-emerald-200 rounded-md overflow-hidden">
                      <button
                        onClick={() => {
                          // packQuantity = number of packs. Each product stays at
                          // 1 unit per pack, so only the pack count changes here.
                          setPackQuantity(Math.max(1, packQuantity - 1));
                        }}
                        className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-em transition"
                        title="Decrease units"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={packQuantity}
                        onChange={(e) => {
                          setPackQuantity(Math.max(1, parseInt(e.target.value) || 1));
                        }}
                        className="w-14 text-center text-base font-bold text-ink outline-none border-x-2 border-emerald-200 py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => {
                          setPackQuantity(packQuantity + 1);
                        }}
                        className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-em transition"
                        title="Increase units"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-sm text-ink-2">units</span>
                  </div>
                </div>

                <div className="rounded-md border-2 border-gray-200 bg-white p-6">
                  <div className="grid grid-cols-3 gap-4">
                    {selected.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-center"
                      >
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                          {product.images?.[0]?.url ? (
                            <Image
                              src={product.images[0].url}
                              alt={product.name}
                              width={56}
                              height={56}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <span className="text-2xl">📦</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Box Size Badge */}
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-600 text-white">
                  <p className="text-xs font-black">BOX SIZE: {boxSize}</p>
                </div>

                {/* Product List */}
                <div className="space-y-3">
                  {selected.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-md bg-white p-3 flex items-center gap-2 shadow-sm hover:shadow-md transition"
                    >
                      {/* Product Icon */}
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {product.images?.[0]?.url ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-lg">📦</span>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink line-clamp-1">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatRupees(product.sellPrice)} each
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="text-gray-300 hover:text-red-600 transition flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Subtotal — dark total block */}
                <div className="rounded-xl bg-dark text-white p-4">
                  <div className="flex items-center justify-between text-[11px] text-white/60">
                    <span>{formatRupees(perPackPrice)} / pack</span>
                    <span>× {packQuantity} units</span>
                  </div>
                  <p className="text-3xl font-black tabnum mt-1.5">
                    {formatRupees(productsSubtotal * packQuantity)}
                  </p>
                  <p className="text-[11px] text-white/50 mt-1">
                    Total before packaging, shipping &amp; GST
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-xs text-emerald-600">Add products to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}