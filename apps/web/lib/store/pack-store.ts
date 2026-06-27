import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PackItem {
  id: string;
  name: string;
  brand?: string;
  price: number;
}

interface PackStore {
  items: Record<string, PackItem>;
  count: number;
  addItem: (item: PackItem) => void;
  removeItem: (id: string) => void;
  toggleItem: (item: PackItem) => void;
  clearPack: () => void;
  getCount: () => number;
  getItems: () => PackItem[];
}

export const usePackStore = create<PackStore>()(
  persist(
    (set) => ({
      items: {},
      count: 0,

      addItem: (item) =>
        set((state) => {
          const newItems = { ...state.items, [item.id]: item };
          return { items: newItems, count: Object.keys(newItems).length };
        }),

      removeItem: (id) =>
        set((state) => {
          const newItems = { ...state.items };
          delete newItems[id];
          return { items: newItems, count: Object.keys(newItems).length };
        }),

      toggleItem: (item) =>
        set((state) => {
          const newItems = { ...state.items };
          if (newItems[item.id]) {
            delete newItems[item.id];
          } else {
            newItems[item.id] = item;
          }
          return { items: newItems, count: Object.keys(newItems).length };
        }),

      clearPack: () => set({ items: {}, count: 0 }),

      getCount: (): number => {
        return Object.keys(usePackStore.getState().items).length;
      },

      getItems: (): PackItem[] => {
        return Object.values(usePackStore.getState().items);
      },
    }),
    {
      name: 'pack-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
