'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PricingBlock } from './pricing-block';
import { ColorSelector } from './color-selector';
import { SizeSelector } from './size-selector';
import { ExpertHelp } from './expert-help';
import { AddonsSelector } from './addons-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveSwatchHex } from '@/lib/color-name';

interface ProductInfoSectionProps {
  product: any;
  serialized: any;
  gstRate: number;
  moq: number;
  categoryName: string;
  variants?: any[];
}

export function ProductInfoSection({
  product,
  serialized,
  gstRate,
  moq,
  categoryName,
  variants,
}: ProductInfoSectionProps) {
  const [currentQty, setCurrentQty] = useState(moq);
  const isUnderMinimum = currentQty < moq;

  return (
    <div>
      <p className="mb-2 text-xs text-ink-3">{product.brand ? `${product.brand} · ` : ""}{categoryName}</p>
      <h1 className="font-serif text-4xl font-light tracking-tight text-ink">{product.name}</h1>
      <p className="mt-4 text-base leading-relaxed text-ink-2">
        {product.descriptionShort || product.descriptionLong}
      </p>

      {/* Badges */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {product.printingTechnique !== "none" && product.printingTechnique && (
          <Badge className="rounded-full bg-em/10 text-em text-xs font-medium px-3 py-1">
            🎨 {product.printingTechnique}
          </Badge>
        )}
        {product.isEcoCertified && (
          <Badge className="rounded-full bg-em/10 text-em text-xs font-medium px-3 py-1">
            🍃 BPA-Free · Recyclable Steel
          </Badge>
        )}
        <Badge className="rounded-full bg-em/10 text-em text-xs font-medium px-3 py-1">
          Min {moq} units
        </Badge>
      </div>

      {/* Customization note */}
      {product.printingTechnique && product.printingTechnique !== "none" && (
        <p className="mt-4 text-xs italic text-ink-2">
          This product uses <span className="font-semibold">{product.printingTechnique}</span> for logo customisation. Cost included in price.{' '}
          <Link href={`/builder?product=${product.id}`} className="text-em hover:underline">
            Want a different technique? Add a note in the gift builder.
          </Link>
        </p>
      )}

      {/* Color selector */}
      {(() => {
        const colorVariants = variants?.filter((v: any) => v.kind === 'color') || [];
        const hasColorVariants = colorVariants.length > 0;

        return (
          <ColorSelector
            options={
              hasColorVariants
                ? colorVariants.map((v: any) => ({
                    name: v.value,
                    // Auto-derive the swatch colour from the variant name when
                    // no hex was saved (e.g. "Navy" -> navy, "White" -> white).
                    hex: resolveSwatchHex(v.value, v.hexColor),
                  }))
                : undefined
            }
            isDynamic={!hasColorVariants}
          />
        );
      })()}

      {/* Size selector */}
      {(() => {
        const sizeVariants = variants?.filter((v: any) => v.kind === 'size') || [];
        return (
          <SizeSelector
            options={
              sizeVariants.length > 0
                ? sizeVariants.map((v: any) => ({
                    name: v.value,
                  }))
                : undefined
            }
          />
        );
      })()}

      {/* Pricing - with qty tracking */}
      <PricingBlock
        priceTiers={serialized.priceTiers || []}
        gstRate={gstRate}
        hsnCode={product.hsn?.hsn?.code}
        printingTechnique={product.printingTechnique}
        moq={moq}
        onQtyChange={setCurrentQty}
      />

      {/* CTAs — inline (desktop). On mobile these live in a sticky bottom bar below. */}
      <div className="mt-6 hidden gap-3 lg:flex">
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
          <Link href={`/builder?product=${product.id}&qty=${currentQty}`}>Add to Gift Builder</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="flex-1 whitespace-nowrap rounded-full border border-bdr px-3 py-3 text-sm sm:text-base font-semibold"
          size="lg"
        >
          <Link href="/catalog">Get Quick Quote</Link>
        </Button>
      </div>

      {/* Expert help */}
      <ExpertHelp productName={product.name} productId={product.id} />

      {/* Addons */}
      <div className="mt-8">
        <AddonsSelector productId={product.id} />
      </div>

      {/* Sticky CTA bar — mobile only. Stays visible while scrolling the
          product page so the primary actions are always one tap away. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t border-bdr bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden"
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
          <Link href={`/builder?product=${product.id}&qty=${currentQty}`}>Add to Gift Builder</Link>
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
