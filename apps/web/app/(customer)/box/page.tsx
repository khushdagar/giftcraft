'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { Search, Plus, Check, X, ChevronDown } from 'lucide-react';
import { useBoxStore, type BoxProduct } from '@/store/box';
import { useBuilderStore } from '@/store/builder';
import { packagingSizeForCount, priceForSize } from '@/lib/packaging-designs';

interface ApiPackaging {
  id: string;
  name: string;
  price: number;
  sizePrices?: Record<string, number> | null;
}

interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  moq?: number;
  printingTechnique?: string;
  leadTimeDays?: number;
  weightG?: number | null;
  priceTiers?: Array<{ tier: number; minQty: number; maxQty: number | null; sellPrice: number }>;
  images?: Array<{ url: string; isPrimary?: boolean }>;
  categories?: Array<{ categoryId: string; category?: { name: string } }>;
  hsn?: { gstRate?: number; hsn?: { code?: string } };
}

const QUICK_BUDGETS = [500, 1000, 2500, 5000];
// Corporate gifting floor is 25 (RULE 4) — never below it.
const MIN_BOX_QTY = 25;
const QUICK_QTYS = [25, 50, 100, 250];

// The budget on this page is GST-INCLUSIVE: the customer enters what they want
// to spend per box tax-in, and every product consumes its price PLUS its own
// GST. GST is per-product (driven by its HSN code), so the budget can't simply
// be scaled by one blended rate — tax is added item by item as the box fills.
// Products with no HSN mapping fall back to 18%, matching the builder.
const DEFAULT_GST_RATE = 18;

// Payment-processing fee passed through to the customer (CLAUDE.md Rule 2):
// Razorpay's 2% plus the 18% GST Razorpay charges on that fee ≈ 2.36% effective.
const RAZORPAY_FEE_PCT = 2;
const RAZORPAY_FEE_GST_PCT = 18;
const EFFECTIVE_FEE_PCT = RAZORPAY_FEE_PCT * (1 + RAZORPAY_FEE_GST_PCT / 100);

// Packaging + add-ons are taxed at a flat 18% (HSN 4819) by the pricing engine.
const PACKAGING_GST_RATE = 18;

function inr(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

/**
 * What the customer actually pays for one unit: the sell price plus that
 * product's own GST. This is the number the budget is measured against, so the
 * figure on the card is the figure that comes off the budget bar.
 */
function gstInclusive(sellPrice: number, gstRate?: number | null): number {
  return sellPrice * (1 + (gstRate ?? DEFAULT_GST_RATE) / 100);
}

// Per-unit price at the tier matching the chosen pack quantity (higher volume →
// lower per-unit price), mirroring the builder's tier pricing.
function tierPriceFor(
  tiers: Array<{ minQty: number; maxQty: number | null; sellPrice: number }> | undefined,
  qty: number
): number {
  if (!tiers?.length) return 0;
  const t =
    tiers.find((x) => qty >= x.minQty && (x.maxQty == null || qty <= x.maxQty)) || tiers[0];
  return t?.sellPrice ?? 0;
}

function toBoxProduct(p: ApiProduct, qty: number): BoxProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    quantity: 1,
    sellPrice: tierPriceFor(p.priceTiers, qty),
    moq: p.moq,
    brand: p.brand,
    printingTechnique: p.printingTechnique,
    hsnCode: p.hsn?.hsn?.code,
    gstRate: p.hsn?.gstRate,
    leadTimeDays: p.leadTimeDays,
    weightG: p.weightG ?? null,
    priceTiers: p.priceTiers,
    images: p.images?.map((i) => ({ url: i.url })),
  };
}

export default function BuildYourBoxPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);

  const budget = useBoxStore((s) => s.budget);
  const packQuantity = useBoxStore((s) => s.packQuantity);
  const boxProducts = useBoxStore((s) => s.products);
  const setBudget = useBoxStore((s) => s.setBudget);
  const setPackQuantity = useBoxStore((s) => s.setPackQuantity);
  const setCategoryId = useBoxStore((s) => s.setCategoryId);
  const addBoxProduct = useBoxStore((s) => s.addProduct);
  const removeBoxProduct = useBoxStore((s) => s.removeProduct);

  const builderProducts = useBuilderStore((s) => s.products);
  const builderAddProduct = useBuilderStore((s) => s.addProduct);
  const builderRemoveProduct = useBuilderStore((s) => s.removeProduct);
  const builderSetPackQuantity = useBuilderStore((s) => s.setPackQuantity);

  const seededRef = useRef(false);

  // Locally-editable text for the Boxes field so the user can clear it and type
  // a fresh number. We only clamp to the minimum on blur — clamping on every
  // keystroke made it impossible to replace the existing value (typing "45" into
  // "25" produced "2545"). Kept in sync when the +/- buttons change the store.
  const [boxQtyInput, setBoxQtyInput] = useState(String(packQuantity));
  useEffect(() => {
    setBoxQtyInput(String(packQuantity));
  }, [packQuantity]);

  // Per-box product cost at the current volume tier (re-prices live when qty
  // changes), split so the breakdown can show the customer exactly how their
  // tax-inclusive total is built: base price + each product's own GST.
  const { subtotalExGst, productsGst, subtotal } = useMemo(() => {
    const ex = boxProducts.reduce((sum, p) => sum + tierPriceFor(p.priceTiers, packQuantity), 0);
    const inc = boxProducts.reduce(
      (sum, p) => sum + gstInclusive(tierPriceFor(p.priceTiers, packQuantity), p.gstRate),
      0
    );
    return { subtotalExGst: ex, productsGst: inc - ex, subtotal: inc };
  }, [boxProducts, packQuantity]);

  // Budget is edited inline in the tracker; keep a local string for the custom field.
  const [budgetInput, setBudgetInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  // Auto-fit: by default only show products that fit the remaining budget.
  const [fitOnly, setFitOnly] = useState(true);
  // Mobile-only: collapse the box's item list + breakdown behind a "See details"
  // toggle so the panel stays short and the Proceed button is reachable. On lg+
  // the details are always shown (the toggle is hidden).
  const [showBoxDetails, setShowBoxDetails] = useState(false);

  // No auth gate: anyone can build a box. Account creation happens later, at
  // logo upload in the builder — asking to sign in here would block the whole
  // flow for a first-time visitor.

  // Hydrate the budget field from the persisted store + honour deep links once.
  useEffect(() => {
    setMounted(true);
    const budgetParam = searchParams.get('budget');
    const categoryParam = searchParams.get('category');
    if (budgetParam) {
      const parsed = parseInt(budgetParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setBudget(parsed);
        setBudgetInput(String(parsed));
      }
    } else if (budget > 0) {
      setBudgetInput(String(budget));
    }
    if (categoryParam) setCategoryId(categoryParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Commit the typed budget straight into the store — no separate "Next" step.
  const commitBudget = (raw: string) => {
    setBudgetInput(raw);
    const b = parseInt(raw, 10);
    setBudget(!isNaN(b) && b > 0 ? b : 0);
  };

  const { data: products = [], isLoading: productsLoading } = useQuery<ApiProduct[]>({
    queryKey: ['box', 'products'],
    queryFn: async () => {
      // /api/products clamps `limit` to 100 per page, so one request can never
      // return the whole catalogue however large a limit we ask for — asking for
      // 300 silently returned the first 100 and hid the rest. Page through until
      // we have them all: this picker must offer every product, since a hidden
      // one simply cannot be added to a box. (Packaging and add-ons are already
      // excluded server-side via getHiddenCategoryIds.)
      const PAGE_SIZE = 100;
      const all: ApiProduct[] = [];
      for (let page = 1; ; page++) {
        const res = await fetch(`/api/products?limit=${PAGE_SIZE}&page=${page}`);
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        const batch: ApiProduct[] = data.products || [];
        all.push(...batch);
        // Stop on a short/empty page, or once we've collected the reported total.
        const total = Number(data.total);
        if (batch.length < PAGE_SIZE || (Number.isFinite(total) && all.length >= total)) break;
      }
      return all;
    },
    enabled: budget > 0,
  });

  // Packaging designs, used ONLY to estimate the final per-box cost. The customer
  // picks the actual design later in the builder, so we quote the cheapest design
  // at the size this box needs ("from ₹X").
  const { data: packagingOptions = [] } = useQuery<ApiPackaging[]>({
    queryKey: ['box', 'packaging'],
    queryFn: async () => {
      const res = await fetch('/api/packaging');
      if (!res.ok) throw new Error('Failed to load packaging');
      return res.json();
    },
    enabled: budget > 0,
  });

  // Mirror any products already in the gift-pack cart (builder store — the header
  // badge) into the box on entry, so the user sees and can manage them here.
  // Enrich with tier pricing/MOQ from the catalogue when available; otherwise use
  // the fields the cart already carries.
  useEffect(() => {
    if (seededRef.current) return;
    if (builderProducts.length === 0) return;
    // When a budget is set the product list loads — wait for it so we tier-price.
    if (budget > 0 && products.length === 0) return;
    seededRef.current = true;
    const existing = new Set(boxProducts.map((p) => p.id));
    builderProducts.forEach((bp) => {
      if (existing.has(bp.id)) return;
      const api = products.find((p) => p.id === bp.id);
      if (api) {
        addBoxProduct(toBoxProduct(api, packQuantity));
      } else {
        addBoxProduct({
          id: bp.id,
          name: bp.name,
          slug: bp.slug,
          quantity: 1,
          sellPrice: bp.sellPrice,
          brand: bp.brand,
          printingTechnique: bp.printingTechnique,
          hsnCode: bp.hsnCode,
          gstRate: bp.gstRate,
          leadTimeDays: bp.leadTimeDays,
          weightG: bp.weightG ?? null,
          priceTiers:
            bp.priceTiers ?? [{ tier: 1, minQty: 1, maxQty: null, sellPrice: bp.sellPrice }],
          images: bp.images,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderProducts, products, budget]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) =>
      p.categories?.forEach((c) => {
        if (c.category?.name) map.set(c.categoryId, c.category.name);
      })
    );
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [products]);

  const inBoxIds = useMemo(() => new Set(boxProducts.map((p) => p.id)), [boxProducts]);
  // Budget, spend and remaining are all GST-inclusive — same basis throughout.
  const remaining = budget - subtotal;
  const isExceeded = budget > 0 && subtotal > budget;
  const percentage = budget > 0 ? Math.min((subtotal / budget) * 100, 100) : 0;

  // ── Estimated final per-box cost ────────────────────────────────────────────
  // The budget bar above tracks products + their GST, because that's all this
  // page decides. The builder then adds packaging and the payment fee, so we
  // surface that here rather than letting it surprise the customer at checkout.
  // Box size is auto-picked from the product count, so packaging is only an
  // estimate until a design is chosen; shipping is excluded entirely (no
  // delivery pincode is known at this point).
  const boxSize = useMemo(() => packagingSizeForCount(boxProducts.length), [boxProducts.length]);
  const packagingFrom = useMemo(() => {
    if (boxProducts.length === 0 || packagingOptions.length === 0) return 0;
    return Math.min(...packagingOptions.map((d) => priceForSize(d, boxSize)));
  }, [packagingOptions, boxSize, boxProducts.length]);
  const packagingIncGst = gstInclusive(packagingFrom, PACKAGING_GST_RATE);
  const paymentFee = (subtotal + packagingIncGst) * (EFFECTIVE_FEE_PCT / 100);
  const estFinalPerBox = subtotal + packagingIncGst + paymentFee;

  // The box quantity can never drop below 25 (corporate floor) or below the
  // highest MOQ among the products already in the box.
  const minBoxQty = useMemo(
    () => boxProducts.reduce((m, p) => Math.max(m, p.moq ?? MIN_BOX_QTY), MIN_BOX_QTY),
    [boxProducts]
  );

  // Auto-fit filter — show only products that fit the remaining budget (plus any
  // already in the box, so they can still be removed from the grid). No manual
  // slider: the list narrows automatically as the box fills up.
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.brand?.toLowerCase().includes(q)) return false;
      }
      if (selectedCat !== 'all' && !p.categories?.some((c) => c.categoryId === selectedCat)) {
        return false;
      }
      if (fitOnly && !inBoxIds.has(p.id)) {
        // Compare tax-in against a tax-in budget — an item only "fits" if it AND
        // its GST fit in what's left.
        const price = gstInclusive(tierPriceFor(p.priceTiers, packQuantity), p.hsn?.gstRate);
        const moqOk = (p.moq ?? MIN_BOX_QTY) <= packQuantity;
        if (!moqOk || price > remaining) return false;
      }
      return true;
    });
  }, [products, search, selectedCat, fitOnly, packQuantity, remaining, inBoxIds]);

  // Removing from the box also removes it from the gift-pack cart (builder store),
  // keeping the header badge in sync.
  const removeFromBox = (productId: string) => {
    removeBoxProduct(productId);
    builderRemoveProduct(productId);
  };

  const handleToggle = (p: ApiProduct) => {
    if (inBoxIds.has(p.id)) {
      removeFromBox(p.id);
      return;
    }
    // Block products whose MOQ exceeds the chosen box count.
    if ((p.moq ?? MIN_BOX_QTY) > packQuantity) return;
    addBoxProduct(toBoxProduct(p, packQuantity));
  };

  const handleProceed = () => {
    // Carry the chosen volume into the builder so it re-prices to the same tier.
    builderSetPackQuantity(packQuantity);
    boxProducts.forEach((p) =>
      builderAddProduct({
        id: p.id,
        name: p.name,
        slug: p.slug,
        quantity: 1,
        sellPrice: tierPriceFor(p.priceTiers, packQuantity),
        brand: p.brand,
        printingTechnique: p.printingTechnique,
        hsnCode: p.hsnCode,
        gstRate: p.gstRate,
        leadTimeDays: p.leadTimeDays,
        weightG: p.weightG,
        priceTiers: p.priceTiers,
        images: p.images,
      })
    );
    router.push('/builder');
  };

  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-em"></div>
          <p className="mt-4 text-ink-2">Loading...</p>
        </div>
      </div>
    );
  }

  const hasBudget = budget > 0;

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50 py-12 ${
        boxProducts.length > 0 ? 'pb-28' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">NEW FEATURE</p>
          <h1 className="text-4xl sm:text-5xl font-normal mt-2 text-ink">Build Your Pack</h1>
          <p className="text-base text-ink-2 mt-3 max-w-2xl"> 
            Create a custom gift pack within your budget. We'll help you maximize every rupee!
          </p>
        </motion.div>

        {/* ── Two columns: budget/tracking sidebar + product picker ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: budget box + simple tracking line + your box */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
              {/* Budget box */}
              <div className="bg-white rounded-md border-2 border-amber-200 p-4">
                <h3 className="text-sm font-bold text-ink mb-3">Set your budget</h3>

                {/* Per-box budget — stated as GST-inclusive up front, so the
                    number the customer types is the number they think in. */}
                <label className="block text-xs uppercase font-semibold text-ink-3 mb-1.5">
                  Per-box budget
                  <span className="ml-1.5 normal-case tracking-normal rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                    including GST
                  </span>
                </label>
                <p className="text-[11px] leading-snug text-ink-3 mb-2">
                  What you want to spend on <strong className="font-semibold text-ink-2">one box</strong>, tax
                  included. Each product uses up its price + its own GST.
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {QUICK_BUDGETS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => commitBudget(String(b))}
                      className={`px-3 py-1.5 rounded-full border-2 text-sm font-medium transition ${
                        budget === b
                          ? 'border-amber-400 bg-amber-100 text-amber-900'
                          : 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400'
                      }`}
                    >
                      {inr(b)}
                    </button>
                  ))}
                </div>
                <div className="relative mb-4">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₹</span>
                  <input
                    type="number"
                    min={1}
                    value={budgetInput}
                    onChange={(e) => commitBudget(e.target.value)}
                    placeholder="Custom amount, e.g. 5000"
                    className="w-full h-10 pl-7 pr-3 rounded-md border-2 border-bdr focus:border-em focus:outline-none text-sm"
                  />
                </div>

                {/* Boxes (pack quantity) — drives the bulk pricing tier */}
                <label className="block text-xs uppercase font-semibold text-ink-3 mb-2">
                  Boxes <span className="normal-case font-normal">· lower per-unit at volume</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPackQuantity(Math.max(minBoxQty, packQuantity - 5))}
                    className="h-9 w-9 rounded-full border-2 border-bdr text-ink hover:border-em shrink-0"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={minBoxQty}
                    value={boxQtyInput}
                    onChange={(e) => {
                      // Let the field hold whatever is typed (including empty
                      // mid-edit); push valid numbers to the store live.
                      setBoxQtyInput(e.target.value);
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) setPackQuantity(v);
                    }}
                    onBlur={() => {
                      // Enforce the floor once the user is done editing.
                      const v = parseInt(boxQtyInput, 10);
                      const next = isNaN(v) || v < minBoxQty ? minBoxQty : v;
                      setPackQuantity(next);
                      setBoxQtyInput(String(next));
                    }}
                    className="flex-1 h-9 text-center rounded-md border-2 border-bdr focus:border-em focus:outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setPackQuantity(packQuantity + 5)}
                    className="h-9 w-9 rounded-full border-2 border-bdr text-ink hover:border-em shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Your Box (cart) */}
              <div className="bg-white rounded-md border-2 border-bdr p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-ink">Your Box</h3>
                  <span className="text-xs text-ink-3">
                    {boxProducts.length} item{boxProducts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {boxProducts.length === 0 ? (
                  <p className="text-xs text-ink-3 py-4 text-center">
                    No products yet. Add items from the right to build your pack.
                  </p>
                ) : (
                  <div className={`${showBoxDetails ? '' : 'hidden'} lg:block`}>
                  <ul className="space-y-2">
                    {boxProducts.map((p) => {
                      const base = tierPriceFor(p.priceTiers, packQuantity);
                      const rate = p.gstRate ?? DEFAULT_GST_RATE;
                      return (
                      <li key={p.id} className="flex items-center gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-ink">{p.name}</p>
                          {/* Show the sum, not just the answer — the customer can
                              see exactly why this item cost what it did. */}
                          <p className="text-xs text-ink-3 tabnum">
                            <span className="font-semibold text-ink-2">
                              {inr(gstInclusive(base, p.gstRate))}
                            </span>{' '}
                            <span className="text-[11px]">
                              ({inr(base)} + {rate}% GST)
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromBox(p.id)}
                          className="text-ink-3 hover:text-rose-600 shrink-0"
                          aria-label={`Remove ${p.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                      );
                    })}
                  </ul>

                  {/* The full sum, laid out line by line, so "how was my box
                      calculated?" is answered on screen rather than in support. */}
                  <div className="mt-3 pt-3 border-t border-bdr space-y-1 text-sm">
                    <div className="flex justify-between text-xs text-ink-3">
                      <span>Products (before GST)</span>
                      <span className="tabnum">{inr(subtotalExGst)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-ink-3">
                      <span>GST on products</span>
                      <span className="tabnum">+{inr(productsGst)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-bdr">
                      <span className="text-ink-2">Per box (incl. GST)</span>
                      <span className="tabnum font-semibold text-ink">{inr(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-ink-3">
                      <span>× {packQuantity} boxes</span>
                      <span className="tabnum">{inr(subtotal * packQuantity)}</span>
                    </div>
                  </div>
                  </div>
                )}

                {/* Mobile-only preview: overlapping product thumbnails so the
                    collapsed panel still reads clearly as "my products". */}
                {boxProducts.length > 0 && !showBoxDetails && (
                  <div className="lg:hidden mt-3 flex items-center justify-between gap-3">
                    <div className="flex -space-x-2">
                      {boxProducts.slice(0, 5).map((p) => {
                        const thumb = p.images?.[0]?.url;
                        return (
                          <div
                            key={p.id}
                            className="h-11 w-11 rounded-md border-2 border-white bg-gray-50 overflow-hidden shrink-0 shadow-sm flex items-center justify-center"
                          >
                            {thumb ? (
                              <img src={thumb} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-base opacity-40">🎁</span>
                            )}
                          </div>
                        );
                      })}
                      {boxProducts.length > 5 && (
                        <div className="h-11 w-11 rounded-md border-2 border-white bg-em text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          +{boxProducts.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-ink-2 shrink-0 tabnum">
                      Per box <span className="font-semibold text-ink">{inr(subtotal)}</span>
                    </span>
                  </div>
                )}

                {/* Mobile-only: reveal/hide the item list + breakdown so the
                    panel stays short and the Proceed button is reachable. */}
                {boxProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBoxDetails((v) => !v)}
                    className="lg:hidden mt-3 w-full flex items-center justify-center gap-1 text-xs font-semibold text-em"
                  >
                    {showBoxDetails
                      ? 'Hide details'
                      : `See details · ${boxProducts.length} item${boxProducts.length !== 1 ? 's' : ''}`}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${showBoxDetails ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}

                <button
                  onClick={handleProceed}
                  disabled={boxProducts.length === 0}
                  className="mt-4 w-full py-3 bg-em hover:bg-em-600 disabled:opacity-50 text-white font-medium rounded-2xl transition"
                >
                  Proceed to Customize →
                </button>
                {isExceeded && (
                  <p className="text-xs text-rose-600 mt-2 text-center">
                    You're {inr(subtotal - budget)} over budget — remove an item or raise the budget.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Product picker (auto-filtered to the remaining budget) */}
          <div className="lg:col-span-2 space-y-5">
            {!hasBudget ? (
              <div className="bg-white rounded-md border-2 border-bdr py-20 text-center text-ink-3">
                <p className="text-3xl mb-3">🎁</p>
                <p className="text-sm">
                  Set your per-box budget on the left — we'll instantly show products that fit.
                </p>
                <p className="text-xs mt-2">
                  Enter your budget with GST included; we'll do the tax maths for you.
                </p>
              </div>
            ) : (
              <>
                {/* Horizontal budget tracking line.
                    On mobile the budget panel is far above the product grid, so
                    this sticks below the navbar (h-14) as the user scrolls the
                    products — "what's left" has to stay on screen at the moment
                    they're deciding what to add. On lg+ the sticky sidebar
                    already shows it, so it scrolls normally there. */}
                <div className="sticky top-14 z-30 bg-white rounded-md border-2 border-bdr px-4 py-3 shadow-sm lg:shadow-none">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-sm font-bold text-ink shrink-0">
                      Budget tracking
                      <span className="ml-1 font-normal text-[11px] text-ink-3">incl. GST</span>
                    </span>
                    <div className="relative order-last w-full h-2.5 bg-gray-200 rounded-full overflow-hidden sm:order-none sm:flex-1 sm:w-auto">
                      <motion.div
                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                        transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                        className={`h-full ${
                          isExceeded ? 'bg-rose-500' : percentage >= 80 ? 'bg-orange-500' : 'bg-em'
                        }`}
                      />
                    </div>
                    <p className="text-xs text-ink-2 tabnum shrink-0">
                      Spent {inr(subtotal)} · {isExceeded ? 'Over' : 'Left'}{' '}
                      <span
                        className={
                          isExceeded ? 'text-rose-600 font-semibold' : 'text-em font-semibold'
                        }
                      >
                        {inr(Math.abs(remaining))}
                      </span>{' '}
                      of {inr(budget)}
                    </p>
                    <span
                      className={`text-xs font-semibold shrink-0 ${
                        isExceeded ? 'text-rose-600' : percentage >= 80 ? 'text-orange-600' : 'text-em'
                      }`}
                    >
                      {isExceeded ? 'Over' : `${Math.round(percentage)}%`}
                    </span>
                  </div>

                  {/* Where the box actually lands at checkout. The bar above is
                      products + GST (all this page decides); the builder still
                      adds packaging and the payment fee, so we say so now
                      instead of surprising the customer later. */}
                  {boxProducts.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-bdr flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-xs text-ink-2">
                        Est. final cost per box{' '}
                        <span className="tabnum font-semibold text-ink">{inr(estFinalPerBox)}</span>
                      </p>
                      <p className="text-[11px] text-ink-3 tabnum">
                        {inr(subtotal)} products incl. GST
                        {packagingIncGst > 0 && <> + packaging from {inr(packagingIncGst)}</>}
                        {' '}+ {EFFECTIVE_FEE_PCT.toFixed(2)}% payment fee {inr(paymentFee)} · shipping
                        added at checkout
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-normal text-ink">Choose products</h2>
                  <p className="text-sm text-ink-2 mt-1 tabnum">
                    Every price below includes that product's GST.{' '}
                    {fitOnly
                      ? `Showing items up to ${inr(Math.max(0, remaining))} — what's left of your box budget.`
                      : `Showing all products · ${inr(Math.max(0, remaining))} left in your box.`}
                  </p>
                </div>

                {/* Search + category */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search products…"
                      className="w-full h-10 pl-9 pr-3 rounded-full border-2 border-bdr bg-white focus:border-em focus:outline-none text-sm"
                    />
                  </div>
                  {categories.length > 0 && (
                    <select
                      value={selectedCat}
                      onChange={(e) => setSelectedCat(e.target.value)}
                      className="h-10 px-3 rounded-full border-2 border-bdr bg-white text-sm"
                    >
                      <option value="all">All categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm text-ink-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fitOnly}
                      onChange={(e) => setFitOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-2 border-bdr accent-[#1A6B4F]"
                    />
                    Only show items that fit my remaining budget
                  </label>
                  <span className="text-[11px] text-ink-3">
                    {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Grid */}
                {productsLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-56 rounded-md bg-white/60 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filtered.map((p) => {
                      const base = tierPriceFor(p.priceTiers, packQuantity);
                      // The card leads with the tax-in price because that's what
                      // the budget is measured in — what you see is what comes
                      // off the bar.
                      const rate = p.hsn?.gstRate ?? DEFAULT_GST_RATE;
                      const price = gstInclusive(base, p.hsn?.gstRate);
                      const inBox = inBoxIds.has(p.id);
                      const img = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url;
                      const affordable = price <= remaining || inBox;
                      const moq = p.moq ?? MIN_BOX_QTY;
                      const moqBlocked = !inBox && moq > packQuantity;
                      return (
                        <div key={p.id} className="bg-white rounded-md border-2 border-bdr overflow-hidden flex flex-col">
                          <div className="aspect-square m-2 rounded-md bg-gray-50 flex items-center justify-center overflow-hidden">
                            {img ? (
                              <img src={img} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-4xl opacity-40">🎁</span>
                            )}
                          </div>
                          <div className="px-3 pb-3 flex flex-col flex-1">
                            {p.brand && <p className="text-[11px] text-ink-3">{p.brand}</p>}
                            <h4 className="text-sm font-medium line-clamp-2 text-ink">{p.name}</h4>
                            <p className="text-sm font-bold tabnum mt-1 text-ink">
                              {inr(price)}{' '}
                              <span className="font-normal text-[10px] text-ink-3">incl. GST</span>
                            </p>
                            <p className="text-[10px] text-ink-3 tabnum">
                              {inr(base)} + {rate}% GST
                            </p>
                            {moqBlocked ? (
                              <p className="text-[10px] text-amber-600 mt-0.5">Needs min {moq} boxes</p>
                            ) : (
                              !affordable && !inBox && (
                                <p className="text-[10px] text-rose-500 mt-0.5">Over remaining budget</p>
                              )
                            )}
                            <button
                              onClick={() => handleToggle(p)}
                              disabled={moqBlocked}
                              className={`mt-2 h-8 rounded-full text-xs font-semibold transition flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                                inBox
                                  ? 'bg-em text-white hover:bg-em-600'
                                  : 'border-2 border-em text-em hover:bg-em-50'
                              }`}
                            >
                              {inBox ? (<><Check className="h-3.5 w-3.5" /> Added</>) : (<><Plus className="h-3.5 w-3.5" /> Add to Box</>)}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {filtered.length === 0 && (
                      <div className="col-span-full text-center py-16 text-ink-3">
                        <p className="text-3xl mb-2">🔍</p>
                        <p className="text-sm">
                          {fitOnly && remaining <= 0
                            ? "You've used up your budget — remove an item or raise the budget to add more."
                            : 'No products match your search.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sticky checkout bar — the sidebar Proceed button scrolls out of reach as
          the box fills, so pin one to the bottom of the viewport. Stays on screen
          the whole time the user is adding products, with the CTA bottom-right. */}
      {boxProducts.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t-2 border-bdr shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-ink-3">
                {boxProducts.length} item{boxProducts.length !== 1 ? 's' : ''} · {packQuantity} boxes
              </p>
              <p className="text-sm text-ink-2 tabnum truncate">
                Per box <span className="font-semibold text-ink">{inr(subtotal)}</span>
                <span className="hidden sm:inline text-ink-3">
                  {' '}· est. final {inr(estFinalPerBox)}
                </span>
                {isExceeded && (
                  <span className="ml-2 text-rose-600 font-semibold">
                    {inr(subtotal - budget)} over budget
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleProceed}
              className="shrink-0 py-3 px-6 bg-em hover:bg-em-600 text-white font-medium rounded-2xl transition"
            >
              Proceed to Customize →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
