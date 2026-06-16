'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBuilderStore } from '@/store/builder';

/**
 * Resets builder state on fresh entry (when product param exists or on page load from external source)
 * Allows users to start a new gift pack without old selections lingering
 */
export function BuilderReset() {
  const searchParams = useSearchParams();
  const clearAll = useBuilderStore((state) => state.clearAll);
  const setCurrentStep = useBuilderStore((state) => state.setCurrentStep);
  const products = useBuilderStore((state) => state.products);

  useEffect(() => {
    // Check if we're entering builder fresh from product detail page
    const productParam = searchParams.get('product');

    if (productParam) {
      // Only reset if no products have been added yet (true fresh start from product detail)
      // If products exist, they were just added from catalog "Add to Pack", so preserve them
      if (products.length === 0) {
        // Clear persisted localStorage state for fresh start
        try {
          localStorage.removeItem('giftcraft-builder');
        } catch (e) {
          // Ignore errors
        }

        // Clear all builder state and reset to step 1
        clearAll();
        setCurrentStep(1);
      }
    }
  }, [searchParams, products.length, clearAll, setCurrentStep]);

  return null;
}
