import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BuilderProduct {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  sellPrice: number;
  priceTiers?: Array<{ tier: number; minQty: number; maxQty: number | null; sellPrice: number }>;
}

export interface BuilderState {
  // Step tracking
  currentStep: 1 | 2 | 3 | 4;

  // Quantity modal
  quantityModalOpen: boolean;
  recipientType: "corporate" | "party" | null;
  packQuantity: number;

  // Products
  products: BuilderProduct[];

  // Customization
  packaging: {
    id: string;
    name: string;
    price: number;
  } | null;

  addons: Array<{
    id: string;
    name: string;
    price: number;
  }>;

  logo: {
    file: File | null;
    preview: string | null;
  } | null;

  // Buyer info
  pincode: string | null;
  shippingZone: {
    name: string;
    flatRate: number;
    etaMinDays: number;
    etaMaxDays: number;
  } | null;

  // Delivery & messaging
  deliveryMode: "single" | "individual";
  cardMessage: string;
  brandingNotes: string;

  // Actions
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;

  openQuantityModal: () => void;
  closeQuantityModal: () => void;
  setRecipientType: (type: "corporate" | "party") => void;
  setPackQuantity: (qty: number) => void;

  addProduct: (product: BuilderProduct) => void;
  removeProduct: (productId: string) => void;
  updateProductQuantity: (productId: string, quantity: number) => void;
  reorderProducts: (productIds: string[]) => void;

  setPackaging: (packaging: { id: string; name: string; price: number } | null) => void;

  addAddon: (addon: { id: string; name: string; price: number }) => void;
  removeAddon: (addonId: string) => void;

  setLogo: (file: File | null, preview: string | null) => void;

  setPincode: (pincode: string | null) => void;
  setShippingZone: (zone: { name: string; flatRate: number; etaMinDays: number; etaMaxDays: number } | null) => void;

  setDeliveryMode: (mode: "single" | "individual") => void;
  setCardMessage: (message: string) => void;
  setBrandingNotes: (notes: string) => void;

  // Computed
  getProductsSubtotal: () => number;
  getTotalQuantity: () => number;
  clearAll: () => void;
}

const initialState = {
  currentStep: 1 as const,
  quantityModalOpen: false,
  recipientType: null,
  packQuantity: 50,
  products: [],
  packaging: null,
  addons: [],
  logo: null,
  pincode: null,
  shippingZone: null,
  deliveryMode: "single" as const,
  cardMessage: "",
  brandingNotes: "",
};

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentStep: (step) => set({ currentStep: step }),

      openQuantityModal: () => set({ quantityModalOpen: true }),
      closeQuantityModal: () => set({ quantityModalOpen: false }),
      setRecipientType: (type) => set({ recipientType: type }),
      setPackQuantity: (qty) => set({ packQuantity: qty }),

      addProduct: (product) => {
        const products = get().products;
        const existing = products.find((p) => p.id === product.id);
        if (existing) {
          existing.quantity += product.quantity;
          set({ products: [...products] });
        } else {
          set({ products: [...products, product] });
        }
      },

      removeProduct: (productId) => {
        const products = get().products.filter((p) => p.id !== productId);
        set({ products });
      },

      updateProductQuantity: (productId, quantity) => {
        const products = get().products.map((p) =>
          p.id === productId ? { ...p, quantity } : p
        );
        set({ products });
      },

      reorderProducts: (productIds) => {
        const currentProducts = get().products;
        const reordered = productIds
          .map((id) => currentProducts.find((p) => p.id === id))
          .filter((p) => p !== undefined) as BuilderProduct[];
        set({ products: reordered });
      },

      setPackaging: (packaging) => set({ packaging }),

      addAddon: (addon) => {
        const addons = get().addons;
        const existing = addons.find((a) => a.id === addon.id);
        if (!existing) {
          set({ addons: [...addons, addon] });
        }
      },

      removeAddon: (addonId) => {
        const addons = get().addons.filter((a) => a.id !== addonId);
        set({ addons });
      },

      setLogo: (file, preview) => set({ logo: file ? { file, preview } : null }),

      setPincode: (pincode) => set({ pincode }),
      setShippingZone: (zone) => set({ shippingZone: zone }),

      setDeliveryMode: (mode) => set({ deliveryMode: mode }),
      setCardMessage: (message) => set({ cardMessage: message }),
      setBrandingNotes: (notes) => set({ brandingNotes: notes }),

      getProductsSubtotal: () => {
        return get().products.reduce((sum, p) => sum + p.sellPrice * p.quantity, 0);
      },

      getTotalQuantity: () => {
        return get().packQuantity;
      },

      clearAll: () => set(initialState),
    }),
    {
      name: "giftcraft-builder",
      version: 1,
    }
  )
);
