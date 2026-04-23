import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BuilderProduct {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  sellPrice: number;
  brand?: string;
  printingTechnique?: string;
  hsnCode?: string;
  gstRate?: number;
  leadTimeDays?: number;
  priceTiers?: Array<{ tier: number; minQty: number; maxQty: number | null; sellPrice: number }>;
  images?: Array<{ url: string }>;
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

  sleeve: boolean;

  // Buyer info
  pincode: string | null;
  shippingZone: {
    zoneName: string;
    flatRate: number;
    etaMinDays: number;
    etaMaxDays: number;
  } | null;

  address: {
    name: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  } | null;

  csvRecipients: Array<{
    name: string;
    email?: string;
    phone?: string;
    address: string;
  }> | null;

  csvRecipientCount: number;

  // Delivery & messaging
  deliveryMode: "single" | "individual";
  cardMessage: string;
  brandingNotes: string;
  delivDate: string | null;

  coupon: {
    code: string;
    discountAmount: number;
  } | null;

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
  setSleeve: (enabled: boolean) => void;

  setPincode: (pincode: string | null) => void;
  setShippingZone: (zone: { zoneName: string; flatRate: number; etaMinDays: number; etaMaxDays: number } | null) => void;
  setAddress: (address: BuilderState["address"]) => void;
  setCsvRecipients: (recipients: BuilderState["csvRecipients"]) => void;
  setCsvRecipientCount: (count: number) => void;

  setDeliveryMode: (mode: "single" | "individual") => void;
  setCardMessage: (message: string) => void;
  setBrandingNotes: (notes: string) => void;
  setDelivDate: (date: string | null) => void;
  setCoupon: (coupon: BuilderState["coupon"]) => void;

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
  sleeve: false,
  pincode: null,
  shippingZone: null,
  address: null,
  csvRecipients: null,
  csvRecipientCount: 0,
  deliveryMode: "single" as const,
  cardMessage: "",
  brandingNotes: "",
  delivDate: null,
  coupon: null,
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
          set({
            products: products.map((p) =>
              p.id === product.id
                ? { ...p, quantity: p.quantity + product.quantity }
                : p
            ),
          });
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
      setSleeve: (enabled) => set({ sleeve: enabled }),

      setPincode: (pincode) => set({ pincode }),
      setShippingZone: (zone) => set({ shippingZone: zone }),
      setAddress: (address) => set({ address }),
      setCsvRecipients: (recipients) => set({ csvRecipients: recipients }),
      setCsvRecipientCount: (count) => set({ csvRecipientCount: count }),

      setDeliveryMode: (mode) => set({ deliveryMode: mode }),
      setCardMessage: (message) => set({ cardMessage: message }),
      setBrandingNotes: (notes) => set({ brandingNotes: notes }),
      setDelivDate: (date) => set({ delivDate: date }),
      setCoupon: (coupon) => set({ coupon }),

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
      version: 2,
      partialize: (state) => ({
        ...state,
        logo: state.logo ? { file: null, preview: state.logo.preview } : null,
        csvRecipients: null,
      }),
    }
  )
);
