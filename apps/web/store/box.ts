import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computeOrderShipping } from '@/lib/shipping';

export interface BoxProduct {
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
  weightG?: number | null;
  priceTiers?: Array<{ tier: number; minQty: number; maxQty: number | null; sellPrice: number }>;
  images?: Array<{ url: string }>;
}

export interface BoxState {
  // Budget constraints
  budget: number;
  categoryId: string | null;

  // Step tracking
  currentStep: 1 | 2 | 3 | 4;

  // Quantity modal
  quantityModalOpen: boolean;
  recipientType: 'corporate' | 'party' | null;
  packQuantity: number;

  // Products
  products: BoxProduct[];

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
    ratePerKg?: number;
    minCharge?: number;
    freeShippingThreshold?: number | null;
    individualSurchargePct?: number;
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
  deliveryMode: 'single' | 'individual';
  cardMessage: string;
  brandingNotes: string;
  delivDate: string | null;

  coupon: {
    code: string;
    discountAmount: number;
  } | null;

  // Actions
  setBudget: (budget: number) => void;
  setCategoryId: (categoryId: string | null) => void;
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;

  openQuantityModal: () => void;
  closeQuantityModal: () => void;
  setRecipientType: (type: 'corporate' | 'party') => void;
  setPackQuantity: (qty: number) => void;

  addProduct: (product: BoxProduct) => void;
  removeProduct: (productId: string) => void;
  updateProductQuantity: (productId: string, quantity: number) => void;
  reorderProducts: (productIds: string[]) => void;

  setPackaging: (packaging: { id: string; name: string; price: number } | null) => void;
  addAddon: (addon: { id: string; name: string; price: number }) => void;
  removeAddon: (addonId: string) => void;

  setLogo: (file: File | null, preview: string | null) => void;
  toggleSleeve: () => void;

  setPincode: (pincode: string | null) => void;
  setShippingZone: (zone: any | null) => void;
  setAddress: (address: any | null) => void;

  setCsvRecipients: (recipients: any) => void;
  setCsvRecipientCount: (count: number) => void;

  setDeliveryMode: (mode: 'single' | 'individual') => void;
  setCardMessage: (message: string) => void;
  setBrandingNotes: (notes: string) => void;
  setDelivDate: (date: string | null) => void;

  setCoupon: (coupon: { code: string; discountAmount: number } | null) => void;

  // Computed
  getProductsSubtotal: () => number;
  getTotalPrice: () => number;
  isBudgetExceeded: () => boolean;
  reset: () => void;
}

const initialState = {
  budget: 0,
  categoryId: null,
  currentStep: 1 as const,
  quantityModalOpen: false,
  recipientType: null,
  packQuantity: 25,
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
  deliveryMode: 'single' as const,
  cardMessage: '',
  brandingNotes: '',
  delivDate: null,
  coupon: null,
};

export const useBoxStore = create<BoxState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setBudget: (budget: number) => set({ budget }),
      setCategoryId: (categoryId: string | null) => set({ categoryId }),
      setCurrentStep: (step) => set({ currentStep: step }),

      openQuantityModal: () => set({ quantityModalOpen: true }),
      closeQuantityModal: () => set({ quantityModalOpen: false }),
      setRecipientType: (type) => set({ recipientType: type }),
      setPackQuantity: (qty) => set({ packQuantity: qty }),

      addProduct: (product) => {
        const state = get();
        const existing = state.products.find((p) => p.id === product.id);
        if (existing) {
          set({
            products: state.products.map((p) =>
              p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
            ),
          });
        } else {
          set({ products: [...state.products, product] });
        }
      },

      removeProduct: (productId) => {
        const state = get();
        set({ products: state.products.filter((p) => p.id !== productId) });
      },

      updateProductQuantity: (productId, quantity) => {
        const state = get();
        set({
          products: state.products.map((p) =>
            p.id === productId ? { ...p, quantity } : p
          ),
        });
      },

      reorderProducts: (productIds) => {
        const state = get();
        const reordered = productIds
          .map((id) => state.products.find((p) => p.id === id))
          .filter((p) => p !== undefined) as BoxProduct[];
        set({ products: reordered });
      },

      setPackaging: (packaging) => set({ packaging }),
      addAddon: (addon) => {
        const state = get();
        const existing = state.addons.find((a) => a.id === addon.id);
        if (!existing) {
          set({ addons: [...state.addons, addon] });
        }
      },

      removeAddon: (addonId) => {
        const state = get();
        set({ addons: state.addons.filter((a) => a.id !== addonId) });
      },

      setLogo: (file, preview) => set({ logo: { file, preview } }),
      toggleSleeve: () => {
        const state = get();
        set({ sleeve: !state.sleeve });
      },

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
        const state = get();
        return state.products.reduce((sum, p) => sum + p.sellPrice * p.quantity, 0);
      },

      getTotalPrice: () => {
        const state = get();
        let total = state.getProductsSubtotal();
        if (state.packaging) total += state.packaging.price * state.packQuantity;
        state.addons.forEach((a) => {
          total += a.price * state.packQuantity;
        });
        // Weight-based shipping (SOW: ₹/kg per zone), consistent with the builder.
        total += computeOrderShipping({
          products: state.products.map((p) => ({
            weightG: p.weightG,
            quantity: 1,
            sellPrice: p.sellPrice,
          })),
          zone: state.shippingZone,
          packQuantity: state.packQuantity,
          deliveryMode: 'single',
        }).shippingCost;
        if (state.coupon) total -= state.coupon.discountAmount;
        return Math.max(0, total);
      },

      isBudgetExceeded: () => {
        const state = get();
        if (state.budget <= 0) return false;
        return state.getTotalPrice() > state.budget;
      },

      reset: () => set(initialState),
    }),
    {
      name: 'box-store',
      version: 1,
    }
  )
);
