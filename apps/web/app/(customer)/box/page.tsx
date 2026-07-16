'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { Search, Plus, Check, X } from 'lucide-react';
import { useBoxStore, type BoxProduct } from '@/store/box';
import { useBuilderStore } from '@/store/builder';

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

function inr(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
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
  const { data: session, status } = useSession();
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

  // Per-box subtotal at the current volume tier (re-prices live when qty changes).
  const subtotal = useMemo(
    () => boxProducts.reduce((sum, p) => sum + tierPriceFor(p.priceTiers, packQuantity), 0),
    [boxProducts, packQuantity]
  );

  // Budget is edited inline in the tracker; keep a local string for the custom field.
  const [budgetInput, setBudgetInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  // Auto-fit: by default only show products that fit the remaining budget.
  const [fitOnly, setFitOnly] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

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
      const res = await fetch('/api/products?limit=300');
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      return data.products || [];
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
  const remaining = budget - subtotal;
  const isExceeded = budget > 0 && subtotal > budget;
  const percentage = budget > 0 ? Math.min((subtotal / budget) * 100, 100) : 0;

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
        const price = tierPriceFor(p.priceTiers, packQuantity);
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

  if (!mounted || status === 'loading' || !session) {
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">NEW FEATURE</p>
          <h1 className="text-4xl sm:text-5xl font-normal mt-2 text-ink">Build Your Box</h1>
          <p className="text-base text-ink-2 mt-3 max-w-2xl">
            Create a custom gift pack within your budget. We'll help you maximize every rupee!
          </p>
        </motion.div>

        {/* ── Two columns: budget/tracking sidebar + product picker ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: budget box + simple tracking line + your box */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Budget box */}
              <div className="bg-white rounded-md border-2 border-amber-200 p-4">
                <h3 className="text-sm font-bold text-ink mb-3">Set your budget</h3>

                {/* Per-box budget */}
                <label className="block text-xs uppercase font-semibold text-ink-3 mb-2">
                  Per-box budget
                </label>
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
                    value={packQuantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) setPackQuantity(Math.max(minBoxQty, v));
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
                    No products yet. Add items from the right to build your box.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-72 overflow-y-auto">
                    {boxProducts.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-ink">{p.name}</p>
                          <p className="text-xs text-ink-3 tabnum">
                            {inr(tierPriceFor(p.priceTiers, packQuantity))}
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
                    ))}
                  </ul>
                )}

                {boxProducts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-bdr space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-2">Per box</span>
                      <span className="tabnum font-semibold text-ink">{inr(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-ink-3">
                      <span>× {packQuantity} boxes (order total)</span>
                      <span className="tabnum">{inr(subtotal * packQuantity)}</span>
                    </div>
                  </div>
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
              </div>
            ) : (
              <>
                {/* Horizontal budget tracking line */}
                <div className="bg-white rounded-md border-2 border-bdr px-4 py-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-ink shrink-0">Budget tracking</span>
                    <div className="relative flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
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
                </div>

                <div>
                  <h2 className="text-2xl font-normal text-ink">Choose products</h2>
                  <p className="text-sm text-ink-2 mt-1 tabnum">
                    {fitOnly
                      ? `Showing items ${inr(0)} to ${inr(Math.max(0, remaining))} that fit your remaining budget.`
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
                      const price = tierPriceFor(p.priceTiers, packQuantity);
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
                            <p className="text-sm font-bold tabnum mt-1 text-ink">{inr(price)}</p>
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
    </div>
  );
}
