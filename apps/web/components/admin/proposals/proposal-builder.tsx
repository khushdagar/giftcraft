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
  Sparkles,
  RefreshCw,
  ImagePlus,
  Pencil,
} from 'lucide-react';
import { formatRupees } from '@/lib/utils';
import { packagingSizeForCount, priceForSize, type BoxSize } from '@/lib/packaging-designs';
import { useSlowNotice, PACK_IMAGE_SLOW_MESSAGE } from '@/lib/proposal-progress';
import { FieldError } from '@/components/ui/field-error';
import { validateEmail } from '@/lib/validation';
import { downloadImagesStaggered, triggerDownload } from '@/lib/generated-image-download';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ManualProductDialog } from './manual-product-dialog';

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
  /** Typed in by hand for proposals (not in the catalogue) — can be edited from its chip. */
  proposalOnly?: boolean;
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
  sizePrices: Record<string, number>; // optional per-size prices (fillers, linings)
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
  // AI pack shot for the deck. `signature` records the box + products it was
  // generated from, so an edited pack is detected as stale and regenerated.
  // `leftOut` = products too large for a gift box, kept out of the shot.
  aiImage?: { url: string; signature: string; leftOut?: string[] } | null;
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
    ...(p.proposalOnly ? { proposalOnly: true } : {}),
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

/** What an AI pack shot depends on — the box, the client logo and the set of products. */
const packImageSignature = (p: Pack, logoUrl: string) =>
  // The leading version bumps whenever the prompt/framing changes, so images
  // made with an older prompt are treated as stale and regenerated.
  // v14 — placeholder is text only (the model was inventing a logo mark above it).
  ['v14', p.boxId, logoUrl, ...p.items.map((it) => it.id).sort()].join('|');

const freshPackImage = (p: Pack, logoUrl: string) =>
  p.aiImage && p.aiImage.signature === packImageSignature(p, logoUrl) ? p.aiImage.url : null;

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
  logoUrl?: string;
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
      // Pitch and discount are no longer editable — a value left in an old
      // draft would otherwise be sent with no way to see or change it.
      tagline: '',
      discount: 0,
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
  // Client logo for the AI pack images — printed on the box lid of every pack.
  // Empty = the box keeps the artwork its catalogue photo already shows.
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
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
  // Sidebar price cards start folded — one opens only when its header is
  // clicked, and switching or adding options folds it again.
  const [openBreakdownKey, setOpenBreakdownKey] = useState<string | null>(null);
  useEffect(() => {
    setOpenBreakdownKey((k) => (k === activeKey ? k : null));
  }, [activeKey]);
  // Packs whose AI pack shot is being generated right now.
  const [generatingKeys, setGeneratingKeys] = useState<string[]>([]);
  // Generation normally takes 20–40s — say so plainly when it runs longer.
  const generationSlow = useSlowNotice(generatingKeys.length > 0, 45_000);
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
      if (draft.logoUrl) setLogoUrl(draft.logoUrl);
      toast('Unsent draft restored', { description: 'Your pack options were still here.' });

      // Drafts saved before manual products were editable don't carry the
      // `proposalOnly` marker — ask the server which of these ids are manual.
      const unmarked = [
        ...new Set(
          draft.packs.flatMap((p) => p.items.filter((it) => !it.proposalOnly).map((it) => it.id))
        ),
      ];
      if (unmarked.length > 0) {
        fetch(`/api/admin/proposals/manual-product?ids=${unmarked.join(',')}`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            const manual = new Set<string>(Array.isArray(d?.ids) ? d.ids : []);
            if (manual.size === 0) return;
            setPacks((prev) =>
              prev.map((p) => ({
                ...p,
                items: p.items.map((it) =>
                  manual.has(it.id) ? { ...it, proposalOnly: true } : it
                ),
              }))
            );
          })
          .catch(() => {/* the chips just stay non-editable */});
      }
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
          logoUrl,
        } satisfies Draft)
      );
    } catch {/* quota or private mode — autosave is best-effort */}
  }, [packs, activeKey, recipientEmail, recipientName, companyName, message, logoUrl]);

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
  // One-off product typed in by hand — for an item that is not in the catalogue.
  const [manualProductOpen, setManualProductOpen] = useState(false);
  const [manualEditId, setManualEditId] = useState<string | null>(null);

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
            sizePrices: a.sizePrices || {},
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

  // Box size + products that cannot go in the box, per pack — worked out on the
  // server from real dimensions (lib/box-fit), the same check the AI image uses.
  // Keyed by the box + products it was computed for, so a stale answer is ignored.
  const [boxFits, setBoxFits] = useState<
    Record<string, { sig: string; size: BoxSize; outside: { id: string; name: string }[] }>
  >({});
  const boxFitSig = (p: Pack) => `${p.boxId}|${p.items.map((it) => it.id).join(',')}`;
  useEffect(() => {
    const stale = packs.filter(
      (p) => p.boxId && p.items.length > 0 && boxFits[p.key]?.sig !== boxFitSig(p)
    );
    if (stale.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      stale.forEach((p) => {
        const sig = boxFitSig(p);
        fetch('/api/admin/proposals/box-fit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: p.items.map((it) => it.id), boxId: p.boxId }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (cancelled || !d?.success) return;
            setBoxFits((prev) => ({
              ...prev,
              [p.key]: { sig, size: d.data.size, outside: d.data.outside ?? [] },
            }));
          })
          .catch(() => {/* the count-based size stays in place */});
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // boxFits is read only to skip packs already answered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packs]);

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
        // …and moves up a size when the products' real dimensions need it.
        const fit = boxFits[pack.key]?.sig === boxFitSig(pack) ? boxFits[pack.key]! : null;
        const autoSize = fit?.size ?? packagingSizeForCount(pack.items.length);
        const outsideBox = box && fit ? fit.outside : [];
        const boxPrice = box ? priceForSize(box, autoSize) : 0;
        // Size-priced add-ons follow the same auto size as the box.
        const addons = addonOptions
          .filter((a) => pack.addonIds.includes(a.id))
          .map((a) => ({ ...a, price: priceForSize(a, autoSize) }));
        const addonsPerPack = addons.reduce((sum, a) => sum + a.price, 0);
        const productsPerPack = pack.items.reduce(
          (sum, it) => sum + tierPrice(it.priceTiers, pack.packQuantity),
          0
        );
        const perPack = productsPerPack + boxPrice + addonsPerPack;
        const subtotal = Math.max(0, perPack * pack.packQuantity - pack.discount);
        return { pack, box, autoSize, outsideBox, boxPrice, addons, addonsPerPack, productsPerPack, perPack, subtotal };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [packs, boxes, addonOptions, boxFits]
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

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('The logo must be an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('The logo must be smaller than 5 MB');
      return;
    }
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'proposal-logos');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Logo upload failed');
      setLogoUrl(String(data.url));
      toast.success('Client logo added', {
        description: 'Pack images will be regenerated with it on the box.',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  /** Generate (or regenerate) one pack's AI shot. Resolves to its URL, or null on failure. */
  const generatePackShot = async (pack: Pack): Promise<string | null> => {
    if (pack.items.length === 0) return null;
    const signature = packImageSignature(pack, logoUrl);
    setGeneratingKeys((keys) => [...keys, pack.key]);
    try {
      const res = await fetch('/api/admin/proposals/pack-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: pack.items.map((it) => it.id),
          boxId: pack.boxId || null,
          logoUrl: logoUrl || null,
          packLabel: pack.label.trim() || null,
          companyName: companyName.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Image generation failed');
      const url = String(data.data.url);
      const leftOut: string[] = Array.isArray(data.data.leftOut) ? data.data.leftOut : [];
      setPacks((prev) =>
        prev.map((p) => (p.key === pack.key ? { ...p, aiImage: { url, signature, leftOut } } : p))
      );
      if (leftOut.length > 0) {
        toast.info(
          `${leftOut.length === 1 ? '1 product is' : `${leftOut.length} products are`} too large for the box`,
          { description: `${leftOut.join(', ')} — not shown in the pack image. Still in the proposal and the price.` }
        );
      }
      return url;
    } catch (err) {
      toast.error(
        `${pack.label || 'Pack'}: ${err instanceof Error ? err.message : 'image generation failed'}`,
        { description: 'The deck will use a product collage instead.' }
      );
      return null;
    } finally {
      setGeneratingKeys((keys) => keys.filter((k) => k !== pack.key));
    }
  };

  /**
   * Make sure every pack has an up-to-date AI shot before a preview or send.
   * Only packs with no image, or whose box/products changed since, are
   * generated. Returns pack key → URL for every pack that has a fresh image.
   */
  const ensurePackImages = async (): Promise<Record<string, string>> => {
    const images: Record<string, string> = {};
    const missing: Pack[] = [];
    for (const pack of packs) {
      const fresh = freshPackImage(pack, logoUrl);
      if (fresh) images[pack.key] = fresh;
      else if (pack.items.length > 0 && !generatingKeys.includes(pack.key)) missing.push(pack);
    }
    if (missing.length > 0) {
      const urls = await Promise.all(missing.map((pack) => generatePackShot(pack)));
      missing.forEach((pack, i) => {
        if (urls[i]) images[pack.key] = urls[i]!;
      });
    }
    return images;
  };

  // Same pack payload the send posts — one shape, so a preview can never
  // describe something different from what goes out.
  const packsPayload = (images: Record<string, string> = {}) =>
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
      packImageUrl: images[pack.key] ?? freshPackImage(pack, logoUrl) ?? undefined,
      packImageLogoUrl: logoUrl || undefined,
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
    let timer: ReturnType<typeof setTimeout> | undefined;

    setPreviewOpen(true);
    setPreviewLoading(true);
    // Drop the previous render — the packs have probably changed since.
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    try {
      // AI pack shots first (they carry their own server timeout), so the deck
      // render still gets its full budget afterwards.
      const images = await ensurePackImages();
      if (previewAbort.current !== controller) return;
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, PREVIEW_TIMEOUT_MS);
      const res = await fetch('/api/admin/proposals/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim() || undefined,
          packs: packsPayload(images),
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

  // Every pack's current AI image — saved alongside the previewed PDF.
  const previewImages = packs
    .map((pack, i) => ({ url: freshPackImage(pack, logoUrl), label: pack.label || `Pack ${i + 1}` }))
    .filter((img): img is { url: string; label: string } => !!img.url);

  const downloadPreviewWithImages = () => {
    if (!previewUrl) return;
    triggerDownload(previewUrl, 'givoo-proposal-preview.pdf');
    downloadImagesStaggered(previewImages);
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
      const images = await ensurePackImages();
      const res = await fetch('/api/admin/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim() || undefined,
          companyName: companyName.trim() || undefined,
          message: message.trim() || undefined,
          packs: packsPayload(images),
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
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
            {/* Actions on the active option */}
            {active && (
              <div className="ml-auto flex gap-1.5">
                <button
                  type="button"
                  onClick={() => duplicatePack(active.pack.key)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </button>
                {packs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePack(active.pack.key)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Active pack editor */}
          {active && (
            <section
              key={active.pack.key}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <div className="space-y-4 p-4">
                {/* Naming + quantities — one row on desktop */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_110px_minmax(0,1.2fr)_minmax(0,1.2fr)]">
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
                    <label className={labelCls}>
                      Gift box
                      {active.box && (
                        <span className="ml-1 normal-case tracking-normal text-gray-400">
                          · size {active.autoSize}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={active.pack.boxId}
                        onChange={(e) => updatePack(active.pack.key, { boxId: e.target.value })}
                        title="Size is set automatically from the number of products"
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
                  </div>
                  <div>
                    <label className={labelCls}>Add-ons</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={addonOptions.length === 0}
                          className={`${inputCls} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:bg-gray-50`}
                        >
                          <span
                            className={`truncate ${active.addons.length === 0 ? 'text-gray-400' : ''}`}
                          >
                            {addonOptions.length === 0
                              ? 'No add-ons available'
                              : active.addons.length === 0
                                ? 'None'
                                : active.addons.length === 1
                                  ? active.addons[0]!.name
                                  : `${active.addons.length} selected — ${formatRupees(active.addonsPerPack)}`}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-h-72 w-64 overflow-y-auto">
                        {addonOptions.map((a) => {
                          const on = active.pack.addonIds.includes(a.id);
                          return (
                            <DropdownMenuItem
                              key={a.id}
                              // Multi-select — keep the menu open between picks.
                              onSelect={(e) => {
                                e.preventDefault();
                                toggleAddon(active.pack.key, a.id);
                              }}
                              className="flex cursor-pointer items-center gap-2 text-sm"
                            >
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  on
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-gray-300 bg-white'
                                }`}
                              >
                                {on && <Check className="h-3 w-3" />}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{a.name}</span>
                              <span className="shrink-0 tabular-nums text-gray-400">
                                {formatRupees(priceForSize(a, active.autoSize))}
                              </span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Products whose real dimensions fit no size of this box. */}
                {active.outsideBox.length > 0 && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-800">
                    <strong>
                      {active.outsideBox.length === 1
                        ? '1 product does'
                        : `${active.outsideBox.length} products do`}{' '}
                      not fit the {active.box?.name ?? 'box'}:
                    </strong>{' '}
                    {active.outsideBox.map((o) => o.name).join(', ')}. Still in the proposal and
                    the price, but shipped separately and left out of the AI pack image.
                  </p>
                )}

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
                          {it.proposalOnly ? (
                            <button
                              type="button"
                              onClick={() => {
                                setManualEditId(it.id);
                                setManualProductOpen(true);
                              }}
                              className="inline-flex min-w-0 items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-indigo-600"
                              title="Manual product — click to edit"
                            >
                              <span className="truncate">{it.name}</span>
                              <Pencil className="h-3 w-3 shrink-0" />
                            </button>
                          ) : (
                            <span className="truncate">{it.name}</span>
                          )}
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
                    {active.pack.items.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          updatePack(active.pack.key, {
                            items: [],
                            appliedPackIds: [],
                            manualIds: [],
                          })
                        }
                        title="Remove every product from this pack"
                        className="ml-auto inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="h-3 w-3" /> Clear all
                      </button>
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
                    <button
                      type="button"
                      onClick={() => {
                        setManualEditId(null);
                        setManualProductOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-indigo-300 px-2.5 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                      title="Add a product that is not in the catalogue — used for proposals only"
                    >
                      <Plus className="h-3.5 w-3.5" /> Manual product
                    </button>
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
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9">
                      {Array.from({ length: 14 }).map((_, i) => (
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
                    <div className="max-h-[440px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                      {/* The whole tile is the click target. */}
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9">
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
                                    sizes="160px"
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
                              <div className="px-2 py-1.5">
                                <p className="line-clamp-2 min-h-[2rem] text-xs font-medium leading-4 text-gray-900">
                                  {p.name}
                                </p>
                                <p className="mt-0.5 truncate text-xs font-semibold tabular-nums text-gray-700">
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
              </div>
            </section>
          )}
        </div>

        {/* ------------------------------------------------ right: all packs */}
        <div className="space-y-3 xl:sticky xl:top-32 xl:max-h-[calc(100vh-9rem)] xl:self-start xl:overflow-y-auto">
          {/* One collapsible price card per option. Only the option being
              edited is open, so adding a pack folds the previous one away. */}
          {priced.map((p, i) => {
            const isActive = p.pack.key === activeKey;
            const open = openBreakdownKey === p.pack.key;
            return (
              <div
                key={p.pack.key}
                className={`rounded-lg border bg-white shadow-sm ${
                  isActive ? 'border-indigo-200' : 'border-gray-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveKey(p.pack.key);
                    setOpenBreakdownKey((k) => (k === p.pack.key ? null : p.pack.key));
                  }}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                    {p.pack.label || `Pack ${i + 1}`}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                    {p.pack.items.length === 0 ? (
                      <span className="text-xs font-medium text-amber-700">Needs products</span>
                    ) : (
                      formatRupees(p.subtotal)
                    )}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {open && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    <dl className="space-y-1.5 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-600">Products ({p.pack.items.length})</dt>
                        <dd className="tabular-nums text-gray-900">{formatRupees(p.productsPerPack)}</dd>
                      </div>
                      {p.box && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-gray-600">Box</dt>
                          <dd className="tabular-nums text-gray-900">{formatRupees(p.boxPrice)}</dd>
                        </div>
                      )}
                      {p.addons.length > 0 && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-gray-600">Add-ons ({p.addons.length})</dt>
                          <dd className="tabular-nums text-gray-900">{formatRupees(p.addonsPerPack)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-2 border-t border-gray-100 pt-1.5">
                        <dt className="text-gray-600">Per pack</dt>
                        <dd className="font-medium tabular-nums text-gray-900">{formatRupees(p.perPack)}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-2 border-t border-gray-100 pt-2">
                        <dt className="text-gray-600">× {p.pack.packQuantity} packs</dt>
                        <dd className="text-lg font-semibold tabular-nums text-gray-900">
                          {formatRupees(p.subtotal)}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-1 text-[11px] leading-snug text-gray-400">
                      Before shipping, GST and the 2% payment fee.
                    </p>
                    {p.pack.items.length === 0 && (
                      <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
                        No products yet — add at least one, or remove this option.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* AI pack shot — the hero image on this pack's page in the deck. */}
          {active &&
            (() => {
              const img = active.pack.aiImage;
              const fresh = !!freshPackImage(active.pack, logoUrl);
              const busy = generatingKeys.includes(active.pack.key);
              return (
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    AI pack image
                  </h2>
                  <div className="relative mt-2 flex aspect-[5/4] w-full items-center justify-center overflow-hidden rounded-md bg-gray-50 ring-1 ring-gray-200">
                    {busy ? (
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    ) : img ? (
                      <a href={img.url} target="_blank" rel="noreferrer" title="Open full size">
                        <Image
                          src={img.url}
                          alt={`${active.pack.label} pack image`}
                          fill
                          sizes="320px"
                          unoptimized
                          className={`object-cover ${fresh ? '' : 'opacity-40'}`}
                        />
                      </a>
                    ) : (
                      <Sparkles className="h-6 w-6 text-gray-300" />
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-snug text-gray-500">
                    {busy
                      ? generationSlow
                        ? PACK_IMAGE_SLOW_MESSAGE
                        : 'Packing the products into the box… this takes 20–40 seconds.'
                      : fresh
                        ? "Hero image on this pack's page in the PDF."
                        : img
                          ? 'Box or products changed — it will be regenerated on preview/send.'
                          : 'No image yet — generate one now, or it is made automatically on preview/send.'}
                  </p>

                  {fresh && !busy && (img?.leftOut?.length ?? 0) > 0 && (
                    <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
                      Too large for the box, so not in this image:{' '}
                      <strong>{img!.leftOut!.join(', ')}</strong>. Still in the proposal and the
                      price — it ships separately.
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => generatePackShot(active.pack)}
                      disabled={busy || active.pack.items.length === 0}
                      title={img ? 'Replace the current image with a newly generated one' : 'Generate the AI pack image'}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {img ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {busy ? 'Generating…' : img ? 'Generate new' : 'Generate image'}
                    </button>
                    {/* Clear empties the slot so it is obvious the next click
                        makes a brand-new image. The stored file stays in
                        Generated Images; only this pack lets go of it. */}
                    {img && !busy && (
                      <button
                        type="button"
                        onClick={() =>
                          setPacks((prev) =>
                            prev.map((p) => (p.key === active.pack.key ? { ...p, aiImage: null } : p))
                          )
                        }
                        title="Remove this image from the pack"
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Clear
                      </button>
                    )}
                  </div>

                  {/* Client logo — shared by every pack in this proposal */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                    {logoUrl ? (
                      <>
                        <span className="relative inline-block h-8 w-14 overflow-hidden rounded border border-gray-200 bg-gray-50">
                          <Image
                            src={logoUrl}
                            alt="Client logo"
                            fill
                            sizes="56px"
                            unoptimized
                            className="object-contain p-0.5"
                          />
                        </span>
                        <span className="text-xs text-gray-600">Client logo on the box</span>
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          disabled={busy}
                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">No client logo.</span>
                    )}
                    <label
                      className={`inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-indigo-600 hover:underline ${
                        logoUploading || busy ? 'pointer-events-none opacity-50' : ''
                      }`}
                    >
                      {logoUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5" />
                      )}
                      {logoUrl ? 'Change logo' : 'Upload client logo'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })()}
        </div>
      </div>

      <ManualProductDialog
        open={manualProductOpen}
        onOpenChange={setManualProductOpen}
        editId={manualEditId}
        onUpdated={(updated) => {
          // The same product can sit in several options — refresh every copy.
          const product = toCatalogProduct(updated);
          setPacks((prev) =>
            prev.map((p) => ({
              ...p,
              items: p.items.map((it) => (it.id === product.id ? product : it)),
            }))
          );
        }}
        onCreated={(created) => {
          const product = toCatalogProduct(created);
          const pack = packs.find((p) => p.key === activeKey);
          if (pack && !pack.items.some((it) => it.id === product.id)) {
            toggleProduct(pack.key, product);
          }
        }}
      />

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
                <button
                  type="button"
                  onClick={downloadPreviewWithImages}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {previewImages.length > 0
                    ? `Download PDF + ${previewImages.length} image${previewImages.length === 1 ? '' : 's'}`
                    : 'Download'}
                </button>
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
              <Loader2 className="h-4 w-4 animate-spin" />
              {generatingKeys.length > 0
                ? generationSlow
                  ? PACK_IMAGE_SLOW_MESSAGE
                  : `Generating AI pack image${generatingKeys.length === 1 ? '' : 's'}… (20–40s each)`
                : 'Building the deck…'}
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
