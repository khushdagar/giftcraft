'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBuilderStore } from '@/store/builder';
import { X } from 'lucide-react';
import { Step1ChooseProducts } from './step-1-choose-products';
import { Step2Customize } from './step-2-customize';
import { Step3Delivery } from './step-3-delivery';
import { Step4Review } from './step-4-review';
import { GiftPackSummary } from './gift-pack-summary';

interface BuilderContentProps {
  allProducts: Array<{
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
  }>;
  categories: Array<{ id: string; name: string }>;
  packagingOptions: Array<{
    id: string;
    name: string;
    slug: string;
    price: number;
    sizePrices?: Record<string, number> | null;
    description?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
  }>;
  addonOptions: Array<{
    id: string;
    name: string;
    price: number;
    description?: string | null;
    imageUrl?: string | null;
  }>;
}

export function BuilderContent({
  allProducts,
  categories,
  packagingOptions,
  addonOptions,
}: BuilderContentProps) {
  const { currentStep, products, packQuantity, addProduct, setPackQuantity, clearAll, setCurrentStep } = useBuilderStore();
  const searchParams = useSearchParams();
  const processedRef = useRef(false);
  const presetRef = useRef(false);
  const packRef = useRef(false);

  // Moving to a new step should start the user at the TOP of that step, not
  // wherever they were scrolled to on the previous one.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [currentStep]);

  // Budget Planner hand-off: /builder?preset=id1,id2&qty=N opens the builder
  // showing exactly the recommended picks (Step 1 filters to them) at the chosen
  // quantity, instead of the full catalogue.
  const presetIds = (searchParams.get('preset') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  useEffect(() => {
    if (presetRef.current) return;
    if (presetIds.length === 0) return;
    presetRef.current = true;

    const qtyParam = searchParams.get('qty');
    const qty = qtyParam ? Math.max(1, parseInt(qtyParam, 10) || 1) : 1;

    // Fresh start from the planner — clear any lingering pack, then set quantity.
    clearAll();
    setCurrentStep(1);
    setPackQuantity(qty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Curated-pack hand-off: /builder?pack=id1,id2,id3&qty=N loads a ready-made
  // pack — clears any current pack, sets the quantity, and pre-adds every
  // product in the pack (priced at that quantity) so the user lands on Step 1
  // with the assortment already built, ready to brand + customise.
  const packProductIds = (searchParams.get('pack') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  useEffect(() => {
    if (packRef.current) return;
    if (packProductIds.length === 0) return;
    packRef.current = true;

    const qtyParam = searchParams.get('qty');
    const qty = qtyParam ? Math.max(1, parseInt(qtyParam, 10) || 1) : 25;

    clearAll();
    setCurrentStep(1);
    setPackQuantity(qty);

    packProductIds.forEach((id) => {
      const found = allProducts.find((p) => p.id === id);
      if (!found) return;
      const tier =
        found.priceTiers?.find(
          (t) => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty)
        ) || found.priceTiers?.[0];
      addProduct({
        id: found.id,
        name: found.name,
        slug: found.slug,
        brand: found.brand,
        printingTechnique: found.printingTechnique,
        hsnCode: found.hsnCode,
        gstRate: found.gstRate,
        leadTimeDays: found.leadTimeDays,
        weightG: found.weightG,
        dimensionL: (found as any).dimensionL ?? (found as any).lengthCm,
        dimensionW: (found as any).dimensionW ?? (found as any).widthCm,
        dimensionH: (found as any).dimensionH ?? (found as any).heightCm,
        quantity: 1, // one unit per pack; qty drives packQuantity (set above)
        sellPrice: tier?.sellPrice || 0,
        priceTiers: found.priceTiers,
        images: found.images,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  // Inline notice shown when a product is added at the pack's shared quantity
  // (instead of the quantity the user picked on the product page).
  const [quantityNotice, setQuantityNotice] = useState<string | null>(null);

  // Carry over a product + the quantity selected on the product detail page.
  // e.g. /builder?product=<id>&qty=35
  useEffect(() => {
    if (processedRef.current) return;

    const productId = searchParams.get('product');
    if (!productId) return;

    const found = allProducts.find((p) => p.id === productId);
    if (!found) return;

    processedRef.current = true;

    const qtyParam = searchParams.get('qty');
    const requestedQty = qtyParam ? Math.max(1, parseInt(qtyParam, 10) || 1) : 1;

    // A pack shares ONE quantity across every product. Only the FIRST product
    // (empty pack) sets that quantity; later products inherit it so the pack can
    // never end up with mixed quantities. If the user picked a different number
    // on the product page, keep the pack's quantity and explain why.
    const packIsEmpty = products.length === 0;
    const effectiveQty = packIsEmpty ? requestedQty : packQuantity;

    if (packIsEmpty) {
      // Keep tier pricing in sync with the chosen quantity
      setPackQuantity(requestedQty);
    } else if (requestedQty !== packQuantity) {
      setQuantityNotice(
        `"${found.name}" was added at ${packQuantity} units to match the rest of your pack.`
      );
    }

    // Add the product, priced at the pack's effective quantity
    const alreadyInPack = products.some((p) => p.id === productId);
    if (!alreadyInPack) {
      const tier =
        found.priceTiers?.find(
          (t) => effectiveQty >= t.minQty && (t.maxQty === null || effectiveQty <= t.maxQty)
        ) || found.priceTiers?.[0];
      addProduct({
        id: found.id,
        name: found.name,
        slug: found.slug,
        brand: found.brand,
        printingTechnique: found.printingTechnique,
        hsnCode: found.hsnCode,
        gstRate: found.gstRate,
        leadTimeDays: found.leadTimeDays,
        weightG: found.weightG,
        dimensionL: (found as any).dimensionL ?? (found as any).lengthCm,
        dimensionW: (found as any).dimensionW ?? (found as any).widthCm,
        dimensionH: (found as any).dimensionH ?? (found as any).heightCm,
        quantity: 1, // one unit per pack; qty drives packQuantity (set above)
        sellPrice: tier?.sellPrice || 0,
        priceTiers: found.priceTiers,
        images: found.images,
      });
    }
  }, [searchParams, allProducts, products, packQuantity, addProduct, setPackQuantity]);

  return (
    <>
      {/* Shared-quantity notice — stays until dismissed so it's easy to read */}
      {quantityNotice && currentStep === 1 && (
        <div className="mb-5 flex items-start gap-3 rounded-md border-2 border-gold-200 bg-gold-50 px-4 py-3.5">
          <span className="mt-0.5 text-lg leading-none text-gold-700">ⓘ</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gold-700">
              All products in a pack share the same quantity
            </p>
            <p className="mt-1 text-sm text-gold-700/80">
              {quantityNotice} You can change the quantity for the whole pack
              anytime using the units selector in your gift pack.
            </p>
          </div>
          <button
            onClick={() => setQuantityNotice(null)}
            className="flex-shrink-0 text-gold-700/60 transition hover:text-gold-700"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 1 renders its own two-column layout (catalogue + gift pack). */}
      {currentStep === 1 && (
        <Step1ChooseProducts allProducts={allProducts} categories={categories} presetIds={presetIds} />
      )}

      {/* Steps 2–4 share the same layout: step content on the left, the running
          "Your Gift Pack" summary sticky on the right so the user always sees
          what they're building. */}
      {currentStep > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-6 items-start">
          <div className="min-w-0">
            {currentStep === 2 && (
              <Step2Customize
                packagingOptions={packagingOptions}
                addonOptions={addonOptions}
                products={allProducts}
              />
            )}
            {currentStep === 3 && <Step3Delivery />}
            {currentStep === 4 && <Step4Review />}
          </div>
          <GiftPackSummary />
        </div>
      )}
    </>
  );
}
