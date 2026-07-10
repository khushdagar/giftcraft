'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { Search, Plus, Check, X, ChevronLeft } from 'lucide-react';
import { useBoxStore, type BoxProduct } from '@/store/box';
import { useBuilderStore } from '@/store/builder';
import { BoxBudgetMeter } from '@/components/builder/box-budget-meter';

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

  const builderAddProduct = useBuilderStore((s) => s.addProduct);
  const builderSetPackQuantity = useBuilderStore((s) => s.setPackQuantity);

  // Per-box subtotal at the current volume tier (re-prices live when qty changes).
  const subtotal = useMemo(
    () => boxProducts.reduce((sum, p) => sum + tierPriceFor(p.priceTiers, packQuantity), 0),
    [boxProducts, packQuantity]
  );

  // Local budget-entry fields
  const [budgetInput, setBudgetInput] = useState('');
  const [qtyInput, setQtyInput] = useState('25');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // Honour ?budget= / ?category= deep links (optional convenience)
  useEffect(() => {
    setMounted(true);
    const budgetParam = searchParams.get('budget');
    const categoryParam = searchParams.get('category');
    if (budgetParam) {
      const parsed = parseInt(budgetParam, 10);
      if (!isNaN(parsed) && parsed > 0) setBudget(parsed);
    }
    if (categoryParam) setCategoryId(categoryParam);
  }, [searchParams, setBudget, setCategoryId]);

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

  // The box quantity can never drop below 25 (corporate floor) or below the
  // highest MOQ among the products already in the box.
  const minBoxQty = useMemo(
    () => boxProducts.reduce((m, p) => Math.max(m, p.moq ?? MIN_BOX_QTY), MIN_BOX_QTY),
    [boxProducts]
  );

  // Catalogue price bounds (tier-1 price) for the range slider.
  const priceBounds = useMemo(() => {
    const prices = products
      .map((p) => tierPriceFor(p.priceTiers, packQuantity))
      .filter((n) => n > 0);
    return {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    };
  }, [products, packQuantity]);

  // Re-base the slider to the catalogue range when products load or the volume
  // tier (pack quantity) shifts the effective per-unit prices.
  useEffect(() => {
    if (products.length) {
      setPriceMin(priceBounds.min);
      setPriceMax(priceBounds.max);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length, packQuantity]);

  const fitRemaining = () => {
    const cap = Math.max(priceBounds.min, Math.min(Math.floor(remaining), priceBounds.max));
    setPriceMin(priceBounds.min);
    setPriceMax(cap);
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.brand?.toLowerCase().includes(q)) return false;
      }
      if (selectedCat !== 'all' && !p.categories?.some((c) => c.categoryId === selectedCat)) {
        return false;
      }
      const price = tierPriceFor(p.priceTiers, packQuantity);
      if (priceMin !== null && price < priceMin) return false;
      if (priceMax !== null && price > priceMax) return false;
      return true;
    });
  }, [products, search, selectedCat, priceMin, priceMax, packQuantity]);

  const handleStart = () => {
    const b = parseInt(budgetInput, 10);
    const q = parseInt(qtyInput, 10);
    if (isNaN(b) || b <= 0) return;
    // Enforce the 25-box corporate minimum.
    setPackQuantity(!isNaN(q) && q > MIN_BOX_QTY ? q : MIN_BOX_QTY);
    setBudget(b);
  };

  const handleToggle = (p: ApiProduct) => {
    if (inBoxIds.has(p.id)) {
      removeBoxProduct(p.id);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">NEW FEATURE</p>
          <h1 className="text-4xl sm:text-5xl font-normal mt-2 text-ink">Build Your Box</h1>
          <p className="text-base text-ink-2 mt-3 max-w-2xl">
            Create a custom gift pack within your budget. We'll help you maximize every rupee!
          </p>
        </motion.div>

        {/* ── Budget entry (no budget yet) ── */}
        {budget === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl bg-white rounded-md border-2 border-amber-200 p-8"
          >
            <h2 className="text-2xl font-normal text-ink mb-2">Set your budget &amp; quantity</h2>
            <p className="text-sm text-ink-2 mb-6">
              Tell us your per-box budget and how many boxes you need — we price every product at the
              right bulk tier and track every rupee as you build.
            </p>

            {/* Budget */}
            <label className="block text-sm font-medium text-ink mb-2">Per-box budget</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {QUICK_BUDGETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBudgetInput(String(b))}
                  className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition ${
                    budgetInput === String(b)
                      ? 'border-amber-400 bg-amber-100 text-amber-900'
                      : 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400'
                  }`}
                >
                  {inr(b)}
                </button>
              ))}
            </div>
            <div className="relative mb-6">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₹</span>
              <input
                type="number"
                min={1}
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                placeholder="Custom amount, e.g. 5000"
                className="w-full h-11 pl-7 pr-3 rounded-md border-2 border-bdr focus:border-em focus:outline-none"
              />
            </div>

            {/* Quantity */}
            <label className="block text-sm font-medium text-ink mb-2">How many boxes?</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {QUICK_QTYS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQtyInput(String(q))}
                  className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition ${
                    qtyInput === String(q)
                      ? 'border-em bg-em-50 text-em-700'
                      : 'border-bdr bg-white text-ink-2 hover:border-em-300'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={MIN_BOX_QTY}
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="Custom quantity, e.g. 25"
              className="w-full h-11 px-3 rounded-md border-2 border-bdr focus:border-em focus:outline-none mb-2"
            />
            <p className="text-xs text-ink-3 mb-6">
              More boxes unlock lower per-unit pricing. Minimum 25 for corporate gifting.
            </p>

            <button
              type="button"
              onClick={handleStart}
              disabled={!budgetInput || parseInt(budgetInput, 10) <= 0}
              className="w-full px-6 h-12 bg-em hover:bg-em-600 disabled:opacity-50 text-white font-semibold rounded-2xl transition shadow-sm"
            >
              Next →
            </button>
          </motion.div>
        ) : (
          /* ── Budget set — inline budget builder ── */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Budget meter + box summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto pr-1">
                <BoxBudgetMeter budget={budget} spent={subtotal} />

                {/* Boxes (pack quantity) — drives the bulk pricing tier */}
                <div className="bg-white rounded-md border-2 border-bdr p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase font-semibold text-ink-3">Boxes</p>
                      <p className="text-[11px] text-ink-3">More boxes → lower per-unit price</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPackQuantity(Math.max(minBoxQty, packQuantity - 5))}
                        className="h-8 w-8 rounded-full border-2 border-bdr text-ink hover:border-em"
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
                        className="w-16 h-8 text-center rounded-md border-2 border-bdr focus:border-em focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setPackQuantity(packQuantity + 5)}
                        className="h-8 w-8 rounded-full border-2 border-bdr text-ink hover:border-em"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setBudget(0);
                      setBudgetInput(String(budget));
                      setQtyInput(String(packQuantity));
                    }}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-2xl border-2 border-em text-em text-sm font-semibold hover:bg-em-50 transition"
                  >
                    <ChevronLeft className="h-4 w-4" /> Change budget &amp; quantity
                  </button>
                </div>

                {/* Your Box */}
                <div className="bg-white rounded-md border-2 border-bdr p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-ink">Your Box</h3>
                    <span className="text-xs text-ink-3">{boxProducts.length} item{boxProducts.length !== 1 ? 's' : ''}</span>
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
                            <p className="text-xs text-ink-3 tabnum">{inr(tierPriceFor(p.priceTiers, packQuantity))}</p>
                          </div>
                          <button
                            onClick={() => removeBoxProduct(p.id)}
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

            {/* Right: Product picker */}
            <div className="lg:col-span-2 space-y-5">
              <div>
                <p className="text-xs font-normal uppercase tracking-wider text-ink-3">STEP 01</p>
                <h2 className="text-2xl font-normal mt-1 text-ink">Choose products</h2>
                <p className="text-sm text-ink-2 mt-1">
                  Pick items that fit your {inr(budget)} box ({packQuantity} boxes · priced at this volume).{' '}
                  {remaining >= 0 ? `${inr(remaining)} left.` : `${inr(-remaining)} over.`}
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

              {/* Price range filter */}
              {priceBounds.max > 0 && (
                <div className="bg-white rounded-md border-2 border-bdr p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-ink">Price range</h4>
                    <button
                      type="button"
                      onClick={fitRemaining}
                      className="text-xs text-em underline hover:text-em-600"
                    >
                      Fit my remaining ({inr(Math.max(0, remaining))})
                    </button>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-ink-2 mb-1 tabnum">
                    <span>{inr(priceMin ?? priceBounds.min)}</span>
                    <span>{inr(priceMax ?? priceBounds.max)}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={priceMin ?? priceBounds.min}
                      onChange={(e) =>
                        setPriceMin(Math.min(Number(e.target.value), priceMax ?? priceBounds.max))
                      }
                      className="w-full"
                      style={{ accentColor: '#1A6B4F' }}
                    />
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={priceMax ?? priceBounds.max}
                      onChange={(e) =>
                        setPriceMax(Math.max(Number(e.target.value), priceMin ?? priceBounds.min))
                      }
                      className="w-full"
                      style={{ accentColor: '#1A6B4F' }}
                    />
                  </div>
                  <p className="text-[11px] text-ink-3 mt-2">
                    Showing {filtered.length} product{filtered.length !== 1 ? 's' : ''} in range.
                  </p>
                </div>
              )}

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
                      <p className="text-sm">No products match your search.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
