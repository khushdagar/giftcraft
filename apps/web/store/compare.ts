import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CompareItem {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

// Side-by-side comparison works best with a handful of products.
export const MAX_COMPARE = 3;

export interface CompareState {
  items: CompareItem[];
  /** Returns false (and does nothing) when the tray is full. */
  toggle: (item: CompareItem) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
  has: (productId: string) => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => {
        const exists = get().items.some((i) => i.id === item.id);
        if (exists) {
          set({ items: get().items.filter((i) => i.id !== item.id) });
          return true;
        }
        if (get().items.length >= MAX_COMPARE) return false;
        set({ items: [...get().items, item] });
        return true;
      },
      remove: (productId) => set({ items: get().items.filter((i) => i.id !== productId) }),
      clear: () => set({ items: [] }),
      has: (productId) => get().items.some((i) => i.id === productId),
    }),
    { name: "compare-store" }
  )
);
