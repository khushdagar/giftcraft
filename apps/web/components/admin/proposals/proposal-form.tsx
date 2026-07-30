'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { Search, Plus, X, Send, Loader2 } from 'lucide-react';
import { formatRupees } from '@/lib/utils';
import { packagingSizeForCount, priceForSize } from '@/lib/packaging-designs';

interface PriceTier {
  minQty: number;
  maxQty: number | null;
  sellPrice: number;
}

interface SelectedProduct {
  productId: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  priceTiers: PriceTier[];
}

interface BoxOption {
  id: string;
  name: string;
  price: number;
  sizePrices: Record<string, number>; // e.g. { small: 80, medium: 120 }
  imageUrl: string | null;
}

interface AddonOption {
  id: string;
  name: string;
  price: number; // per pack
  imageUrl: string | null;
}

/** The tier price that applies at this pack quantity (tier 1 as fallback). */
function tierPrice(tiers: PriceTier[], qty: number): number {
  const match =
    tiers.find((t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty)) ?? tiers[0];
  return match ? Number(match.sellPrice) : 0;
}

export function ProposalForm({
  prefill,
  onSent,
}: {
  prefill: { email: string; name: string; company: string };
  // Called after a successful send (used by the enquiries popup to close itself).
  onSent?: () => void;
}) {
  const router = useRouter();

  const [recipientEmail, setRecipientEmail] = useState(prefill.email);
  const [recipientName, setRecipientName] = useState(prefill.name);
  const [companyName, setCompanyName] = useState(prefill.company);
  const [message, setMessage] = useState('');
  const [packQuantity, setPackQuantity] = useState(25);
  const [discount, setDiscount] = useState(0);

  const [items, setItems] = useState<SelectedProduct[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  // Box / add-ons / shipping
  const [boxes, setBoxes] = useState<BoxOption[]>([]);
  const [addonOptions, setAddonOptions] = useState<AddonOption[]>([]);
  const [boxId, setBoxId] = useState('');
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/packaging')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setBoxes(d.map((b: any) => ({
        id: b.id,
        name: b.name,
        price: Number(b.price) || 0,
        sizePrices: b.sizePrices || {},
        imageUrl: b.imageUrl ?? null,
      }))))
      .catch(() => {/* box selector just stays empty */});
    fetch('/api/addons')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setAddonOptions(d.map((a: any) => ({
        id: a.id,
        name: a.name,
        price: Number(a.price) || 0,
        imageUrl: a.imageUrl ?? null,
      }))))
      .catch(() => {/* addons selector just stays empty */});
  }, []);

  const box = boxes.find((b) => b.id === boxId) || null;
  // Size is never picked by hand — it follows the product count, exactly like
  // the builder's customize step (1–2 → Small, 3–4 → Medium, 5+ → Large).
  const autoSize = packagingSizeForCount(items.length);
  const boxPrice = box ? priceForSize(box, autoSize) : 0;

  const toggleAddon = (id: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const chosenAddons = addonOptions.filter((a) => selectedAddonIds.includes(a.id));
  const addonsPerPack = chosenAddons.reduce((sum, a) => sum + a.price, 0);

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const all = data.products || [];
      setResults(all.filter((p: any) => !items.some((it) => it.productId === p.id)));
    } catch {
      toast.error('Failed to search products');
    } finally {
      setSearching(false);
    }
  };

  const addItem = (product: any) => {
    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        brand: product.brand ?? null,
        imageUrl: product.images?.[0]?.url ?? null,
        priceTiers: (product.priceTiers ?? []).map((t: any) => ({
          minQty: t.minQty,
          maxQty: t.maxQty ?? null,
          sellPrice: Number(t.sellPrice),
        })),
      },
    ]);
    setResults((prev) => prev.filter((p) => p.id !== product.id));
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const productsPerPack = items.reduce((sum, it) => sum + tierPrice(it.priceTiers, packQuantity), 0);
  const perPack = productsPerPack + boxPrice + addonsPerPack;
  const estSubtotal = Math.max(0, perPack * packQuantity - discount);

  const handleSend = async () => {
    if (!recipientEmail.trim() || !/^\S+@\S+\.\S+$/.test(recipientEmail.trim())) {
      toast.error('Enter a valid recipient email');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one product');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/admin/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim() || undefined,
          companyName: companyName.trim() || undefined,
          message: message.trim() || undefined,
          productIds: items.map((it) => it.productId),
          packQuantity,
          discount: discount || undefined,
          packaging: box
            ? {
                id: box.id,
                name: box.name,
                price: boxPrice,
                size: autoSize.toLowerCase(),
              }
            : null,
          addons: chosenAddons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to send proposal');
      if (data.emailSent) {
        toast.success(`Proposal sent to ${recipientEmail.trim()}`);
      } else {
        toast.warning('Proposal created, but the email could not be delivered. You can copy the quote link from the proposals list.');
      }
      if (onSent) {
        onSent();
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send proposal');
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Left column — recipient + products */}
      <div className="space-y-6">
        {/* Recipient */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-600">Recipient</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Email *</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="lead@company.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Contact name</label>
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Priya Sharma"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Company</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Pvt Ltd"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Personal note (shown in the email)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Thanks for your enquiry — here's the pack we discussed…"
                className={inputCls}
              />
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-600">Products</h2>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search products to add…"
              className={`${inputCls} pl-9`}
            />
          </div>

          {searching && <p className="mb-3 text-xs text-gray-400">Searching…</p>}

          {results.length > 0 && (
            <ul className="mb-4 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
              {results.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-50">
                    {p.images?.[0]?.url && (
                      <Image src={p.images[0].url} alt={p.name} fill className="object-cover" sizes="40px" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-900">{p.name}</p>
                    {p.brand && <p className="truncate text-xs text-gray-500">{p.brand}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(p)}
                    className="shrink-0 rounded-md border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-100"
                    title="Add"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mb-2 text-xs font-medium text-gray-500">In this pack ({items.length})</p>
          {items.length === 0 ? (
            <p className="rounded-md border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-400">
              No products added yet — search above.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
              {items.map((it) => (
                <li key={it.productId} className="flex items-center gap-3 px-3 py-2">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-50">
                    {it.imageUrl && (
                      <Image src={it.imageUrl} alt={it.name} fill className="object-cover" sizes="40px" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-900">{it.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatRupees(tierPrice(it.priceTiers, packQuantity))} / unit at {packQuantity} packs
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(it.productId)}
                    className="shrink-0 text-gray-400 hover:text-red-600"
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Box & Add-ons */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-600">Box &amp; Add-ons</h2>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Gift box (per pack)</label>
            <select value={boxId} onChange={(e) => setBoxId(e.target.value)} className={inputCls}>
              <option value="">No box</option>
              {boxes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {formatRupees(priceForSize(b, autoSize))}
                </option>
              ))}
            </select>
            {box && (
              <p className="mt-2 text-xs text-gray-500">
                Size auto-selected:{' '}
                <span className="font-medium text-gray-700">{autoSize}</span>{' '}
                (based on {items.length} product{items.length === 1 ? '' : 's'} in the pack
                — same rule as the gift builder). Add or remove products and the size
                &amp; price update automatically.
              </p>
            )}
          </div>

          <p className="mb-2 mt-5 text-xs font-medium text-gray-500">Add-ons (per pack)</p>
          {addonOptions.length === 0 ? (
            <p className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
              No add-ons available.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
              {addonOptions.map((a) => (
                <li key={a.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedAddonIds.includes(a.id)}
                      onChange={() => toggleAddon(a.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{a.name}</span>
                    <span className="shrink-0 text-xs text-gray-500 tabular-nums">{formatRupees(a.price)}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Right column — quantities + summary + send */}
      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-600">Pack &amp; Pricing</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Number of gift packs</label>
              <input
                type="number"
                min={1}
                value={packQuantity}
                onChange={(e) => setPackQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Discount (₹, optional)</label>
              <input
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Products ({items.length})</span>
              <span className="tabular-nums">{formatRupees(productsPerPack)}</span>
            </div>
            {box && (
              <div className="flex justify-between text-gray-600">
                <span>
                  Box: {box.name} ({autoSize})
                </span>
                <span className="tabular-nums">{formatRupees(boxPrice)}</span>
              </div>
            )}
            {chosenAddons.length > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Add-ons ({chosenAddons.length})</span>
                <span className="tabular-nums">{formatRupees(addonsPerPack)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Per pack</span>
              <span className="tabular-nums">{formatRupees(perPack)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span className="text-xs">Calculated at checkout</span>
            </div>
            <div className="flex justify-between font-medium text-gray-900">
              <span>Est. subtotal × {packQuantity}</span>
              <span className="tabular-nums">{formatRupees(estSubtotal)}</span>
            </div>
            <p className="pt-1 text-xs text-gray-400">
              Shipping is calculated at checkout once the lead enters their delivery
              address. Final total with GST and payment fee is computed when you send,
              and shown on the quote page and PDF.
            </p>
          </div>
        </section>

        <button
          type="button"
          onClick={handleSend}
          disabled={sending || items.length === 0 || !recipientEmail.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? 'Sending…' : 'Send Proposal Email'}
        </button>
        <p className="text-center text-xs text-gray-400">
          The lead receives a quote link + proposal deck PDF, valid for 30 days.
        </p>
      </div>
    </div>
  );
}
