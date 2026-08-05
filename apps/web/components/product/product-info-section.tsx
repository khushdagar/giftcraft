'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PricingBlock } from './pricing-block';
import { ColorSelector } from './color-selector';
import { SizeSelector } from './size-selector';
import { ExpertHelp } from './expert-help';
import { AddonsSelector } from './addons-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveSwatchHex } from '@/lib/color-name';
import { stripHtml } from '@/lib/strip-html';

interface ProductInfoSectionProps {
  product: any;
  serialized: any;
  gstRate: number;
  moq: number;
  categoryName: string;
  variants?: any[];
  isPack?: boolean;
  packProductIds?: string[];
}

export function ProductInfoSection({
  product,
  serialized,
  gstRate,
  moq,
  categoryName,
  variants,
  isPack = false,
  packProductIds = [],
}: ProductInfoSectionProps) {
  const [currentQty, setCurrentQty] = useState(moq);
  const isUnderMinimum = currentQty < moq;

  // Real variants only. ColorSelector falls back to placeholder swatches when a
  // product has none — those must never be recorded as an ordered variant.
  const colorVariants = (!isPack && variants?.filter((v: any) => v.kind === 'color')) || [];
  const sizeVariants = (!isPack && variants?.filter((v: any) => v.kind === 'size')) || [];

  // The pickers below default to their first option, so seed the same defaults
  // here — otherwise "Add to Pack" without touching them would carry nothing.
  const [selectedColor, setSelectedColor] = useState<string>(colorVariants[0]?.value ?? '');
  const [selectedSize, setSelectedSize] = useState<string>(sizeVariants[0]?.value ?? '');

  // Hand the chosen colour/size to the builder. Previously these selections were
  // local to the pickers and thrown away, so orders never recorded a variant.
  const variantParams = new URLSearchParams();
  if (selectedColor) variantParams.set('color', selectedColor);
  if (selectedSize) variantParams.set('size', selectedSize);
  const variantQuery = variantParams.toString() ? `&${variantParams}` : '';

  // A pack loads all its member products into the builder at once; a normal
  // product loads just itself.
  const builderHref = isPack
    ? `/builder?pack=${encodeURIComponent(packProductIds.join(','))}&qty=${currentQty}`
    : `/builder?product=${product.id}&qty=${currentQty}${variantQuery}`;

  // Mobile sticky CTA bar: hidden on load, slides in once the user has scrolled
  // past ~20% of the viewport height.
  const [showStickyBar, setShowStickyBar] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > window.innerHeight * 0.2);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div>
      <p className="mb-2 text-xs text-ink-3">{product.brand ? `${product.brand} · ` : ""}</p>
      <h1 className="font-serif text-4xl font-light tracking-tight text-ink">{product.name}</h1>
      <p className="mt-4 text-base leading-relaxed text-ink-2">
        {product.descriptionShort || stripHtml(product.descriptionLong)}
      </p>

      {/* Badges */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {product.printingTechnique !== "none" && product.printingTechnique && (
          <Badge className="rounded-full bg-em/10 text-em text-xs font-medium px-3 py-1">
            {product.printingTechnique}
          </Badge>
        )}
        {product.isEcoCertified && (
          <Badge className="rounded-full bg-em/10 text-em text-xs font-medium px-3 py-1">
            BPA-Free · Recyclable Steel
          </Badge>
        )}
        <Badge className="rounded-full bg-em/10 text-em text-xs font-medium px-3 py-1">
          Min {moq} units
        </Badge>
      </div>

      {/* Customization note */}
      {/* {!isPack && product.printingTechnique && product.printingTechnique !== "none" && (
        <p className="mt-4 text-xs italic text-ink-2">
          This product uses <span className="font-semibold">{product.printingTechnique}</span> for logo customisation. Cost included in price.{' '}
          <Link href={`/builder?product=${product.id}`} className="text-em hover:underline">
            Want a different technique? Add a note in the gift builder.
          </Link>
        </p>
      )} */}

      {/* Color selector (hidden for packs — colours live on the member products) */}
      {!isPack && (
        <ColorSelector
          options={
            colorVariants.length > 0
              ? colorVariants.map((v: any) => ({
                  name: v.value,
                  // Auto-derive the swatch colour from the variant name when
                  // no hex was saved (e.g. "Navy" -> navy, "White" -> white).
                  hex: resolveSwatchHex(v.value, v.hexColor),
                  imageUrl: v.imageUrl || undefined,
                }))
              : undefined
          }
          isDynamic={colorVariants.length === 0}
          onSelect={(c) => setSelectedColor(colorVariants.length > 0 ? c.name : '')}
        />
      )}

      {/* Size selector (hidden for packs) */}
      {!isPack && (
        <SizeSelector
          options={
            sizeVariants.length > 0
              ? sizeVariants.map((v: any) => ({ name: v.value }))
              : undefined
          }
          onSelect={setSelectedSize}
        />
      )}

      {/* Pricing - with qty tracking */}
      <PricingBlock
        priceTiers={serialized.priceTiers || []}
        gstRate={gstRate}
        hsnCode={product.hsn?.hsn?.code}
        printingTechnique={product.printingTechnique}
        moq={moq}
        onQtyChange={setCurrentQty}
      />

      {/* CTAs — inline, shown on all sizes. On mobile these ALSO appear in the
          sticky bottom bar below (so they're visible in both places). */}
      <div className="mt-6 flex gap-3">
        <Button
          asChild
          disabled={isUnderMinimum}
          className={`flex-1 whitespace-nowrap rounded-full px-3 py-3 text-white text-sm sm:text-base font-semibold ${
            isUnderMinimum
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-em hover:bg-em/90'
          }`}
          size="lg"
        >
          <Link href={builderHref}>Add to Pack</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="flex-1 whitespace-nowrap rounded-full border border-bdr px-3 py-3 text-sm sm:text-base font-semibold"
          size="lg"
        >
          <Link href="/box">Go to Box Planner</Link>
        </Button>
      </div>

      {/* Expert help */}
      <ExpertHelp productName={product.name} productId={product.id} />

      <div
        className={`fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t border-bdr bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur transition-transform duration-300 lg:hidden ${
          showStickyBar ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <Button
          asChild
          disabled={isUnderMinimum}
          className={`flex-1 whitespace-nowrap rounded-full px-3 py-3 text-sm font-semibold text-white ${
            isUnderMinimum ? "bg-gray-400 cursor-not-allowed" : "bg-em hover:bg-em/90"
          }`}
          size="lg"
        >
          <Link href={builderHref}>Add to Gift Builder</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="flex-1 whitespace-nowrap rounded-full border border-bdr bg-white px-3 py-3 text-sm font-semibold"
          size="lg"
        >
          <Link href="/catalog">Get Quick Quote</Link>
        </Button>
      </div>
    </div>
  );
}
