'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Search,
  X,
  Send,
  Loader2,
  Plus,
  Copy,
  Trash2,
  ChevronDown,
  Check,
  Package,
  Layers,
  MailCheck,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { formatRupees } from '@/lib/utils';
import { packagingSizeForCount, priceForSize } from '@/lib/packaging-designs';
import { FieldError } from '@/components/ui/field-error';
import { validateEmail } from '@/lib/validation';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface PriceTier {
  minQty: number;
  maxQty: number | null;
  sellPrice: number;
}

interface CatalogProduct {
  id: string;
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

/** A curated pack from the storefront — one click adds all its products. */
interface CuratedPackOption {
  id: string;
  name: string;
  imageUrl: string | null;
  items: CatalogProduct[];
}

/** One pack option being composed. Each becomes its own quote when sent. */
interface Pack {
  key: string;
  label: string;
  tagline: string;
  packQuantity: number;
  discount: number;
  items: CatalogProduct[];
  boxId: string;
  addonIds: string[];
  // Where each product came from. Curated packs share popular SKUs, so "is
  // this curated pack in the option?" can't be answered by checking whether its
  // products happen to be present — that made clicking pack B strip the
  // products pack A had added. Provenance is tracked instead: appliedPackIds
  // is the set of curated packs actually applied here, manualIds the products
  // picked one by one from the grid.
  appliedPackIds: string[];
  manualIds: string[];
}

/** The tier price that applies at this pack quantity (tier 1 as fallback). */
function tierPrice(tiers: PriceTier[], qty: number): number {
  const match =
    tiers.find((t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty)) ?? tiers[0];
  return match ? Number(match.sellPrice) : 0;
}

function toCatalogProduct(p: any): CatalogProduct {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? null,
    imageUrl: p.images?.[0]?.url ?? null,
    priceTiers: (p.priceTiers ?? []).map((t: any) => ({
      minQty: t.minQty,
      maxQty: t.maxQty ?? null,
      sellPrice: Number(t.sellPrice),
    })),
  };
}

const inputCls =
  'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500';

const emptyPack = (n: number): Pack => ({
  key: `pack-${n}`,
  label: `Pack ${n}`,
  tagline: '',
  packQuantity: 25,
  discount: 0,
  items: [],
  boxId: '',
  addonIds: [],
  appliedPackIds: [],
  manualIds: [],
});

/** Draft autosave — a stuck preview or a stray reload must not cost the work. */
const DRAFT_KEY = 'givoo:proposal-draft:v1';

interface Draft {
  packs: Pack[];
  seq: number;
  activeKey: string;
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  message: string;
}

function loadDraft(): Draft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!Array.isArray(d?.packs) || d.packs.length === 0) return null;
    // Older drafts predate provenance tracking — treat everything already in
    // them as hand-picked so nothing gets silently removed later.
    d.packs = d.packs.map((p) => ({
      ...p,
      items: p.items ?? [],
      addonIds: p.addonIds ?? [],
      appliedPackIds: p.appliedPackIds ?? [],
      manualIds: p.manualIds ?? (p.items ?? []).map((it) => it.id),
    }));
    return d;
  } catch {
    return null; // a corrupt draft is not worth blocking the page over
  }
}

export function ProposalBuilder({
  prefill,
  // Set when the composer was opened from a GoHighLevel row — sending moves
  // that lead to "Proposal sent", same as the old dialog did.
  leadId,
}: {
  prefill: { email: string; name: string; company: string };
  leadId?: string | null;
}) {
  const router = useRouter();

  const [recipientEmail, setRecipientEmail] = useState(prefill.email);
  const [recipientName, setRecipientName] = useState(prefill.name);
  const [companyName, setCompanyName] = useState(prefill.company);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  // "Preview proposal" — the deck PDF for the current draft, built by the same
  // pricer and renderer the send uses, but nothing is saved or emailed.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Object URL for the rendered deck. Revoked whenever it is replaced or the
  // dialog closes, so a long editing session doesn't leak blobs.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Set once the proposal is created — replaces the form with a delivery
  // receipt, so "did the email actually go out?" is never a guess.
  const [sent, setSent] = useState<{
    to: string;
    emailSent: boolean;
    emailSkipped: boolean;
    emailError: string | null;
    deckCount: number;
    proposalToken: string;
    packs: { label: string; shareToken: string }[];
  } | null>(null);

  // Pack options. Numbering never reuses a key, so removing a pack can't
  // collide with a later one.
  const packSeq = useRef(1);
  const [packs, setPacks] = useState<Pack[]>([emptyPack(1)]);
  const [activeKey, setActiveKey] = useState('pack-1');
  // Autosave only starts once any saved draft has been restored, so the empty
  // first render can't overwrite the draft it is about to load.
  const draftReady = useRef(false);

  // Restore on mount rather than in a lazy initialiser — localStorage doesn't
  // exist during SSR, and seeding state from it there would hydrate mismatched.
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setPacks(draft.packs);
      packSeq.current = Math.max(draft.seq || 1, draft.packs.length);
      setActiveKey(
        draft.packs.some((p) => p.key === draft.activeKey)
          ? draft.activeKey
          : draft.packs[0]!.key
      );
      // A composer opened from a lead carries that lead's details in the URL —
      // those win over whatever the last draft had typed in.
      if (!prefill.email && draft.recipientEmail) setRecipientEmail(draft.recipientEmail);
      if (!prefill.name && draft.recipientName) setRecipientName(draft.recipientName);
      if (!prefill.company && draft.companyName) setCompanyName(draft.companyName);
      if (draft.message) setMessage(draft.message);
      toast('Unsent draft restored', { description: 'Your pack options were still here.' });
    }
    draftReady.current = true;
    // Mount-only: prefill comes from the URL and never changes for a given page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearDraft = () => {
    draftReady.current = false;
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {/* private mode — nothing to clear */}
  };

  // Autosave every edit. The composer holds a lot of work and nothing else
  // persists it — a reload used to throw all of it away.
  useEffect(() => {
    if (!draftReady.current) return;
    // An untouched composer is never worth saving — and skipping it stops the
    // blank first commit from overwriting the draft the restore is loading.
    const pristine =
      packs.length === 1 &&
      packs[0]!.items.length === 0 &&
      !recipientEmail.trim() &&
      !message.trim();
    if (pristine) return;
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          packs,
          seq: packSeq.current,
          activeKey,
          recipientEmail,
          recipientName,
          companyName,
          message,
        } satisfies Draft)
      );
    } catch {/* quota or private mode — autosave is best-effort */}
  }, [packs, activeKey, recipientEmail, recipientName, companyName, message]);

  // Catalog browsing state — shared across packs so switching packs doesn't
  // refetch the grid.
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [boxes, setBoxes] = useState<BoxOption[]>([]);
  const [addonOptions, setAddonOptions] = useState<AddonOption[]>([]);
  const [curatedPacks, setCuratedPacks] = useState<CuratedPackOption[]>([]);
  // Grid mode: false = catalog products, true = curated packs.
  const [showPacks, setShowPacks] = useState(false);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) =>
        setCategories(
          (d.data ?? []).map((c: any) => ({ id: c.id, name: c.name })).slice(0, 12)
        )
      )
      .catch(() => {/* category chips just stay empty */});
    fetch('/api/packaging')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) =>
        Array.isArray(d) &&
        setBoxes(
          d.map((b: any) => ({
            id: b.id,
            name: b.name,
            price: Number(b.price) || 0,
            sizePrices: b.sizePrices || {},
            imageUrl: b.imageUrl ?? null,
          }))
        )
      )
      .catch(() => {/* box selector just stays empty */});
    fetch('/api/addons')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) =>
        Array.isArray(d) &&
        setAddonOptions(
          d.map((a: any) => ({
            id: a.id,
            name: a.name,
            price: Number(a.price) || 0,
            imageUrl: a.imageUrl ?? null,
          }))
        )
      )
      .catch(() => {/* addons selector just stays empty */});
    fetch('/api/packs')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) =>
        Array.isArray(d) &&
        setCuratedPacks(
          d
            .map((pk: any) => {
              const items = (pk.items ?? []).map(toCatalogProduct);
              return {
                id: pk.id,
                name: pk.name,
                // Packs often carry no image of their own — borrow the first
                // member product's photo, same as the storefront listing.
                imageUrl:
                  pk.image ??
                  items.find((it: CatalogProduct) => it.imageUrl)?.imageUrl ??
                  null,
                items,
              };
            })
            .filter((pk: CuratedPackOption) => pk.items.length > 0)
        )
      )
      .catch(() => {/* curated-pack shortcuts just stay hidden */});
  }, []);

  // Catalog grid — debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ limit: '48', sort: 'featured' });
      if (search.trim()) params.set('search', search.trim());
      if (categoryId) params.set('categoryId', categoryId);
      fetch(`/api/products?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : { products: [] }))
        .then((d) => {
          if (!cancelled) setResults((d.products ?? []).map(toCatalogProduct));
        })
        .catch(() => {
          if (!cancelled) toast.error('Failed to load products');
        })
        .finally(() => {
          if (!cancelled) setLoadingProducts(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, categoryId]);

  const updatePack = (key: string, patch: Partial<Pack>) =>
    setPacks((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const addPack = () => {
    packSeq.current += 1;
    // Every option of a proposal is quoted for the same order size, so a new
    // pack inherits the quantity already set on the last one instead of
    // resetting to the default and being retyped each time.
    const last = packs[packs.length - 1];
    const next: Pack = {
      ...emptyPack(packSeq.current),
      ...(last ? { packQuantity: last.packQuantity } : {}),
    };
    setPacks((prev) => [...prev, next]);
    setActiveKey(next.key);
  };

  const duplicatePack = (key: string) => {
    const source = packs.find((p) => p.key === key);
    if (!source) return;
    packSeq.current += 1;
    const copy: Pack = {
      ...source,
      key: `pack-${packSeq.current}`,
      label: `${source.label} (copy)`,
      items: [...source.items],
      addonIds: [...source.addonIds],
      appliedPackIds: [...source.appliedPackIds],
      manualIds: [...source.manualIds],
    };
    setPacks((prev) => [...prev, copy]);
    setActiveKey(copy.key);
  };

  const removePack = (key: string) => {
    setPacks((prev) => {
      const next = prev.filter((p) => p.key !== key);
      if (key === activeKey && next[0]) setActiveKey(next[0].key);
      return next;
    });
  };

  const toggleProduct = (key: string, product: CatalogProduct) => {
    setPacks((prev) =>
      prev.map((p) => {
        if (p.key !== key) return p;
        const has = p.items.some((it) => it.id === product.id);
        return {
          ...p,
          items: has ? p.items.filter((it) => it.id !== product.id) : [...p.items, product],
          // Hand-picked products are pinned: removing a curated pack later must
          // not take them away.
          manualIds: has
            ? p.manualIds.filter((id) => id !== product.id)
            : [...p.manualIds, product.id],
        };
      })
    );
  };

  /**
   * One click pulls every product of a curated pack into the option; clicking
   * the same pack again takes it back out.
   *
   * Removal is provenance-aware. Curated packs overlap heavily, so dropping
   * every product that merely appears in this pack would also delete products
   * another applied pack contributed, or ones picked by hand from the grid —
   * which silently emptied options mid-build. Only products this pack is the
   * last remaining source of are removed.
   */
  const applyCuratedPack = (key: string, cp: CuratedPackOption) => {
    setPacks((prev) =>
      prev.map((p) => {
        if (p.key !== key) return p;

        if (!p.appliedPackIds.includes(cp.id)) {
          const missing = cp.items.filter((it) => !p.items.some((x) => x.id === it.id));
          return {
            ...p,
            items: [...p.items, ...missing],
            appliedPackIds: [...p.appliedPackIds, cp.id],
          };
        }

        const keptBy = new Set([
          ...p.manualIds,
          ...curatedPacks
            .filter((other) => other.id !== cp.id && p.appliedPackIds.includes(other.id))
            .flatMap((other) => other.items.map((it) => it.id)),
        ]);
        const drop = new Set(
          cp.items.map((it) => it.id).filter((id) => !keptBy.has(id))
        );
        return {
          ...p,
          items: p.items.filter((it) => !drop.has(it.id)),
          appliedPackIds: p.appliedPackIds.filter((id) => id !== cp.id),
        };
      })
    );
  };

  const toggleAddon = (key: string, addonId: string) =>
    setPacks((prev) =>
      prev.map((p) =>
        p.key === key
          ? {
              ...p,
              addonIds: p.addonIds.includes(addonId)
                ? p.addonIds.filter((a) => a !== addonId)
                : [...p.addonIds, addonId],
            }
          : p
      )
    );

  /**
   * Live per-pack numbers. Recomputed on every edit, so adding a product or
   * changing the quantity re-prices that pack (and only that pack) instantly.
   * Final GST + payment fee are computed server-side when the proposal is sent.
   */
  const priced = useMemo(
    () =>
      packs.map((pack) => {
        const box = boxes.find((b) => b.id === pack.boxId) || null;
        // Size is never picked by hand — it follows the product count, exactly
        // like the builder's customize step (1–2 → Small, 3–4 → Medium, 5+ → Large).
        const autoSize = packagingSizeForCount(pack.items.length);
        const boxPrice = box ? priceForSize(box, autoSize) : 0;
        const addons = addonOptions.filter((a) => pack.addonIds.includes(a.id));
        const addonsPerPack = addons.reduce((sum, a) => sum + a.price, 0);
        const productsPerPack = pack.items.reduce(
          (sum, it) => sum + tierPrice(it.priceTiers, pack.packQuantity),
          0
        );
        const perPack = productsPerPack + boxPrice + addonsPerPack;
        const subtotal = Math.max(0, perPack * pack.packQuantity - pack.discount);
        return { pack, box, autoSize, boxPrice, addons, addonsPerPack, productsPerPack, perPack, subtotal };
      }),
    [packs, boxes, addonOptions]
  );

  // Pack grid honours the same search box — matches the pack's name or any
  // product inside it. Filtered client-side over the full list.
  const packQuery = search.trim().toLowerCase();
  const matchedPacks = packQuery
    ? curatedPacks.filter(
        (cp) =>
          cp.name.toLowerCase().includes(packQuery) ||
          cp.items.some((it) => it.name.toLowerCase().includes(packQuery))
      )
    : curatedPacks;
  // Browsing shows a first page only — scrolling hundreds of collage tiles is
  // slower than typing a name. Searching still looks at every pack, and its
  // results are capped the same way.
  const PACK_PAGE = 50;
  const filteredPacks = matchedPacks.slice(0, PACK_PAGE);
  const hiddenPackCount = matchedPacks.length - filteredPacks.length;

  const activeIndex = Math.max(0, packs.findIndex((p) => p.key === activeKey));
  const active = priced[activeIndex];

  const recipientEmailError = recipientEmail.trim() ? validateEmail(recipientEmail) : null;
  const readyPacks = priced.filter((p) => p.pack.items.length > 0);
  const canSend = !!recipientEmail.trim() && !recipientEmailError && readyPacks.length === packs.length;

  // Same pack payload the send posts — one shape, so a preview can never
  // describe something different from what goes out.
  const packsPayload = () =>
    priced.map(({ pack, box, boxPrice, autoSize, addons }) => ({
      label: pack.label.trim() || undefined,
      tagline: pack.tagline.trim() || undefined,
      productIds: pack.items.map((it) => it.id),
      packQuantity: pack.packQuantity,
      discount: pack.discount || undefined,
      packaging: box
        ? { id: box.id, name: box.name, price: boxPrice, size: autoSize.toLowerCase() }
        : null,
      addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
    }));

  // Preview needs products, but not a recipient — an admin can check the layout
  // and the numbers before deciding who it goes to. The first option still
  // missing products is what blocks it; naming it beats a dead grey button.
  const blockingPack = priced.find((p) => p.pack.items.length === 0)?.pack ?? null;
  const blockingIndex = blockingPack ? packs.findIndex((p) => p.key === blockingPack.key) : -1;
  const previewBlockReason = blockingPack
    ? `${blockingPack.label || `Pack ${blockingIndex + 1}`} has no products yet — add at least one, or remove that option`
    : null;

  // In flight preview render, so closing the dialog can cancel it. Without this
  // a request that never returns left the button spinning and disabled until a
  // full page reload.
  const previewAbort = useRef<AbortController | null>(null);
  // The deck render downloads and transcodes every image; give it a generous
  // ceiling but never an unbounded one.
  const PREVIEW_TIMEOUT_MS = 90_000;

  const handlePreview = async () => {
    if (blockingPack) {
      toast.error(previewBlockReason!);
      setActiveKey(blockingPack.key);
      return;
    }
    previewAbort.current?.abort();
    const controller = new AbortController();
    previewAbort.current = controller;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, PREVIEW_TIMEOUT_MS);

    setPreviewOpen(true);
    setPreviewLoading(true);
    // Drop the previous render — the packs have probably changed since.
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    try {
      const res = await fetch('/api/admin/proposals/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim() || undefined,
          packs: packsPayload(),
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error((await res.text()) || 'Failed to build preview');
      const blob = await res.blob();
      // A newer preview (or a close) superseded this one while it rendered.
      if (previewAbort.current !== controller) return;
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      if (timedOut) {
        toast.error('Preview took too long to render — try again, or send fewer options at once');
        setPreviewOpen(false);
      } else if (!controller.signal.aborted) {
        toast.error(err instanceof Error ? err.message : 'Failed to build preview');
        setPreviewOpen(false);
      }
      // A plain abort is the admin closing the dialog — no error to report.
    } finally {
      clearTimeout(timer);
      // Only the newest request owns the spinner.
      if (previewAbort.current === controller) {
        previewAbort.current = null;
        setPreviewLoading(false);
      }
    }
  };

  // The blob outlives the dialog otherwise — free it on close and on unmount.
  // Closing also cancels an in-flight render and releases the button.
  const closePreview = () => {
    previewAbort.current?.abort();
    previewAbort.current = null;
    setPreviewLoading(false);
    setPreviewOpen(false);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  };
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  // Leaving the page mid-render must not leave the request hanging.
  useEffect(() => () => previewAbort.current?.abort(), []);

  const handleSend = async () => {
    const emailProblem = validateEmail(recipientEmail);
    if (emailProblem) {
      toast.error(emailProblem);
      return;
    }
    const empty = priced.find((p) => p.pack.items.length === 0);
    if (empty) {
      toast.error(`"${empty.pack.label}" has no products — add at least one or remove the pack`);
      setActiveKey(empty.pack.key);
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
          packs: packsPayload(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to send proposal');
      if (leadId) {
        // Best-effort — the proposal is already out either way.
        fetch('/api/admin/ghl/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId, status: 'quoted' }),
        }).catch(() => {/* status stays as-is; admin can change it by hand */});
      }
      if (data.emailSent) {
        toast.success(
          `Email delivered to ${recipientEmail.trim()} — ${packs.length} pack option${packs.length === 1 ? '' : 's'}`
        );
      } else if (data.emailSkipped) {
        toast.warning(
          `${recipientEmail.trim()} has opted out of quote emails — share the link below manually.`
        );
      } else {
        toast.error(
          `Proposal saved, but the email failed${data.emailError ? `: ${data.emailError}` : ''}. Share the link below manually.`
        );
      }
      setSent({
        to: recipientEmail.trim(),
        emailSent: !!data.emailSent,
        emailSkipped: !!data.emailSkipped,
        emailError: data.emailError ?? null,
        deckCount: Number(data.deckCount) || 0,
        proposalToken: data.proposalToken,
        packs: data.packs ?? [],
      });
      // It is out the door — the autosaved draft would otherwise come back on
      // the next visit and look like an unsent proposal.
      clearDraft();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send proposal');
    } finally {
      setSending(false);
    }
  };

  // ── Delivery receipt ────────────────────────────────────────────────────
  if (sent) {
    const origin = typeof window === 'undefined' ? '' : window.location.origin;
    const compareUrl = `${origin}/proposal/${sent.proposalToken}`;
    const copy = (url: string) => {
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success('Link copied'))
        .catch(() => toast.error('Could not copy — select and copy manually'));
    };

    return (
      <div className="mx-auto max-w-2xl py-10">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              sent.emailSent ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {sent.emailSent ? (
              <MailCheck className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>

          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            {sent.emailSent ? 'Proposal email sent' : 'Proposal saved — email not delivered'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {sent.emailSent ? (
              <>
                Delivered to <strong>{sent.to}</strong> with {sent.packs.length} pack option
                {sent.packs.length === 1 ? '' : 's'}
                {sent.deckCount > 0
                  ? ` and ${sent.deckCount} deck PDF${sent.deckCount === 1 ? '' : 's'} attached`
                  : ' (deck PDF could not be generated)'}
                .
              </>
            ) : sent.emailSkipped ? (
              <>
                <strong>{sent.to}</strong> has opted out of quote emails, so nothing was sent.
                The links below still work — share them by hand.
              </>
            ) : (
              <>
                The proposal and all its links were created, but the email failed
                {sent.emailError ? `: ${sent.emailError}` : ''}. Share the links below by hand.
              </>
            )}
          </p>

          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Compare page (all options)
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
              <a
                href={compareUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate px-1 text-sm text-indigo-600 hover:underline"
              >
                {compareUrl}
              </a>
              <button
                type="button"
                onClick={() => copy(compareUrl)}
                className="shrink-0 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                Copy
              </button>
            </div>

            <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Individual pack links
            </p>
            {sent.packs.map((pk) => {
              const url = `${origin}/quote/${pk.shareToken}`;
              return (
                <div
                  key={pk.shareToken}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 p-2"
                >
                  <span className="w-28 shrink-0 truncate px-1 text-sm font-medium text-gray-900">
                    {pk.label}
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-sm text-indigo-600 hover:underline"
                  >
                    {url}
                  </a>
                  <button
                    type="button"
                    onClick={() => copy(url)}
                    className="shrink-0 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Copy
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/proposals')}
              className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Back to proposals
            </button>
            <button
              type="button"
              onClick={() => setSent(null)}
              className="rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Keep editing / send another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* Sticky action bar */}
      <div className="sticky top-16 z-[9] -mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-2.5 backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-gray-900">
            New proposal
            <span className="ml-2 font-normal text-gray-400">
              {packs.length} option{packs.length === 1 ? '' : 's'} ·{' '}
              {recipientEmail.trim() || 'no recipient yet'}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Check it the way the client will see it, before anything is sent. */}
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            title={previewLoading ? "Building the deck…" : previewBlockReason ?? "Render the deck exactly as the client will get it"}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {previewLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Preview
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !canSend}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? 'Sending…' : 'Send proposal'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* ------------------------------------------------ left: editor */}
        <div className="min-w-0 space-y-3">
          {/* Recipient — one compact row; the note only unfolds when wanted */}
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Email *</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="lead@company.com"
                  aria-invalid={!!recipientEmailError}
                  className={`${inputCls} ${recipientEmailError ? 'border-red-400' : ''}`}
                />
                <FieldError message={recipientEmailError ?? undefined} />
              </div>
              <div>
                <label className={labelCls}>Contact name</label>
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Priya Sharma"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Company</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Pvt Ltd"
                  className={inputCls}
                />
              </div>
            </div>
            <details className="group mt-2">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                {message.trim() ? 'Personal note added' : 'Add a personal note to the email'}
              </summary>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Thanks for your enquiry — here are the options we discussed…"
                className={`${inputCls} mt-2`}
              />
            </details>
          </section>

          {/* Pack option chips — compact, always one line per option */}
          <div className="flex flex-wrap items-center gap-2">
            {priced.map(({ pack, subtotal }, i) => {
              const isActive = pack.key === activeKey;
              return (
                <button
                  key={pack.key}
                  type="button"
                  onClick={() => setActiveKey(pack.key)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="max-w-[140px] truncate font-medium">
                    {pack.label || `Pack ${i + 1}`}
                  </span>
                  <span
                    className={`tabular-nums ${isActive ? 'text-indigo-100' : 'text-gray-500'}`}
                  >
                    {pack.items.length === 0 ? 'empty' : formatRupees(subtotal)}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={addPack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4" /> Add pack
            </button>
          </div>

          {/* Active pack editor */}
          {active && (
            <section
              key={active.pack.key}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              {/* Pack header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  Option {activeIndex + 1} — {active.pack.label || `Pack ${activeIndex + 1}`}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => duplicatePack(active.pack.key)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  {packs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePack(active.pack.key)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4 p-4">
                {/* Naming + quantities — one row on desktop */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={labelCls}>Pack name</label>
                    <input
                      value={active.pack.label}
                      onChange={(e) => updatePack(active.pack.key, { label: e.target.value })}
                      maxLength={80}
                      placeholder="Premium"
                      className={inputCls}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className={labelCls}>One-line pitch (optional)</label>
                    <input
                      value={active.pack.tagline}
                      onChange={(e) => updatePack(active.pack.key, { tagline: e.target.value })}
                      maxLength={200}
                      placeholder="Our best-selling mix for senior leadership"
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Packs</label>
                      <input
                        type="number"
                        min={1}
                        value={active.pack.packQuantity}
                        onChange={(e) =>
                          updatePack(active.pack.key, {
                            packQuantity: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        title="Unit prices re-tier automatically at this quantity"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Discount ₹</label>
                      <input
                        type="number"
                        min={0}
                        value={active.pack.discount}
                        onChange={(e) =>
                          updatePack(active.pack.key, {
                            discount: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* Product picker */}
                <div>
                  {/* Selected products as removable chips — reads at a glance
                      and costs a fraction of the height of a list. */}
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span className={`${labelCls} mb-0 mr-1`}>In this pack</span>
                    {active.pack.items.length === 0 ? (
                      <span className="text-xs text-gray-400">
                        nothing yet — click products below
                      </span>
                    ) : (
                      active.pack.items.map((it) => (
                        <span
                          key={it.id}
                          className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 py-0.5 pl-1 pr-2 text-xs text-indigo-900"
                        >
                          <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-white">
                            {it.imageUrl && (
                              <Image
                                src={it.imageUrl}
                                alt={it.name}
                                fill
                                className="object-cover"
                                sizes="20px"
                              />
                            )}
                          </span>
                          <span className="truncate">{it.name}</span>
                          <span className="shrink-0 tabular-nums text-indigo-500">
                            {formatRupees(tierPrice(it.priceTiers, active.pack.packQuantity))}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleProduct(active.pack.key, it)}
                            className="shrink-0 text-indigo-400 hover:text-red-600"
                            title="Remove"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[200px] flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={showPacks ? 'Search curated packs…' : 'Search the catalog…'}
                        className={`${inputCls} pl-8`}
                      />
                    </div>
                  </div>

                  {(categories.length > 0 || curatedPacks.length > 0) && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryId('');
                          setShowPacks(false);
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          categoryId === '' && !showPacks
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        All
                      </button>
                      {/* Curated packs live beside the categories — flipping this
                          chip swaps the grid from single products to whole packs. */}
                      {curatedPacks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowPacks((s) => !s)}
                          aria-pressed={showPacks}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            showPacks
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <Layers className="h-3 w-3" />
                          Curated Packs
                        </button>
                      )}
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCategoryId(categoryId === c.id ? '' : c.id);
                            setShowPacks(false);
                          }}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            categoryId === c.id && !showPacks
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Grid — click a card to add or remove it from this pack.
                      In pack mode one click pulls in (or removes) every product
                      of that curated pack at once. */}
                  {showPacks ? (
                    filteredPacks.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-gray-200 px-3 py-8 text-center text-sm text-gray-400">
                        No curated packs match this search.
                      </p>
                    ) : (
                      <div className="max-h-[420px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
                        {/* Packs stay at 4 per row: each tile shows a collage of
                            its member products plus their names, which needs far
                            more room than a single-product tile. */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {filteredPacks.map((cp) => {
                            const allIn = active.pack.appliedPackIds.includes(cp.id);
                            const perPack = cp.items.reduce(
                              (sum, it) => sum + tierPrice(it.priceTiers, active.pack.packQuantity),
                              0
                            );
                            return (
                              <button
                                key={cp.id}
                                type="button"
                                onClick={() => applyCuratedPack(active.pack.key, cp)}
                                aria-pressed={allIn}
                                title={
                                  allIn
                                    ? `Remove the ${cp.items.length} products of ${cp.name}`
                                    : `Add all ${cp.items.length} products of ${cp.name}`
                                }
                                className={`group relative overflow-hidden rounded-md border bg-white text-left transition-all ${
                                  allIn
                                    ? 'border-indigo-500 ring-2 ring-indigo-300'
                                    : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                                }`}
                              >
                                {/* Collage of the pack's members — one cell per
                                    product (up to 4, then a "+n" cell), so the
                                    contents are readable without opening it. */}
                                <div className="relative aspect-[4/3] w-full bg-gray-50">
                                  <div
                                    className={`grid h-full w-full gap-px bg-gray-200 ${
                                      cp.items.length <= 1
                                        ? 'grid-cols-1'
                                        : cp.items.length === 2
                                          ? 'grid-cols-2'
                                          : 'grid-cols-2 grid-rows-2'
                                    }`}
                                  >
                                    {cp.items.slice(0, 4).map((it, i) => (
                                      <div
                                        key={it.id}
                                        className={`relative bg-white ${
                                          cp.items.length === 3 && i === 0 ? 'row-span-2' : ''
                                        }`}
                                      >
                                        {it.imageUrl ? (
                                          <Image
                                            src={it.imageUrl}
                                            alt={it.name}
                                            fill
                                            className="object-cover"
                                            sizes="120px"
                                          />
                                        ) : (
                                          <Layers className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-gray-300" />
                                        )}
                                      </div>
                                    ))}
                                    {cp.items.length > 4 && (
                                      <span className="absolute bottom-1 right-1 rounded-full bg-gray-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                        +{cp.items.length - 4}
                                      </span>
                                    )}
                                  </div>
                                  <span className="absolute left-1 top-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                                    {cp.items.length} items
                                  </span>
                                  {allIn && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-indigo-600/25">
                                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                                        <Check className="h-3.5 w-3.5" />
                                      </span>
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-0.5 px-2 py-1.5">
                                  <p className="truncate text-xs font-medium leading-tight text-gray-900">
                                    {cp.name}
                                  </p>
                                  <p className="text-[11px] tabular-nums text-gray-500">
                                    {formatRupees(perPack)}
                                  </p>
                                  {/* The actual contents, spelled out. */}
                                  <ul className="space-y-0.5 pt-0.5">
                                    {cp.items.slice(0, 4).map((it) => (
                                      <li
                                        key={it.id}
                                        className="truncate text-[11px] leading-snug text-gray-500"
                                        title={it.name}
                                      >
                                        • {it.name}
                                      </li>
                                    ))}
                                    {cp.items.length > 4 && (
                                      <li className="text-[11px] leading-snug text-gray-400">
                                        + {cp.items.length - 4} more
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Never truncate silently — say how many are hidden
                            and how to reach them. */}
                        {hiddenPackCount > 0 && (
                          <p className="px-1 pb-1 pt-3 text-center text-[11px] text-gray-500">
                            Showing {filteredPacks.length} of {matchedPacks.length} packs —{' '}
                            {packQuery
                              ? 'narrow the search to see the rest.'
                              : 'search by pack or product name to find the other ' +
                                `${hiddenPackCount}.`}
                          </p>
                        )}
                      </div>
                    )
                  ) : loadingProducts ? (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className="aspect-[3/4] animate-pulse rounded-md border border-gray-200 bg-gray-100"
                        />
                      ))}
                    </div>
                  ) : results.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-200 px-3 py-8 text-center text-sm text-gray-400">
                      No products match this search.
                    </p>
                  ) : (
                    <div className="max-h-[320px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
                      {/* Small tiles: the whole tile is the click target, so a
                          pack is built in a few clicks without scrolling. */}
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                        {results.map((p) => {
                          const selected = active.pack.items.some((it) => it.id === p.id);
                          const unit = tierPrice(p.priceTiers, active.pack.packQuantity);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleProduct(active.pack.key, p)}
                              aria-pressed={selected}
                              title={`${p.name} — ${formatRupees(unit)}/unit`}
                              className={`group relative overflow-hidden rounded-md border bg-white text-left transition-all ${
                                selected
                                  ? 'border-indigo-500 ring-2 ring-indigo-300'
                                  : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                              }`}
                            >
                              <div className="relative aspect-square w-full bg-gray-50">
                                {p.imageUrl ? (
                                  <Image
                                    src={p.imageUrl}
                                    alt={p.name}
                                    fill
                                    className="object-cover"
                                    sizes="90px"
                                  />
                                ) : (
                                  <Package className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-gray-300" />
                                )}
                                {selected && (
                                  <span className="absolute inset-0 flex items-center justify-center bg-indigo-600/25">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                                      <Check className="h-3.5 w-3.5" />
                                    </span>
                                  </span>
                                )}
                              </div>
                              <div className="px-1.5 py-1">
                                <p className="truncate text-[11px] font-medium leading-tight text-gray-900">
                                  {p.name}
                                </p>
                                <p className="truncate text-[11px] tabular-nums text-gray-500">
                                  {formatRupees(unit)}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Box & add-ons */}
                <div className="grid gap-3 lg:grid-cols-[minmax(0,260px)_1fr]">
                  <div>
                    <label className={labelCls}>Gift box (per pack)</label>
                    <div className="relative">
                      <select
                        value={active.pack.boxId}
                        onChange={(e) => updatePack(active.pack.key, { boxId: e.target.value })}
                        className={`${inputCls} appearance-none pr-8`}
                      >
                        <option value="">No box</option>
                        {boxes.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} — {formatRupees(priceForSize(b, active.autoSize))}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                    {active.box && (
                      <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                        Size <strong>{active.autoSize}</strong>, auto-set from{' '}
                        {active.pack.items.length} product
                        {active.pack.items.length === 1 ? '' : 's'}.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Add-ons (per pack)</label>
                    {addonOptions.length === 0 ? (
                      <p className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-center text-xs text-gray-400">
                        No add-ons available.
                      </p>
                    ) : (
                      // Toggle chips — the whole chip is clickable.
                      <div className="flex flex-wrap gap-1.5">
                        {addonOptions.map((a) => {
                          const on = active.pack.addonIds.includes(a.id);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => toggleAddon(active.pack.key, a.id)}
                              aria-pressed={on}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                on
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              {on ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Plus className="h-3 w-3 text-gray-400" />
                              )}
                              {a.name}
                              <span className="tabular-nums text-gray-400">
                                {formatRupees(a.price)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* This pack's own breakdown, right below its editor — one
                    horizontal strip instead of a stacked list. */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Breakdown
                  </span>
                  <span className="text-gray-600">
                    Products ({active.pack.items.length}){' '}
                    <span className="tabular-nums text-gray-900">
                      {formatRupees(active.productsPerPack)}
                    </span>
                  </span>
                  {active.box && (
                    <span className="text-gray-600">
                      Box{' '}
                      <span className="tabular-nums text-gray-900">
                        {formatRupees(active.boxPrice)}
                      </span>
                    </span>
                  )}
                  {active.addons.length > 0 && (
                    <span className="text-gray-600">
                      Add-ons ({active.addons.length}){' '}
                      <span className="tabular-nums text-gray-900">
                        {formatRupees(active.addonsPerPack)}
                      </span>
                    </span>
                  )}
                  <span className="text-gray-600">
                    Per pack{' '}
                    <span className="font-medium tabular-nums text-gray-900">
                      {formatRupees(active.perPack)}
                    </span>
                  </span>
                  {active.pack.discount > 0 && (
                    <span className="text-emerald-700">
                      −{formatRupees(active.pack.discount)} discount
                    </span>
                  )}
                  <span className="ml-auto font-semibold text-gray-900">
                    × {active.pack.packQuantity} ={' '}
                    <span className="tabular-nums">{formatRupees(active.subtotal)}</span>
                  </span>
                  <span className="w-full text-[11px] text-gray-400">
                    Shipping at checkout · GST and the 2% payment fee are added server-side
                    when you send.
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ------------------------------------------------ right: all packs */}
        <div className="xl:sticky xl:top-32 xl:self-start">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Proposal summary
            </h2>

            <div className="mt-2 divide-y divide-gray-100">
              {priced.map(({ pack, perPack, subtotal }, i) => (
                <button
                  key={pack.key}
                  type="button"
                  onClick={() => setActiveKey(pack.key)}
                  className={`-mx-2 block w-[calc(100%+1rem)] rounded px-2 py-2 text-left transition-colors ${
                    pack.key === activeKey ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {i + 1}. {pack.label || `Pack ${i + 1}`}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                      {formatRupees(subtotal)}
                    </span>
                  </div>
                  <p className="text-[11px] tabular-nums text-gray-500">
                    {pack.items.length === 0 ? (
                      <span className="font-medium text-red-600">Needs products</span>
                    ) : (
                      `${pack.items.length} items · ${formatRupees(perPack)} × ${pack.packQuantity}`
                    )}
                  </p>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={addPack}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 py-1.5 text-xs font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
            >
              <Plus className="h-3.5 w-3.5" /> Add another option
            </button>

            <button
              type="button"
              onClick={handlePreview}
              disabled={previewLoading}
              title={
                previewLoading
                  ? 'Building the deck…'
                  : previewBlockReason ?? 'Render the deck exactly as the client will get it'
              }
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {previewLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Preview proposal
            </button>
            {/* Say which option is holding it up — a silent dead button was
                read as the preview being broken. */}
            {previewBlockReason && (
              <p className="mt-1.5 text-[11px] leading-snug text-amber-700">
                {previewBlockReason}
              </p>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !canSend}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending…' : `Send ${packs.length} option${packs.length === 1 ? '' : 's'}`}
            </button>
            <p className="mt-1.5 text-center text-[11px] leading-snug text-gray-400">
              One email with every option, a compare page and a combined deck PDF. Valid 30
              days.
            </p>
          </div>
        </div>
      </div>

      {/* Preview — the deck PDF itself, rendered by the same builder and the
          same renderer the send attaches to the email. Nothing is saved. */}
      <Dialog open={previewOpen} onOpenChange={(open) => (open ? setPreviewOpen(true) : closePreview())}>
        <DialogContent className="max-w-[min(80rem,calc(100vw-2rem))] overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-gray-900">
                Proposal preview (PDF)
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                The exact deck {recipientEmail.trim() || 'the recipient'} will receive. Nothing
                has been sent yet.
              </DialogDescription>
            </div>
            <div className="mr-8 flex items-center gap-2">
              {previewUrl && (
                <a
                  href={previewUrl}
                  download="givoo-proposal-preview.pdf"
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Download
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  closePreview();
                  handleSend();
                }}
                disabled={sending || !canSend}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Send className="h-4 w-4" />
                Looks good — send
              </button>
            </div>
          </div>

          {previewLoading || !previewUrl ? (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Building the deck…
            </div>
          ) : (
            <iframe
              src={previewUrl}
              title="Proposal deck preview"
              className="h-[calc(100dvh-11rem)] w-full border-0 bg-gray-100"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
