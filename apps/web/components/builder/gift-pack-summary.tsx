'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { X, Plus, Minus } from 'lucide-react';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { BOX_SIZE_THRESHOLDS } from '@/lib/constants';

/**
 * "Your Gift Pack" summary panel — the running snapshot of the pack the user is
 * building (units, box size, selected products, running subtotal). Shown as the
 * sticky right-hand column on every builder step so the user always sees what
 * they're assembling. Reads everything from the builder store, so it needs no
 * props.
 */
export function GiftPackSummary() {
  const {
    products: selected,
    removeProduct,
    getProductsSubtotal,
    packQuantity,
    setPackQuantity,
  } = useBuilderStore();

  const productsSubtotal = getProductsSubtotal();
  // Price of one gift pack (one of each selected product)
  const perPackPrice = selected.reduce((sum, p) => sum + p.sellPrice, 0);

  const boxSize = useMemo(() => {
    const threshold = BOX_SIZE_THRESHOLDS.find((t) => selected.length <= t.max);
    return threshold?.label || 'XL';
  }, [selected.length]);

  return (
    <div className="min-w-0 lg:sticky lg:top-[140px] h-fit lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-1">
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
  );
}
