'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBuilderStore } from '@/store/builder';
import { resolveChosenVariants } from '@/lib/variants';
import { X } from 'lucide-react';
import { Step1ChooseProducts } from './step-1-choose-products';
import { Step2Customize } from './step-2-customize';
import { Step3Delivery } from './step-3-delivery';
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

type CatalogueProduct = BuilderContentProps['allProducts'][number] & Record<string, any>;

/**
 * Find the product behind an id from a `?product=`/`?pack=` link.
 *
 * The pre-loaded catalogue must NOT be assumed to hold every product: the
 * products API caps how many rows one request returns and hides some
 * categories. A product missing from it used to make "Add to Pack" a silent
 * no-op — the user landed on the builder with an empty pack and no explanation
 * — so fall back to fetching that single product by id.
 */
async function resolveProduct(
  id: string,
  catalogue: CatalogueProduct[]
): Promise<CatalogueProduct | null> {
  const local = catalogue.find((p) => p.id === id);
  if (local) return local;
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.product ?? null;
  } catch {
    return null;
  }
}

/**
 * Decode the per-member variant picks a curated pack page hands over:
 *   ?pv=<productId>~<kind>~<value>|<productId>~<kind>~<value>
 * Every field is individually encoded, so values containing "~" or "|" survive.
 * Returns productId -> the kinds chosen for it. Malformed entries are skipped
 * rather than thrown — a bad share link should still load the pack.
 */
function parsePackVariants(raw: string | null) {
  const picks = new Map<string, Array<{ kind: string; value: string }>>();
  if (!raw) return picks;
  for (const entry of raw.split('|')) {
    const parts = entry.split('~');
    if (parts.length !== 3) continue;
    let decoded: string[];
    try {
      decoded = parts.map(decodeURIComponent);
    } catch {
      continue;
    }
    const [id, kind, value] = decoded;
    if (!id || !kind || !value) continue;
    picks.set(id, [...(picks.get(id) ?? []), { kind, value }]);
  }
  return picks;
}

/** Map a catalogue product onto a pack line, priced at the pack's quantity. */
function toBuilderProduct(
  p: CatalogueProduct,
  qty: number,
  variants?: Array<{ kind: string; value: string; hex?: string | null }>
) {
  const tier =
    p.priceTiers?.find((t) => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty)) ||
    p.priceTiers?.[0];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    printingTechnique: p.printingTechnique,
    hsnCode: p.hsnCode,
    gstRate: p.gstRate,
    leadTimeDays: p.leadTimeDays,
    weightG: p.weightG,
    dimensionL: p.dimensionL ?? p.lengthCm,
    dimensionW: p.dimensionW ?? p.widthCm,
    dimensionH: p.dimensionH ?? p.heightCm,
    quantity: 1, // one unit per pack; qty drives packQuantity
    sellPrice: tier?.sellPrice || 0,
    moq: p.moq,
    priceTiers: p.priceTiers,
    images: p.images,
    variants: variants?.length ? variants : undefined,
  };
}

export function BuilderContent({
  allProducts,
  categories,
  packagingOptions,
  addonOptions,
}: BuilderContentProps) {
  // The URL hand-off effects below read products/packQuantity live via
  // getState() (they resolve asynchronously), so they are not subscribed here.
  const { currentStep, addProduct, setPackQuantity, clearAll, setCurrentStep } = useBuilderStore();
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

    // A member missing from the pre-loaded catalogue is resolved over the
    // network rather than dropped — a curated pack that quietly loses an item
    // is worse than a slow one.
    // Deliberately NOT cancelled on cleanup: under StrictMode the effect is
    // mounted, torn down and re-run, and the re-run stops at packRef — so
    // cancelling here would throw away the only pass that does the work.
    // packRef already prevents duplicates, and addProduct ignores repeats.
    // Colour/size the user picked per member on the pack page.
    const picks = parsePackVariants(searchParams.get('pv'));

    (async () => {
      for (const id of packProductIds) {
        const found = await resolveProduct(id, allProducts);
        if (!found) continue;
        // Resolve against the product's real variants: the user's picks win,
        // and any kind the pack page didn't ask about falls back to its default
        // so the order still records a complete spec.
        addProduct(
          toBuilderProduct(
            found,
            qty,
            resolveChosenVariants((found as any).variants, picks.get(id) ?? [])
          )
        );
      }
    })();
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

    processedRef.current = true;

    const qtyParam = searchParams.get('qty');
    const requestedQty = qtyParam ? Math.max(1, parseInt(qtyParam, 10) || 1) : 1;

    // Not cancelled on cleanup — see the note in the curated-pack effect above.
    (async () => {
      const found = await resolveProduct(productId, allProducts);
      if (!found) return;

      // Resolving may have gone to the network, so read the pack LIVE rather
      // than from this effect's closure — <BuilderReset/> and the user could
      // both have changed it in the meantime.
      const { products: pack, packQuantity: packQty } = useBuilderStore.getState();

      // A pack shares ONE quantity across every product. Only the FIRST product
      // (empty pack) sets that quantity; later products inherit it so the pack can
      // never end up with mixed quantities. If the user picked a different number
      // on the product page, keep the pack's quantity and explain why.
      const packIsEmpty = pack.length === 0;
      const effectiveQty = packIsEmpty ? requestedQty : packQty;

      if (packIsEmpty) {
        // Keep tier pricing in sync with the chosen quantity
        setPackQuantity(requestedQty);
      } else if (requestedQty !== packQty) {
        setQuantityNotice(
          `"${found.name}" was added at ${packQty} units to match the rest of your pack.`
        );
      }

      // Carry the colour/size chosen on the product detail page (or on a catalog
      // card, which only passes a colour). Kinds the link didn't specify fall
      // back to the product's defaults, so nothing reaches the order half-blank.
      const chosenVariants = resolveChosenVariants(
        (found as any).variants,
        (['color', 'size'] as const).flatMap((kind) => {
          const value = searchParams.get(kind);
          return value ? [{ kind, value }] : [];
        })
      );

      // Add the product, priced at the pack's effective quantity
      if (!pack.some((p) => p.id === productId)) {
        addProduct(toBuilderProduct(found, effectiveQty, chosenVariants));
      }
    })();
  }, [searchParams, allProducts, addProduct, setPackQuantity]);

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
          </div>
          <GiftPackSummary />
        </div>
      )}
    </>
  );
}
