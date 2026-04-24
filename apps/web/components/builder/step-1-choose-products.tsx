'use client';

import { useState, useMemo } from 'react';
import { motion, Reorder } from 'framer-motion';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { BOX_SIZE_THRESHOLDS } from '@/lib/constants';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  printingTechnique?: string;
  hsnCode?: string;
  gstRate?: number;
  leadTimeDays?: number;
  priceTiers?: Array<{ tier: number; minQty: number; maxQty: number | null; sellPrice: number }>;
  images?: Array<{ url: string }>;
  categories?: Array<{ categoryId: string }>;
}

interface StepProps {
  allProducts: Product[];
  categories: Array<{ id: string; name: string }>;
}

export function Step1ChooseProducts({ allProducts, categories }: StepProps) {
  const {
    products: selected,
    addProduct,
    removeProduct,
    reorderProducts,
    getProductsSubtotal,
    packQuantity,
  } = useBuilderStore();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

    if (selectedCategory) {
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
  }, [allProducts, selectedCategory, searchQuery]);

  const productsSubtotal = getProductsSubtotal();

  const boxSize = useMemo(() => {
    const threshold = BOX_SIZE_THRESHOLDS.find(
      (t) => selected.length <= t.max
    );
    return threshold?.label || 'XL';
  }, [selected.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">STEP 01</p>
        <h2 className="text-4xl md:text-5xl font-black mt-2 leading-tight">Choose the craft.</h2>
        <p className="text-base text-ink-2 mt-3">
          Select products to include in your gift pack. Prices shown for <span className="font-semibold">{packQuantity} packs</span> (Tier {
            tiers.find((t) => packQuantity >= t.minQty && (t.maxQty === null || packQuantity <= t.maxQty))?.tier || 1
          }).
        </p>
      </div>

      {/* Main Layout: Catalog (left) + Your Pack (right, sticky) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left: Catalog */}
        <div className="space-y-6">
          {/* Category Pills (horizontal) */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition whitespace-nowrap border-2 ${
                  !selectedCategory
                    ? 'bg-navy-800 text-white border-navy-800'
                    : 'border-gray-300 text-ink hover:border-navy-800'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition whitespace-nowrap border-2 ${
                    selectedCategory === cat.id
                      ? 'bg-navy-800 text-white border-navy-800'
                      : 'border-gray-300 text-ink hover:border-navy-800'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search products by name, brand, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-md border-2 px-4 py-3 pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>

          {/* Product Grid */}
          <div className="rounded-md border-2 border-amber-300 bg-amber-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-4">
              Available Products
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const isSelected = selected.some((p) => p.id === product.id);
                const tierPrice = product.priceTiers?.[0]?.sellPrice || 0;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', bounce: 0.4 }}
                    onClick={() => {
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
                          quantity: 1,
                          sellPrice: tierPrice,
                          priceTiers: product.priceTiers,
                          images: product.images,
                        });
                      }
                    }}
                    className={`rounded-md border-2 overflow-hidden cursor-pointer transition ${
                      isSelected
                        ? 'border-amber-500 bg-white shadow-lg'
                        : 'border-gray-200 bg-white hover:shadow-md'
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
                        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                          <div className="bg-amber-500 text-white rounded-full p-2">
                            <span className="text-lg font-black">✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      {product.brand && (
                        <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide">
                          {product.brand}
                        </p>
                      )}
                      <h4 className="text-xs font-semibold leading-tight line-clamp-2 mt-2 text-ink">
                        {product.name}
                      </h4>
                      <p className="text-sm font-black tabnum text-amber-700 mt-3">
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
                              quantity: 1,
                              sellPrice: tierPrice,
                              priceTiers: product.priceTiers,
                              images: product.images,
                            });
                          }
                        }}
                        className={`w-full mt-3 rounded-md-p py-2 text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : 'border-2 border-amber-500 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {isSelected ? '✓ Added' : '+ Add'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-amber-700">No products found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Your Pack (sticky) */}
        <div className="lg:sticky lg:top-[140px] h-fit">
          <div className="rounded-md border-2 border-emerald-300 bg-emerald-50 p-6 shadow-md space-y-4">
            {/* Title with Step Badge */}
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-ink">Your Gift Pack</h3>
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">2</div>
            </div>

            {/* Icon Grid Box */}
            {selected.length > 0 ? (
              <>
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
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selected.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-md bg-white p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition"
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
                        <p className="text-xs font-semibold text-ink line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-sm font-black text-emerald-700 mt-0.5 tabnum">
                          {formatRupees(product.sellPrice)}
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

                {/* Subtotal */}
                <div className="border-t-2 border-emerald-200 pt-4">
                  <p className="text-xs text-emerald-600 mb-1">
                    <span className="font-semibold text-emerald-700">{selected.length}</span> {selected.length === 1 ? 'product' : 'products'} in pack
                  </p>
                  <p className="text-xs text-emerald-600 mb-3">
                    <span className="text-emerald-700 font-semibold">Before</span> packaging, shipping & GST
                  </p>
                  <p className="text-3xl font-black tabnum text-emerald-700">
                    {formatRupees(productsSubtotal)}
                  </p>
                  <p className="text-xs text-emerald-600 mt-2">/pack</p>
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
