import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useBoxStore } from "./box";

export interface BuilderProduct {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  sellPrice: number;
  // Minimum order quantity for THIS product (from the product master). Used to
  // floor the pack quantity so a box can't be ordered below its products' MOQ.
  moq?: number;
  brand?: string;
  printingTechnique?: string;
  hsnCode?: string;
  gstRate?: number;
  leadTimeDays?: number;
  weightG?: number | null;
  dimensionL?: number | null;
  dimensionW?: number | null;
  dimensionH?: number | null;
  priceTiers?: Array<{ tier: number; minQty: number; maxQty: number | null; sellPrice: number }>;
  images?: Array<{ url: string }>;
  // Selected variant (e.g. colour / size) chosen in the Quick View modal
  variantValue?: string;
  variantKind?: string;
  variantHex?: string | null;
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
    // Auto-picked box size (Small/Medium/Large) for the pack, if any.
    size?: string;
  } | null;

  addons: Array<{
    id: string;
    name: string;
    price: number;
  }>;

  // Uploaded logo, persisted to Digital Ocean Spaces + the company brand asset
  // library. `url` is the public CDN URL; `name` is the original file name.
  logo: {
    url: string;
    name: string;
  } | null;

  sleeve: boolean;

  // Buyer info
  pincode: string | null;
  shippingZone: {
    zoneName: string;
    // Weight-based rate config (SOW: ₹/kg per zone)
    ratePerKg?: number;
    minCharge?: number;
    freeShippingThreshold?: number | null;
    individualSurchargePct?: number;
    // Legacy flat rate (kept for back-compat)
    flatRate: number;
    etaMinDays: number;
    etaMaxDays: number;
    // Quoted cost from the estimate API (Shiprocket real-time, or zone fallback).
    shippingCost?: number | null;
    perPackCost?: number | null;
    isFree?: boolean;
    source?: 'shiprocket' | 'zone' | null;
    courierName?: string | null;
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

  // ── Step 4 "Review Order" bridge ──────────────────────────────────────────
  // Step 4 owns the quote-creation flow (pricing + /api/quotes + redirect). The
  // sticky footer in BuilderLayout needs to trigger the very same action, so
  // Step 4 publishes its handler and live status here. Transient — never
  // persisted (a stored handler/loading flag would be stale on reload).
  reviewOrder: (() => void) | null;
  reviewLoading: boolean;
  reviewReady: boolean;

  // Actions
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;

  setReviewOrder: (fn: (() => void) | null) => void;
  setReviewStatus: (status: { loading: boolean; ready: boolean }) => void;

  openQuantityModal: () => void;
  closeQuantityModal: () => void;
  setRecipientType: (type: "corporate" | "party") => void;
  setPackQuantity: (qty: number) => void;

  addProduct: (product: BuilderProduct) => void;
  removeProduct: (productId: string) => void;
  updateProductQuantity: (productId: string, quantity: number) => void;
  reorderProducts: (productIds: string[]) => void;

  setPackaging: (packaging: { id: string; name: string; price: number; size?: string } | null) => void;

  addAddon: (addon: { id: string; name: string; price: number }) => void;
  removeAddon: (addonId: string) => void;

  setLogo: (logo: { url: string; name: string } | null) => void;
  setSleeve: (enabled: boolean) => void;

  setPincode: (pincode: string | null) => void;
  setShippingZone: (zone: BuilderState["shippingZone"]) => void;
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
  reviewOrder: null,
  reviewLoading: false,
  reviewReady: false,
};

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentStep: (step) => set({ currentStep: step }),

      setReviewOrder: (fn) => set({ reviewOrder: fn }),
      setReviewStatus: ({ loading, ready }) =>
        set({ reviewLoading: loading, reviewReady: ready }),

      openQuantityModal: () => set({ quantityModalOpen: true }),
      closeQuantityModal: () => set({ quantityModalOpen: false }),
      setRecipientType: (type) => set({ recipientType: type }),
      setPackQuantity: (qty) =>
        set((state) => ({
          packQuantity: qty,
          // Re-price every product to the tier that matches the new pack quantity
          products: state.products.map((p) => {
            const tier =
              p.priceTiers?.find(
                (t) => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty)
              ) || p.priceTiers?.[0];
            return tier ? { ...p, sellPrice: tier.sellPrice } : p;
          }),
        })),

      addProduct: (product) => {
        const products = get().products;
        const existing = products.find((p) => p.id === product.id);
        // Each product is exactly ONE unit per pack — packQuantity is the
        // multiplier. Adding a product that's already in the pack is a no-op
        // (do NOT accumulate quantity), otherwise the ?product= URL re-adding on
        // every refresh would keep inflating the total.
        if (existing) return;
        set({ products: [...products, { ...product, quantity: 1 }] });
      },

      removeProduct: (productId) => {
        const products = get().products.filter((p) => p.id !== productId);
        set({ products });
        // The Build-Your-Pack planner (/box) keeps its own copy of the same
        // selection, so a removal here must remove it there too — otherwise
        // going back to /box resurrects products the user just deleted from the
        // pack. (/box already mirrors its removals into this store.)
        useBoxStore.getState().removeProduct(productId);
      },

      updateProductQuantity: (productId, quantity) => {
        const products = get().products.map((p) => {
          if (p.id !== productId) return p;
          // Re-price to the tier that matches the new quantity
          const tier =
            p.priceTiers?.find(
              (t) => quantity >= t.minQty && (t.maxQty === null || quantity <= t.maxQty)
            ) || p.priceTiers?.[0];
          return { ...p, quantity, sellPrice: tier?.sellPrice ?? p.sellPrice };
        });
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

      setLogo: (logo) => set({ logo }),
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
        // Per-pack subtotal = one unit of each selected product. Quantity is
        // always 1 per pack in this builder, so it's intentionally ignored here
        // (guards against any stale/corrupted quantity inflating the total).
        return get().products.reduce((sum, p) => sum + p.sellPrice, 0);
      },

      getTotalQuantity: () => {
        return get().packQuantity;
      },

      clearAll: () => {
        set(initialState);
        // Emptying the pack empties the planner's box for the same reason. Only
        // the products are cleared — the budget and box count the user set on
        // /box are their settings, not pack contents, and are kept.
        useBoxStore.setState({ products: [] });
      },
    }),
    {
      name: "giftcraft-builder",
      // v5: re-normalise persisted product quantities to 1. Earlier inflation
      // (units-stepper bug + the ?product= URL re-adding on refresh and
      // accumulating quantity) could have grown a product's quantity past 1.
      // Each product is exactly one unit per pack — packQuantity is the
      // multiplier — so quantity is always 1.
      version: 5,
      migrate: (persisted: any) => {
        if (persisted && Array.isArray(persisted.products)) {
          persisted.products = persisted.products.map((p: any) => ({ ...p, quantity: 1 }));
        }
        return persisted;
      },
      // Always persist the full builder state (minus the bulky CSV recipient
      // list). Fresh-start clearing is handled by <BuilderReset/>, which wipes
      // storage only on a true fresh entry (product param + no products yet).
      // We must NOT wipe here on every save, or the delivery address/products
      // entered in Steps 2–4 would never survive a reload while the URL still
      // carries ?product=…  (that was the "address disappears" bug).
      partialize: (state) => ({
        ...state,
        csvRecipients: null,
        // Transient Step-4 bridge — recomputed on mount, never restored.
        reviewOrder: null,
        reviewLoading: false,
        reviewReady: false,
      }),
    }
  )
);
