'use client';

import { useBuilderStore } from '@/store/builder';
import { Step1ChooseProducts } from './step-1-choose-products';
import { Step2Customize } from './step-2-customize';
import { Step3Delivery } from './step-3-delivery';
import { Step4Review } from './step-4-review';

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
    description?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
  }>;
  addonOptions: Array<{ id: string; name: string; price: number }>;
}

export function BuilderContent({
  allProducts,
  categories,
  packagingOptions,
  addonOptions,
}: BuilderContentProps) {
  const { currentStep } = useBuilderStore();

  return (
    <>
      {currentStep === 1 && (
        <Step1ChooseProducts allProducts={allProducts} categories={categories} />
      )}
      {currentStep === 2 && (
        <Step2Customize
          packagingOptions={packagingOptions}
          addonOptions={addonOptions}
          products={allProducts}
        />
      )}
      {currentStep === 3 && <Step3Delivery />}
      {currentStep === 4 && <Step4Review />}
    </>
  );
}
