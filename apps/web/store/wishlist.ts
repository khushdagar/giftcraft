import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistItem {
  id: string;
  name: string;
  slug: string;
  image?: string;
  addedAt: number;
}

export interface WishlistState {
  items: WishlistItem[];
  toggle: (item: Omit<WishlistItem, "addedAt">) => void;
  remove: (productId: string) => void;
  clear: () => void;
  has: (productId: string) => boolean;
  getTotalItems: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => {
        const exists = get().items.some((i) => i.id === item.id);
        set({
          items: exists
            ? get().items.filter((i) => i.id !== item.id)
            : [...get().items, { ...item, addedAt: Date.now() }],
        });
      },
      remove: (productId) => set({ items: get().items.filter((i) => i.id !== productId) }),
      clear: () => set({ items: [] }),
      has: (productId) => get().items.some((i) => i.id === productId),
      getTotalItems: () => get().items.length,
    }),
    { name: "wishlist-store" }
  )
);
