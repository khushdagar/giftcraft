import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentlyViewedItem {
  id: string;
  name: string;
  slug: string;
  image?: string;
  /** Member-product shots for a pack — the rail rebuilds its collage from these. */
  collageImages?: string[];
  /** Cheapest tier price — the same "From ₹…" figure the catalog cards show. */
  fromPrice: number;
  viewedAt: number;
}

// Most-recent-first, capped so localStorage never grows unbounded.
const MAX_ITEMS = 12;

export interface RecentlyViewedState {
  items: RecentlyViewedItem[];
  record: (item: Omit<RecentlyViewedItem, "viewedAt">) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],
      record: (item) =>
        set({
          items: [
            { ...item, viewedAt: Date.now() },
            // Re-viewing a product moves it to the front instead of duplicating.
            ...get().items.filter((i) => i.id !== item.id),
          ].slice(0, MAX_ITEMS),
        }),
      clear: () => set({ items: [] }),
    }),
    { name: "recently-viewed-store" }
  )
);
