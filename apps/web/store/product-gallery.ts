import { create } from 'zustand';

/**
 * Coordinates the product-detail colour selector with the image gallery.
 * When a colour variant that has its own image is selected, the gallery
 * swaps its main image to that variant image. `null` = show the normal
 * primary/active product image.
 */
interface ProductGalleryState {
  variantImageUrl: string | null;
  setVariantImageUrl: (url: string | null) => void;
}

export const useProductGallery = create<ProductGalleryState>((set) => ({
  variantImageUrl: null,
  setVariantImageUrl: (url) => set({ variantImageUrl: url }),
}));
