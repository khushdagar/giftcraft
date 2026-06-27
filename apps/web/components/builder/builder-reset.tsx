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

  useEffect(() => {
    // Check if we're entering builder fresh from product detail page
    const productParam = searchParams.get('product');

    if (productParam) {
      // Read LIVE state (not a stale closure) so we don't wipe a product that
      // BuilderContent may have just added from the ?product=&qty= params.
      const liveProducts = useBuilderStore.getState().products;

      // Only reset if no products have been added yet (true fresh start)
      if (liveProducts.length === 0) {
        try {
          localStorage.removeItem('giftcraft-builder');
        } catch (e) {
          // Ignore errors
        }

        clearAll();
        setCurrentStep(1);
      }
    }
    // Intentionally run only on searchParams change — we read live store state inside.
  }, [searchParams, clearAll, setCurrentStep]);

  return null;
}
