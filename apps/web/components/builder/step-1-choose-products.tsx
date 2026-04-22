'use client';

import { useState, useRef } from 'react';
import { motion, Reorder } from 'framer-motion';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  priceTiers?: Array<{ tier: number; minQty: number; maxQty: number | null; sellPrice: number }>;
  images?: Array<{ url: string }>;
}

interface StepProps {
  allProducts: Product[];
  categories: Array<{ id: string; name: string }>;
}

export function Step1ChooseProducts({ allProducts, categories }: StepProps) {
  const { products: selected, addProduct, removeProduct, reorderProducts, getProductsSubtotal, packQuantity } = useBuilderStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredProducts = selectedCategory
    ? allProducts // TODO: filter by category once relationship is available
    : allProducts;

  const productsSubtotal = getProductsSubtotal();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="overline text-ink-3">STEP 01</p>
        <h2 className="text-3xl font-black mt-1">Choose Products</h2>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
        {/* Left: Category Filter */}
        <div className="space-y-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full rounded-gc-p px-3 py-2 text-xs font-semibold transition ${
              !selectedCategory
                ? 'bg-dark text-inv'
                : 'border border-bdr text-ink hover:border-em'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full rounded-gc-p px-3 py-2 text-xs font-semibold transition ${
                selectedCategory === cat.id
                  ? 'bg-dark text-inv'
                  : 'border border-bdr text-ink hover:border-em'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Right: Product Grid */}
        <div className="space-y-6">
          {/* Available Products */}
          <div className="rounded-gc-l border-2 border-em-300 bg-gradient-to-br from-em-50/50 to-em-100/30 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-em-700 mb-4">
              Available Products
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const isSelected = selected.some((p) => p.id === product.id);
                const tierPrice = product.priceTiers?.[0]?.sellPrice || 0;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', bounce: 0.4 }}
                    className={`rounded-gc-l border-2 overflow-hidden cursor-pointer transition ${
                      isSelected ? 'border-em-500 bg-white shadow-lg' : 'border-bdr bg-white hover:shadow-md'
                    }`}
                  >
                    <div className="relative aspect-square bg-elevated overflow-hidden group">
                      {product.images?.[0]?.url ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-3xl opacity-60">📦</div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-em/20 flex items-center justify-center">
                          <div className="bg-em text-inv rounded-full p-2">
                            <Plus className="h-6 w-6" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-[11px] text-ink-3">{product.brand || 'Brand'}</p>
                      <h4 className="text-xs font-semibold leading-tight line-clamp-2 mt-1">
                        {product.name}
                      </h4>
                      <p className="text-xs font-black tabnum text-em-700 mt-2">
                        {formatRupees(tierPrice)}
                      </p>
                      <button
                        onClick={() => {
                          if (isSelected) {
                            removeProduct(product.id);
                          } else {
                            addProduct({
                              id: product.id,
                              name: product.name,
                              slug: product.slug,
                              quantity: 1,
                              sellPrice: tierPrice,
                              priceTiers: product.priceTiers,
                            });
                          }
                        }}
                        className={`w-full mt-2 rounded-gc-p py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-em text-inv'
                            : 'border border-em text-em hover:bg-em-50'
                        }`}
                      >
                        {isSelected ? '✓ Added' : 'Add'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Selected Products */}
          {selected.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                Your Pack ({selected.length} {selected.length === 1 ? 'item' : 'items'})
              </p>
              <Reorder.Group
                axis="y"
                values={selected.map((p) => p.id)}
                onReorder={(order) => reorderProducts(order)}
                className="space-y-3"
              >
                {selected.map((product, idx) => (
                  <Reorder.Item
                    key={product.id}
                    value={product.id}
                    className="rounded-gc-l border-2 border-bdr bg-white p-4 shadow-card hover:shadow-hover transition"
                  >
                    <div className="flex items-center gap-4">
                      {/* Box Size Badge */}
                      <div className="rounded-full h-12 w-12 bg-dark text-white flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-black">{idx + 1}</span>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-ink">{product.name}</h4>
                        <p className="text-xs text-ink-3 mt-1">{product.brand}</p>
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-ink-2">×{product.quantity}</p>
                        <p className="text-sm font-black tabnum">{formatRupees(product.sellPrice * product.quantity)}</p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="text-ink-3 hover:text-red-600 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          )}
        </div>
      </div>

      {/* Subtotal Block */}
      {selected.length > 0 && (
        <div className="rounded-gc-l bg-amber-50 border border-amber-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-700 font-semibold">Selected {selected.length} items</p>
              <p className="text-xs text-amber-600 mt-1">×{packQuantity} packs</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-amber-700">Subtotal (items)</p>
              <p className="text-2xl font-black tabnum text-amber-700 mt-1">
                {formatRupees(productsSubtotal)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
