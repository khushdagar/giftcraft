'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';

interface PriceTier {
  tier: number;
  minQty: number;
  maxQty: number | null;
  sellPrice: number;
}

interface Variant {
  id: string;
  kind: string;
  value: string;
  hexColor?: string | null;
}

interface QuickViewProduct {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  images?: Array<{ url: string }>;
}

interface ProductQuickViewProps {
  product: QuickViewProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductQuickView({ product, open, onOpenChange }: ProductQuickViewProps) {
  const {
    products: selected,
    addProduct,
    removeProduct,
    packQuantity,
    setPackQuantity,
  } = useBuilderStore();

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  // Fetch full product details (all tiers + variants) when modal opens
  const { data, isLoading } = useQuery({
    queryKey: ['product-detail', product?.slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/${product!.slug}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      return res.json();
    },
    enabled: open && !!product?.slug,
  });

  const fullProduct = data?.product;
  const tiers: PriceTier[] = useMemo(
    () => (fullProduct?.priceTiers || []).slice().sort((a: PriceTier, b: PriceTier) => a.tier - b.tier),
    [fullProduct]
  );
  const variants: Variant[] = fullProduct?.variants || [];

  // Group variants by kind (color, size, ...)
  const variantGroups = useMemo(() => {
    const groups: Record<string, Variant[]> = {};
    variants.forEach((v) => {
      (groups[v.kind] ??= []).push(v);
    });
    return groups;
  }, [variants]);

  // Default-select the first variant once loaded
  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) {
      setSelectedVariant(variants[0] ?? null);
    }
  }, [variants, selectedVariant]);

  // Reset selected variant when modal closes
  useEffect(() => {
    if (!open) setSelectedVariant(null);
  }, [open]);

  // The tier the current pack quantity falls into
  const activeTier = useMemo(
    () =>
      tiers.find(
        (t) => packQuantity >= t.minQty && (t.maxQty === null || packQuantity <= t.maxQty)
      ) || tiers[0],
    [tiers, packQuantity]
  );

  const unitPrice = activeTier?.sellPrice || 0;
  const isInPack = product ? selected.some((p) => p.id === product.id) : false;

  const handleAddToPack = () => {
    if (!product || !fullProduct) return;
    // Replace semantics: clear any existing entry, then add fresh
    removeProduct(product.id);
    addProduct({
      id: fullProduct.id,
      name: fullProduct.name,
      slug: fullProduct.slug,
      brand: fullProduct.brand,
      printingTechnique: fullProduct.printingTechnique,
      hsnCode: fullProduct.hsn?.hsn?.code,
      gstRate: fullProduct.hsn?.gstRate,
      leadTimeDays: fullProduct.leadTimeDays,
      weightG: fullProduct.weightG,
      dimensionL: (fullProduct as any).dimensionL ?? (fullProduct as any).lengthCm,
      dimensionW: (fullProduct as any).dimensionW ?? (fullProduct as any).widthCm,
      dimensionH: (fullProduct as any).dimensionH ?? (fullProduct as any).heightCm,
      quantity: 1, // one unit of this product per pack
      sellPrice: unitPrice,
      moq: (fullProduct as any).moq,
      priceTiers: tiers,
      images: fullProduct.images,
      variantValue: selectedVariant?.value,
      variantKind: selectedVariant?.kind,
      variantHex: selectedVariant?.hexColor,
    });
    onOpenChange(false);
  };

  if (!product) return null;

  const primaryImage = (fullProduct?.images || product.images)?.[0]?.url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr]">
          {/* Left: Image */}
          <div className="relative aspect-square sm:aspect-auto bg-gray-50 min-h-[200px]">
            {primaryImage ? (
              <Image src={primaryImage} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-6xl opacity-50">📦</div>
            )}
          </div>

          {/* Right: Details */}
          <div className="p-5 md:p-6 space-y-4">
            {product.brand && (
              <p className="text-[10px] uppercase font-semibold tracking-wide text-ink-3">
                {product.brand}
              </p>
            )}
            <h3 className="text-xl font-serif leading-tight text-ink">{product.name}</h3>

            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 w-24 bg-elevated rounded" />
                <div className="h-20 bg-elevated rounded" />
                <div className="h-10 bg-elevated rounded" />
              </div>
            ) : (
              <>
                {/* Price Tiers */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">
                    Price Tiers — click to select pack quantity
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {tiers.map((t) => {
                      const isActive = activeTier?.tier === t.tier;
                      const basePrice = tiers[0]?.sellPrice || t.sellPrice;
                      const savePct =
                        t.tier === 1 ? 0 : Math.round((1 - t.sellPrice / basePrice) * 100);
                      return (
                        <button
                          key={t.tier}
                          onClick={() => setPackQuantity(t.minQty)}
                          className={`rounded-md border-2 p-2 text-center transition ${
                            isActive
                              ? 'border-em bg-em-50'
                              : 'border-bdr bg-white hover:border-em'
                          }`}
                        >
                          <p className="text-[10px] text-ink-3">
                            {t.minQty}{t.maxQty ? `–${t.maxQty}` : '+'}
                          </p>
                          <p className="text-sm font-black tabnum text-ink">
                            {formatRupees(t.sellPrice)}
                          </p>
                          {savePct > 0 && (
                            <p className="text-[10px] font-semibold text-em">Save {savePct}%</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-ink-3 mt-2 italic">
                    Pricing tier is based on your pack quantity ({packQuantity} packs).
                  </p>
                </div>

                {/* Variants */}
                {Object.entries(variantGroups).map(([kind, items]) => (
                  <div key={kind}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">
                      {kind}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {items.map((v) => {
                        const isSel = selectedVariant?.id === v.id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVariant(v)}
                            className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition ${
                              isSel ? 'border-em bg-em-50 text-em' : 'border-bdr text-ink-2 hover:border-em'
                            }`}
                          >
                            {v.hexColor && (
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/10"
                                style={{ backgroundColor: v.hexColor }}
                              />
                            )}
                            {v.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Total + Add */}
                <div className="border-t-2 border-bdr pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-ink-3">Unit price</p>
                    <p className="text-2xl font-black tabnum text-em">{formatRupees(unitPrice)}</p>
                  </div>
                  <button
                    onClick={handleAddToPack}
                    className="rounded-full bg-em text-white px-6 py-3 text-sm font-bold hover:bg-em-600 transition"
                  >
                    {isInPack ? '✓ Update Pack' : 'Add to Pack'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
