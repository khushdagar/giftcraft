'use client';

import { compressAndUpload } from '@/hooks/use-compressed-upload';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { RichTextField } from '@/components/admin/rich-text-field';
import { stripHtml } from '@/lib/strip-html';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, GripVertical, Plus, Trash2, X, ArrowLeft } from 'lucide-react';
import { TagCombobox } from '@/components/admin/tag-combobox';
import { formatRupees } from '@/lib/utils';
import { toast, useToastStore } from '@/lib/stores/toast-store';
import { SearchableMultiSelect } from './searchable-multi-select';
import { SearchableSelect } from './searchable-select';
import { ProductMedia } from './product-media';
import { ProductVariants } from './product-variants';

const ProductSchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  sku: z.string().min(1, 'SKU required'),
  descriptionShort: z.string().nullable().optional(),
  descriptionLong: z.string().nullable().optional(),
  keyFeatures: z.string().nullable().optional(),
  specifications: z.string().nullable().optional(),
  designArtwork: z.string().nullable().optional(),
  shippingDelivery: z.string().nullable().optional(),
  samplesInfo: z.string().nullable().optional(),
  packagingAddons: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  dimensions: z.string().nullable().optional(),
  weightG: z.number().nullable().optional(),
  lengthCm: z.number().nullable().optional(),
  widthCm: z.number().nullable().optional(),
  heightCm: z.number().nullable().optional(),
  moq: z.number().nullable().optional(),
  leadTimeDays: z.number().nullable().optional(),
  hsnCode: z.string().nullable().optional(),
  printingTechnique: z.string().nullable().optional(),
  printingPosition: z.string().nullable().optional(),
  brandingArea: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'archived', 'seasonal']).default('draft'),
  isFeatured: z.boolean().default(false),
  isEcoCertified: z.boolean().default(false),
  ecoCertification: z.string().nullable().optional(),
  sampleAvailable: z.boolean().default(false),
  recipientTags: z.array(z.string()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  categoryIds: z.array(z.string()).nullable().optional(),
  occasionIds: z.array(z.string()).nullable().optional(),
  variants: z.array(
    z.object({
      id: z.string().optional(),
      kind: z.string(),
      value: z.string(),
      // DB stores hexColor as null for non-colour variants — accept null so
      // loading an existing product never trips form validation.
      hexColor: z.string().nullable().optional(),
      price: z.number().nullable().optional(),
      sortOrder: z.number().nullable().optional(),
    })
  ).nullable().optional(),
  priceTiers: z.array(
    z.object({
      tier: z.number(),
      minQty: z.number(),
      maxQty: z.number().nullable(),
      costPrice: z.number(),
      sellPrice: z.number(),
    })
  ).nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
});

type ProductFormData = z.infer<typeof ProductSchema>;

// Recipient tags from the product master (e.g. "All staff", "Senior, VIP Clients")
const RECIPIENT_OPTIONS = [
  'All staff',
  'Trade-show',
  'Employees',
  'Clients',
  'Senior',
  'VIP Clients',
  'Employees (Women)',
];

// Tag-driven curated collections. A product tagged here is auto-pulled into the
// matching collection on the homepage / catalog (tags must match the collection
// occasion's tags). Admins can also type custom tags.
const COLLECTION_TAG_OPTIONS = [
  'budget-friendly',
  'premium-executive',
  'eco-friendly',
  'tech-gifts',
];

// The public product page's detail tabs. Edited one-at-a-time in the admin via a
// dropdown so the form stays compact. Field names match the Prisma columns.
const DETAIL_TABS = [
  { name: 'keyFeatures', label: 'Key Features', placeholder: 'Bullet list of selling points — these become the bullets on this product’s Proposal Deck slide…' },
  { name: 'specifications', label: 'Specifications', placeholder: 'e.g. Material, capacity, finish, certifications…' },
  { name: 'designArtwork', label: 'Design & Artwork', placeholder: 'Branding methods, print area, artwork file requirements…' },
  { name: 'shippingDelivery', label: 'Shipping & Delivery', placeholder: 'Lead times, dispatch info, delivery coverage…' },
  { name: 'samplesInfo', label: 'Samples', placeholder: 'Sample availability, cost, turnaround…' },
  { name: 'packagingAddons', label: 'Packaging & Add-ons', placeholder: 'Packaging options, gift boxes, add-on items…' },
] as const;

type DetailTabName = (typeof DETAIL_TABS)[number]['name'];

interface VendorOption {
  id: string;
  name: string;
}

interface VendorLink {
  vendorId: string;
  isPrimary: boolean;
  costPrice: number | null;
  vendorSku: string;
  vendorMoq: number | null;
  vendorLeadDays: number | null;
  sourcingStatus: string;
  lastPriceConfirmedAt: string; // YYYY-MM-DD for date input
}

interface SerializedProduct {
  id: string;
  name: string;
  slug: string;
  [key: string]: any;
}

export function ProductForm({
  mode,
  initialData,
  isPack = false,
}: {
  mode: 'create' | 'edit';
  initialData?: SerializedProduct;
  // When true, this form manages a Curated Pack: adds member-products + collection
  // fields, derives price tiers from the members, and hides tax/manual pricing.
  isPack?: boolean;
}) {
  const router = useRouter();
  // The listing URL we were opened from (page number + filters intact). Set by
  // the products table; falls back to the plain listing when absent.
  const searchParams = useSearchParams();
  const listUrl =
    searchParams.get('returnTo') || (isPack ? '/admin/products?view=packs' : '/admin/products');

  // Leaving the editor. history.back() restores the listing exactly as it was —
  // same page number, filters and scroll — so returning from page 5 lands on
  // page 5. Deep-linked edits have no history entry, so they use the URL.
  const goBackToList = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push(listUrl);
  };
  const [loading, setLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTabName>('specifications');
  const [error, setError] = useState<string | null>(null);
  const [priceReason, setPriceReason] = useState('');
  // Drag-to-reorder state for the price-tier rows.
  const [dragTierIdx, setDragTierIdx] = useState<number | null>(null);
  const [dragOverTierIdx, setDragOverTierIdx] = useState<number | null>(null);
  const [images, setImages] = useState<Array<{ id?: string; url: string; isPrimary: boolean; altText?: string; file?: File }>>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Index of the image opened in the zoom lightbox (null = closed).
  const [zoomIdx, setZoomIdx] = useState<number | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; parentId?: string | null }>>([]);
  const [occasions, setOccasions] = useState<Array<{ id: string; name: string; icon?: string }>>([]);
  const [variants, setVariants] = useState<Array<{ id?: string; kind: string; value: string; hexColor?: string; imageUrl?: string; price?: number; sortOrder: number }>>([]);
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [vendorLinks, setVendorLinks] = useState<VendorLink[]>([]);

  // ── Curated pack state ─────────────────────────────────────────────────────
  interface PackMember {
    productId: string;
    name: string;
    brand?: string | null;
    imageUrl?: string | null;
    quantity: number;
    priceTiers: { minQty: number; maxQty: number | null; sellPrice: number }[];
    // Physical attributes, used to auto-derive the pack's own weight/dimensions/etc.
    weightG?: number | null;
    leadTimeDays?: number | null;
    moq?: number | null;
    lengthCm?: number | null;
    widthCm?: number | null;
    heightCm?: number | null;
  }
  const [packItems, setPackItems] = useState<PackMember[]>(
    ((initialData as any)?.packItems as PackMember[]) ?? []
  );
  const [packCollectionId, setPackCollectionId] = useState<string>(
    (initialData as any)?.packCollectionId ?? ''
  );
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);
  const [packSearch, setPackSearch] = useState('');
  const [packResults, setPackResults] = useState<any[]>([]);
  const [packSearching, setPackSearching] = useState(false);

  // Initialize variants properly from initialData
  useEffect(() => {
    if (mode === 'edit' && initialData?.variants && Array.isArray(initialData.variants)) {
      // Ensure all variants have required fields
      const validVariants = initialData.variants
        .filter(v => v && v.kind && v.value) // Filter out invalid variants
        .map(v => ({
          id: v.id,
          kind: String(v.kind).toLowerCase(),
          value: String(v.value).trim(),
          hexColor: v.hexColor || undefined,
          imageUrl: v.imageUrl || undefined,
          price: v.price != null ? Number(v.price) : undefined,
          sortOrder: typeof v.sortOrder === 'number' ? v.sortOrder : 0,
        }));
      console.log('✅ Loaded variants:', validVariants);
      setVariants(validVariants);
    }
  }, [mode, initialData?.id]);

  // Initialize vendor links from initialData (edit mode)
  useEffect(() => {
    if (mode === 'edit' && initialData?.vendors && Array.isArray(initialData.vendors)) {
      setVendorLinks(
        initialData.vendors.map((v: any) => ({
          vendorId: v.vendorId,
          isPrimary: !!v.isPrimary,
          costPrice: v.costPrice ?? null,
          vendorSku: v.vendorSku ?? '',
          vendorMoq: v.vendorMoq ?? null,
          vendorLeadDays: v.vendorLeadDays ?? null,
          sourcingStatus: v.sourcingStatus ?? '',
          lastPriceConfirmedAt: v.lastPriceConfirmedAt
            ? String(v.lastPriceConfirmedAt).slice(0, 10)
            : '',
        }))
      );
    }
  }, [mode, initialData?.id]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(ProductSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          // HSN comes back nested (hsn.hsn.code) — surface the code for the field
          hsnCode:
            (initialData as any).hsn?.hsn?.code ??
            (initialData as any).hsnCode ??
            '',
          categoryIds: (initialData as any).categoryIds || [],
          occasionIds: (initialData as any).occasionIds || [],
        }
      : {
          status: 'draft',
          isFeatured: false,
          isEcoCertified: false,
          categoryIds: [],
          occasionIds: [],
          tags: [],
          // Standard tier structure (from the product master) — identical for
          // every new product so admins only edit cost & sell prices.
          priceTiers: [
            { tier: 1, minQty: 1, maxQty: 24, costPrice: 0, sellPrice: 0 },
            { tier: 2, minQty: 25, maxQty: 49, costPrice: 0, sellPrice: 0 },
            { tier: 3, minQty: 50, maxQty: 99, costPrice: 0, sellPrice: 0 },
            { tier: 4, minQty: 100, maxQty: 249, costPrice: 0, sellPrice: 0 },
            { tier: 5, minQty: 250, maxQty: 499, costPrice: 0, sellPrice: 0 },
            { tier: 6, minQty: 500, maxQty: null, costPrice: 0, sellPrice: 0 },
          ],
        },
  });

  // Move a price-tier row from one position to another (drag-and-drop). The row's
  // data (qty range, prices) travels with it; the `tier` number is re-sequenced
  // 1..n to match the new visual order.
  const reorderPriceTier = (from: number, to: number) => {
    const tiers = [...(form.getValues('priceTiers') || [])];
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= tiers.length ||
      to >= tiers.length
    ) {
      return;
    }
    const [moved] = tiers.splice(from, 1);
    if (!moved) return;
    tiers.splice(to, 0, moved);
    const renumbered = tiers.map((t, i) => ({ ...t, tier: i + 1 }));
    form.setValue('priceTiers', renumbered, { shouldDirty: true });
  };

  // Load categories and occasions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, occasionsRes, vendorsRes] = await Promise.all([
          fetch('/api/admin/categories'),
          fetch('/api/admin/occasions'),
          fetch('/api/admin/vendors'),
        ]);

        if (catsRes.ok) {
          const catsData = await catsRes.json();
          setCategories(catsData.categories || []);
        }

        if (occasionsRes.ok) {
          const occasionsData = await occasionsRes.json();
          // /api/admin/occasions returns a bare array of occasion records.
          // Curated collections are tag-driven — exclude them from the occasion
          // picker so they're only managed via Collection Tags below.
          const occList = Array.isArray(occasionsData) ? occasionsData : occasionsData.occasions || [];
          setOccasions(occList.filter((o: any) => !o.isCollection));
        }

        if (vendorsRes.ok) {
          const vendorsData = await vendorsRes.json();
          // API shape: { success, data: [{ id, name, ... }] }
          setVendorOptions((vendorsData.data || []).map((v: any) => ({ id: v.id, name: v.name })));
        }
      } catch (error) {
        console.error('Failed to fetch categories/occasions/vendors:', error);
      }
    };

    fetchData();
  }, []);

  // ── Curated pack helpers ───────────────────────────────────────────────────
  // Load collections (for the pack's collection dropdown).
  useEffect(() => {
    if (!isPack) return;
    fetch('/api/admin/gift-collections')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) =>
        setCollections(
          Array.isArray(d) ? d.map((c: any) => ({ id: c.id, name: c.name })) : []
        )
      )
      .catch(() => {});
  }, [isPack]);

  // Auto-fill SKU/slug for packs from the name, so the admin never has to invent
  // a code for a bundle. The field is still shown and editable — once
  // the admin types their own, stop overwriting it on every name keystroke.
  const [skuTouched, setSkuTouched] = useState(false);
  const watchedName = form.watch('name');
  useEffect(() => {
    if (!isPack || mode !== 'create' || skuTouched) return;
    const slugified = (watchedName || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    if (slugified) {
      form.setValue('sku', `PACK-${slugified}`.toUpperCase());
      if (!form.getValues('slug')) form.setValue('slug', slugified);
    }
  }, [watchedName, isPack, mode, skuTouched]);

  const searchMembers = async (q: string) => {
    setPackSearch(q);
    if (!q.trim()) {
      setPackResults([]);
      return;
    }
    setPackSearching(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      const all = data.products || [];
      setPackResults(all.filter((p: any) => !packItems.some((it) => it.productId === p.id)));
    } catch {
      toast.error('Failed to search products');
    } finally {
      setPackSearching(false);
    }
  };
  const addMember = (p: any) => {
    setPackItems((prev) => [
      ...prev,
      {
        productId: p.id,
        name: p.name,
        brand: p.brand,
        imageUrl: p.images?.[0]?.url ?? null,
        quantity: 1,
        priceTiers: (p.priceTiers ?? []).map((t: any) => ({
          minQty: t.minQty,
          maxQty: t.maxQty ?? null,
          sellPrice: Number(t.sellPrice),
        })),
        weightG: p.weightG ?? null,
        leadTimeDays: p.leadTimeDays ?? null,
        moq: p.moq ?? null,
        lengthCm: p.lengthCm ?? null,
        widthCm: p.widthCm ?? null,
        heightCm: p.heightCm ?? null,
      },
    ]);
    setPackResults((prev) => prev.filter((x) => x.id !== p.id));
  };
  const removeMember = (id: string) =>
    setPackItems((prev) => prev.filter((it) => it.productId !== id));
  const setMemberQty = (id: string, qty: number) =>
    setPackItems((prev) =>
      prev.map((it) => (it.productId === id ? { ...it, quantity: Math.max(1, qty) } : it))
    );

  // Auto price tiers — summed from each member's own quantity tiers.
  const priceAtQty = (
    tiers: { minQty: number; maxQty: number | null; sellPrice: number }[],
    qty: number
  ) => {
    if (!tiers?.length) return 0;
    const t =
      tiers.find((t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty)) ?? tiers[0];
    return t ? Number(t.sellPrice) : 0;
  };
  const packBreakpoints = Array.from(
    new Set(packItems.flatMap((it) => (it.priceTiers ?? []).map((t) => t.minQty)))
  ).sort((a, b) => a - b);
  const packTierRows = packBreakpoints.map((qty) => ({
    qty,
    price: packItems.reduce((s, it) => s + priceAtQty(it.priceTiers, qty) * it.quantity, 0),
  }));
  const packFromPrice = packTierRows[0]?.price ?? 0;

  // Auto-derive the pack's physical attributes from its member products:
  //  • Weight  = total of (member weight × qty)      — full bundle weight
  //  • Lead time = the longest member lead time       — ready when slowest is
  //  • MOQ     = the highest member MOQ
  //  • Box     = widest L & W, with heights stacked    — a packing estimate
  useEffect(() => {
    if (!isPack) return;
    const num = (v: number | null | undefined) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
    const totalWeight = packItems.reduce((s, it) => s + num(it.weightG) * it.quantity, 0);
    const maxLead = packItems.reduce((m, it) => Math.max(m, num(it.leadTimeDays)), 0);
    const maxMoq = packItems.reduce((m, it) => Math.max(m, num(it.moq)), 0);
    const maxL = packItems.reduce((m, it) => Math.max(m, num(it.lengthCm)), 0);
    const maxW = packItems.reduce((m, it) => Math.max(m, num(it.widthCm)), 0);
    const stackedH = packItems.reduce((s, it) => s + num(it.heightCm) * it.quantity, 0);
    form.setValue('weightG', totalWeight || null);
    form.setValue('leadTimeDays', maxLead || null);
    form.setValue('moq', maxMoq || null);
    form.setValue('lengthCm', maxL || null);
    form.setValue('widthCm', maxW || null);
    form.setValue('heightCm', stackedH || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPack, packItems]);

  // Load existing images when editing
  useEffect(() => {
    if (mode === 'edit' && initialData?.images) {
      setImages(
        initialData.images.map((img: any) => ({
          id: img.id,
          url: img.url,
          isPrimary: img.isPrimary,
          altText: img.altText || '',
        }))
      );
    }
  }, [mode, initialData]);

  // The single primary image index (first flagged, else the first image).
  const primaryImageIdx = (() => {
    const i = images.findIndex((im) => im.isPrimary);
    return i >= 0 ? i : images.length > 0 ? 0 : -1;
  })();

  // Mark image #idx as the only primary (locally + in DB when already saved).
  const handleSetPrimary = async (idx: number) => {
    const img = images[idx];
    setImages((prev) => prev.map((p, i) => ({ ...p, isPrimary: i === idx })));
    if (img?.id && mode === 'edit' && initialData?.id) {
      try {
        const res = await fetch(
          `/api/admin/products/${initialData.id}/images?imageId=${img.id}`,
          { method: 'PUT' }
        );
        if (!res.ok) toast.error('Failed to update primary image');
      } catch (err) {
        console.error('Error updating primary image:', err);
      }
    }
  };

  // Remove image #idx (from DB when already saved, else just local state).
  const handleDeleteImage = async (idx: number) => {
    const img = images[idx];
    if (img?.id && mode === 'edit' && initialData?.id) {
      try {
        toast.info('🗑️ Deleting image...', 0);
        const res = await fetch(
          `/api/admin/products/${initialData.id}/images?imageId=${img.id}`,
          { method: 'DELETE' }
        );
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Delete failed');
        }
        setImages((prev) => prev.filter((_, i) => i !== idx));
        toast.success('✅ Image deleted');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Delete failed';
        toast.error(`❌ Error: ${errorMsg}`);
      }
    } else {
      setImages((prev) => prev.filter((_, i) => i !== idx));
      toast.info('Image removed');
    }
    setZoomIdx(null);
  };

  // Persist an image's alt text (saved images patch the DB; new ones stay local).
  const handleSaveAlt = async (idx: number, altText: string) => {
    const img = images[idx];
    setImages((prev) => prev.map((p, i) => (i === idx ? { ...p, altText } : p)));
    if (img?.id && mode === 'edit' && initialData?.id) {
      try {
        const res = await fetch(
          `/api/admin/products/${initialData.id}/images?imageId=${img.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ altText }),
          }
        );
        if (!res.ok) throw new Error('Save failed');
        toast.success('✅ Alt text saved', 1500);
      } catch (err) {
        toast.error('❌ Failed to save alt text', 2500);
      }
    }
  };

  // Upload an image for a specific variant (e.g. the product shown in that
  // colour). Stored on the variant and saved with the product on submit.
  const handleVariantImageUpload = async (idx: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('❌ Image exceeds 5MB limit', 3000);
      return;
    }
    let uploadingToastId: string | null = null;
    try {
      uploadingToastId = toast.info('📤 Uploading variant image...', 0);
      const { url } = await compressAndUpload(file, { folder: 'variants' });
      setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, imageUrl: url } : v)));
      if (uploadingToastId) useToastStore.getState().removeToast(uploadingToastId);
      toast.success('✅ Variant image added — Save Changes to persist', 2500);
    } catch (err) {
      if (uploadingToastId) useToastStore.getState().removeToast(uploadingToastId);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(`❌ ${msg}`, 3500);
    }
  };

  // Auto-generate slug from product name
  const nameValue = useWatch({ control: form.control, name: 'name' });
  useEffect(() => {
    if (nameValue && mode === 'create') {
      const slug = nameValue
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      form.setValue('slug', slug);
    }
  }, [nameValue, form, mode]);

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Show loading toast for image uploads
      const hasNewImages = images.some((img) => img.file);
      if (hasNewImages) {
        toast.info('📤 Uploading images...', 0); // No auto-dismiss
      }

      // Use FormData to handle both JSON and files
      const formData = new FormData();

      // Validate variants before submission
      const validVariants = variants.filter(v => v.kind && v.value);
      if (validVariants.length !== variants.length) {
        setError('Some variants are missing kind or value');
        toast.error('❌ All variants must have a type and value', 3000);
        setLoading(false);
        return;
      }

      // Build vendor links payload (drop rows without a vendor selected)
      const vendorsPayload = vendorLinks
        .filter((v) => v.vendorId)
        .map((v) => ({
          vendorId: v.vendorId,
          isPrimary: v.isPrimary,
          costPrice: v.costPrice != null && !Number.isNaN(v.costPrice) ? v.costPrice : null,
          vendorSku: v.vendorSku?.trim() || null,
          vendorMoq: v.vendorMoq != null && !Number.isNaN(v.vendorMoq) ? v.vendorMoq : null,
          vendorLeadDays:
            v.vendorLeadDays != null && !Number.isNaN(v.vendorLeadDays) ? v.vendorLeadDays : null,
          sourcingStatus: v.sourcingStatus || null,
          lastPriceConfirmedAt: v.lastPriceConfirmedAt || null,
        }));

      // Curated pack payload: flag, collection, member products, and no manual
      // tiers (price is derived from the members).
      const packPayload = isPack
        ? {
            isPack: true,
            packCollectionId: packCollectionId || null,
            packItems: packItems.map((it, idx) => ({
              productId: it.productId,
              quantity: it.quantity,
              sortOrder: idx,
            })),
            priceTiers: [],
          }
        : {};

      // Images are uploaded immediately by <ProductMedia> (create mode keeps
      // them as URLs, no File). Send those URLs with the primary/cover first so
      // the API flags index 0 as primary.
      const orderedImageUrls = (() => {
        const arr = [...images];
        const pIdx = arr.findIndex((i) => i.isPrimary);
        if (pIdx > 0) {
          const [p] = arr.splice(pIdx, 1);
          if (p) arr.unshift(p);
        }
        return arr.map((i) => i.url).filter((u): u is string => !!u && /^https?:\/\//.test(u));
      })();

      // Add product data with variants - ensure proper data types
      const dataWithVariants = {
        ...data,
        ...packPayload,
        ...(mode === 'create' && { imageUrls: orderedImageUrls }),
        vendors: vendorsPayload,
        variants: validVariants.length > 0 ? validVariants.map((v, idx) => {
          const variant: any = {
            kind: String(v.kind).trim().toLowerCase(),
            value: String(v.value).trim(),
            sortOrder: idx,
          };
          // Only include hexColor for color variants
          if (v.hexColor && (v.kind.toLowerCase() === 'color' || v.kind === 'color')) {
            variant.hexColor = String(v.hexColor).trim();
          } else {
            variant.hexColor = null;
          }
          // Carry the optional per-variant image through to the API.
          variant.imageUrl = v.imageUrl ? String(v.imageUrl).trim() : null;
          // Per-size price (used by packaging designs) — only for size variants.
          variant.price =
            v.kind.toLowerCase() === 'size' && v.price != null && !Number.isNaN(Number(v.price))
              ? Number(v.price)
              : null;
          return variant;
        }) : [],
      };

      // Validate that all variants have required fields
      if (dataWithVariants.variants && dataWithVariants.variants.length > 0) {
        const invalidVariant = dataWithVariants.variants.find(v => !v.kind || !v.value);
        if (invalidVariant) {
          setError('Invalid variant data detected');
          toast.error('❌ All variants must have a type and value', 3000);
          setLoading(false);
          return;
        }
      }

      // Debug logging
      console.log('📋 Submitting product with data:', {
        name: dataWithVariants.name,
        variantCount: dataWithVariants.variants.length,
        variants: dataWithVariants.variants,
        mode,
      });

      formData.append('data', JSON.stringify(dataWithVariants));
      if (mode === 'edit' && priceReason) {
        formData.append('priceReason', priceReason);
      }

      // Add image files
      images.forEach((img, idx) => {
        if (img.file) {
          formData.append(`images`, img.file);
          if (img.isPrimary) {
            formData.append('primaryImageIndex', idx.toString());
          }
        }
      });

      const url = mode === 'create' ? '/api/admin/products' : `/api/admin/products/${initialData?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for FormData
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('❌ API Error:', { status: res.status, fullError: error });

        // Handle array of validation errors
        if (Array.isArray(error.error)) {
          const detailedErrors = error.error
            .map((e: any) => `${e.path}: ${e.message}`)
            .join('\n');
          throw new Error(`Validation errors:\n${detailedErrors}`);
        }

        const errorMsg = error.error || `Server error: ${res.status}`;
        throw new Error(errorMsg);
      }

      const product = await res.json();
      console.log('✅ Product saved successfully:', { id: product.id, name: product.name });

      // For edit mode, refresh variants from API
      if (mode === 'edit' && initialData?.id) {
        try {
          const variantsRes = await fetch(`/api/admin/products/${initialData.id}/variants`);
          if (variantsRes.ok) {
            const variantsData = await variantsRes.json();
            setVariants(variantsData || []);
          }
        } catch (err) {
          console.error('Failed to refresh variants:', err);
        }
      }

      // Show success toast with a small delay to ensure visibility
      const successMsg =
        mode === 'create'
          ? `✅ Product "${product.name}" created successfully!`
          : `✅ Product "${product.name}" updated successfully!`;

      toast.success(successMsg, 4000); // 4 seconds visibility

      // Editing stays in the editor: the success toast is the only feedback, and
      // no navigation or refresh happens — so nothing can bounce the listing
      // back to page 1. Leaving is an explicit action via the back button.
      // Creating still moves on to the listing, since there's no record to keep
      // editing in place.
      if (mode === 'create') {
        setTimeout(() => {
          router.push(listUrl);
          router.refresh();
        }, 500);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMsg);
      toast.error(`❌ Error: ${errorMsg}`, 6000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Sticky action bar — Save is always reachable while scrolling. Sits
          just below the admin topbar (h-16). */}
      <div className="sticky top-16 z-30 -mx-4 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBackToList}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition hover:bg-gray-50"
            aria-label="Back to products"
            title="Back to products"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium text-gray-900">
            {isPack
              ? mode === 'create'
                ? 'New Curated Pack'
                : 'Edit Curated Pack'
              : mode === 'create'
              ? 'New Product'
              : 'Edit Product'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={goBackToList}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-normal text-red-900">Error</p>
            <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}

      {Object.keys(form.formState.errors).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-normal text-yellow-900 mb-2">⚠️ Validation Errors - Please fix:</p>
          <ul className="text-sm text-yellow-800 space-y-1">
            {Object.entries(form.formState.errors).map(([field, error]: any) => (
              <li key={field}>• <strong>{field}:</strong> {error?.message || 'Invalid value'}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">General</h2>
            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">Product Name *</label>
              <Input {...form.register('name')} placeholder="e.g. Stainless Steel Flask 500ml" />
              {form.formState.errors.name && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">Slug</label>
                <Input {...form.register('slug')} placeholder="auto-generated from name" />
              </div>
              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">
                  {isPack ? 'Pack SKU *' : 'SKU *'}
                </label>
                <Input
                  {...form.register('sku', { onChange: () => setSkuTouched(true) })}
                  placeholder={isPack ? 'auto-generated from the name' : 'e.g. FLASK-500-SS'}
                />
                {form.formState.errors.sku && (
                  <p className="text-xs text-red-600 mt-1">{form.formState.errors.sku.message}</p>
                )}
                {isPack && (
                  <p className="mt-1 text-xs text-gray-500">
                    Identifies the pack on POs, invoices and the bulk-upload sheet. Derived from the
                    name until you edit it.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">Brand</label>
                <Input {...form.register('brand')} placeholder="e.g. Borosil" />
              </div>
              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">Material</label>
                <Input {...form.register('material')} placeholder="e.g. Stainless Steel 304" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">Short Description</label>
              <textarea
                {...form.register('descriptionShort')}
                placeholder="Brief product description"
                rows={2}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">Long Description</label>
              <Controller
                control={form.control}
                name="descriptionLong"
                render={({ field }) => (
                  <RichTextField
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Detailed product description"
                    minHeight={180}
                    uploadFolder="products"
                  />
                )}
              />
              <p className="text-xs text-gray-500 mt-1">Shown under the &ldquo;Product Description&rdquo; tab.</p>
            </div>

            {/* Product detail tabs — each maps to a tab on the public product page.
                Edited one at a time via the dropdown to keep the form compact. */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-900 mb-1">Product Detail Tabs</p>
              <p className="text-xs text-gray-500 mb-3">
                Pick a tab to edit its content. Any tab left blank shows &ldquo;No information available&rdquo; on the public page.
              </p>

              <select
                value={detailTab}
                onChange={(e) => setDetailTab(e.target.value as DetailTabName)}
                className="mb-3 w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-gray-400 focus:outline-none sm:max-w-xs"
              >
                {DETAIL_TABS.map((tab) => {
                  const filled = !!(form.watch(tab.name) || '').trim();
                  return (
                    <option key={tab.name} value={tab.name}>
                      {tab.label}{filled ? '  ●' : ''}
                    </option>
                  );
                })}
              </select>

              {DETAIL_TABS.filter((tab) => tab.name === detailTab).map((tab) => (
                <Controller
                  key={tab.name}
                  control={form.control}
                  name={tab.name}
                  render={({ field }) => (
                    <RichTextField
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder={tab.placeholder}
                      minHeight={160}
                      uploadFolder="products"
                    />
                  )}
                />
              ))}

              {detailTab === 'keyFeatures' && (
                <p className="text-xs text-gray-500 mt-2">
                  Author this as a bullet list. Each bullet also becomes a line on this
                  product&rsquo;s slide in the Proposal Deck PDF (max 8 shown), so keep them
                  short.
                </p>
              )}
            </div>

            {isPack && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                Weight, lead time, MOQ &amp; dimensions below are auto-calculated from the products
                added to this pack.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">Weight (g)</label>
                <Input type="number" readOnly={isPack} {...form.register('weightG', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">Lead Time (days)</label>
                <Input type="number" readOnly={isPack} {...form.register('leadTimeDays', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">MOQ</label>
                <Input type="number" readOnly={isPack} {...form.register('moq', { valueAsNumber: true })} placeholder="e.g. 25" />
                <p className="text-xs text-gray-500 mt-1">Min. order quantity</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-normal text-blue-900 mb-3">Product Dimensions (cm)</p>
              <p className="text-xs text-blue-800 mb-3">
                {isPack
                  ? 'Auto-estimated from the pack’s products (widest L & W, heights stacked).'
                  : 'Required for automatic packaging suggestions'}
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-normal text-gray-900 mb-1">Length (L)</label>
                  <Input type="number" step="0.1" min="0" readOnly={isPack} {...form.register('lengthCm', { valueAsNumber: true })} placeholder="cm" />
                </div>
                <div>
                  <label className="block text-sm font-normal text-gray-900 mb-1">Width (W)</label>
                  <Input type="number" step="0.1" min="0" readOnly={isPack} {...form.register('widthCm', { valueAsNumber: true })} placeholder="cm" />
                </div>
                <div>
                  <label className="block text-sm font-normal text-gray-900 mb-1">Height (H)</label>
                  <Input type="number" step="0.1" min="0" readOnly={isPack} {...form.register('heightCm', { valueAsNumber: true })} placeholder="cm" />
                </div>
              </div>
            </div>
          </section>

          {isPack && (
            <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
              <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
                Pack Contents
              </h2>

              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">Curated Collection</label>
                <select
                  value={packCollectionId}
                  onChange={(e) => setPackCollectionId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white"
                >
                  <option value="">— None (standalone) —</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  The collection this pack appears under on the storefront.
                </p>
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">
                  Products in this pack
                </label>
                <Input
                  value={packSearch}
                  onChange={(e) => searchMembers(e.target.value)}
                  placeholder="Search products to add…"
                />
                {packSearch && packSearching && (
                  <p className="text-xs text-gray-500 mt-2">Searching…</p>
                )}
                {packResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg divide-y max-h-56 overflow-y-auto">
                    {packResults.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 p-2">
                        <span className="text-sm text-gray-900 truncate">
                          {p.name}
                          {p.brand && <span className="text-gray-400"> · {p.brand}</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => addMember(p)}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {packItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-normal text-gray-700">In this pack ({packItems.length})</p>
                  {packItems.map((it) => (
                    <div
                      key={it.productId}
                      className="flex items-center gap-2 p-2 rounded-lg border border-gray-200"
                    >
                      <span className="flex-1 text-sm text-gray-900 truncate">
                        {it.name}
                        {it.brand && <span className="text-gray-400"> · {it.brand}</span>}
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => setMemberQty(it.productId, parseInt(e.target.value) || 1)}
                        className="w-16 border border-gray-300 rounded p-1 text-sm text-center"
                      />
                      <button
                        type="button"
                        onClick={() => removeMember(it.productId)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {packTierRows.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Price by quantity (auto)</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Calculated automatically by summing each product&apos;s quantity price tier.
                    From {formatRupees(packFromPrice)}/pack.
                  </p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-normal text-gray-500">Order quantity</th>
                          <th className="text-right px-3 py-1.5 font-normal text-gray-500">Price / pack</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {packTierRows.map((r, i) => {
                          const next = packTierRows[i + 1];
                          const label = next ? `${r.qty}–${next.qty - 1}` : `${r.qty}+`;
                          return (
                            <tr key={r.qty}>
                              <td className="px-3 py-1.5 text-gray-900">{label} units</td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">
                                {formatRupees(r.price)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {!isPack && (
          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Tax & HSN</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Select the HSN code for this product. GST rate will be auto-filled based on the HSN category.
              </p>
            </div>
            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">HSN Code *</label>
              <Input {...form.register('hsnCode')} placeholder="e.g. 4202" required />
              <p className="text-xs text-gray-500 mt-1">HSN code for tax classification (GST rate is taken from it)</p>
              {form.formState.errors.hsnCode && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.hsnCode.message}</p>
              )}
            </div>
          </section>
          )}

          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Media</h2>
            <ProductMedia
              images={images}
              setImages={setImages}
              mode={mode}
              productId={initialData?.id}
              primaryImageIdx={primaryImageIdx}
              onZoom={setZoomIdx}
              onDelete={handleDeleteImage}
            />
          </section>

          {!isPack && (
          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Pricing</h2>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-normal text-gray-900">Price Tiers</h3>
              <button
                type="button"
                onClick={() => {
                  const tiers = form.getValues('priceTiers') || [];
                  const newTier = {
                    tier: Math.max(...tiers.map(t => t.tier)) + 1,
                    minQty: (tiers[tiers.length - 1]?.maxQty || 0) + 1,
                    maxQty: null,
                    costPrice: 0,
                    sellPrice: 0,
                  };
                  form.setValue('priceTiers', [...tiers, newTier]);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-normal rounded-lg hover:bg-green-700 transition"
              >
                <Plus className="w-4 h-4" /> Add Tier
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-normal w-6"></th>
                    <th className="px-2 py-2 text-left text-xs font-normal">Tier</th>
                    <th className="px-2 py-2 text-left text-xs font-normal">Min Qty</th>
                    <th className="px-2 py-2 text-left text-xs font-normal">Max Qty</th>
                    <th className="px-2 py-2 text-left text-xs font-normal">Cost Price</th>
                    <th className="px-2 py-2 text-left text-xs font-normal">Sell Price</th>
                    <th className="px-2 py-2 text-left text-xs font-normal">Margin %</th>
                    <th className="px-2 py-2 text-center text-xs font-normal">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {form.watch('priceTiers')?.map((tier, idx) => {
                    const cost = form.watch(`priceTiers.${idx}.costPrice`);
                    const sell = form.watch(`priceTiers.${idx}.sellPrice`);
                    const margin = sell && cost ? ((sell - cost) / sell * 100).toFixed(1) : '0';
                    const marginColor = parseFloat(margin) >= 30 ? 'text-green-600' : parseFloat(margin) >= 20 ? 'text-yellow-600' : 'text-red-600';
                    const tiers = form.getValues('priceTiers') || [];
                    const canDelete = tiers.length > 1;

                    return (
                      <tr
                        key={`tier-${idx}`}
                        onDragOver={(e) => {
                          if (dragTierIdx === null) return;
                          e.preventDefault();
                          if (dragOverTierIdx !== idx) setDragOverTierIdx(idx);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragTierIdx !== null) reorderPriceTier(dragTierIdx, idx);
                          setDragTierIdx(null);
                          setDragOverTierIdx(null);
                        }}
                        className={`transition-colors ${
                          dragTierIdx === idx
                            ? 'opacity-40'
                            : dragOverTierIdx === idx
                              ? 'bg-green-50'
                              : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-2 py-2 text-center align-middle">
                          <span
                            draggable
                            onDragStart={() => setDragTierIdx(idx)}
                            onDragEnd={() => {
                              setDragTierIdx(null);
                              setDragOverTierIdx(null);
                            }}
                            className="inline-flex cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                            title="Drag to reorder"
                          >
                            <GripVertical className="w-4 h-4" />
                          </span>
                        </td>
                        <td className="px-2 py-2 font-normal">{tier.tier}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            {...form.register(`priceTiers.${idx}.minQty`, { valueAsNumber: true })}
                            className="w-16 border border-gray-300 rounded p-1 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            {...form.register(`priceTiers.${idx}.maxQty`, { valueAsNumber: true })}
                            placeholder="∞"
                            className="w-16 border border-gray-300 rounded p-1 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            {...form.register(`priceTiers.${idx}.costPrice`, { valueAsNumber: true })}
                            className="w-20 border border-gray-300 rounded p-1 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            {...form.register(`priceTiers.${idx}.sellPrice`, { valueAsNumber: true })}
                            className="w-20 border border-gray-300 rounded p-1 text-xs"
                          />
                        </td>
                        <td className={`px-2 py-2 font-normal text-xs ${marginColor}`}>{margin}%</td>
                        <td className="px-2 py-2 text-center">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                const newTiers = form.getValues('priceTiers')?.filter((_, i) => i !== idx) || [];
                                form.setValue('priceTiers', newTiers);
                              }}
                              className="text-red-600 hover:text-red-800 transition inline-flex items-center justify-center"
                              title="Delete tier"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">Change Reason *</label>
                <Input
                  value={priceReason}
                  onChange={(e) => setPriceReason(e.target.value)}
                  placeholder="e.g. Supplier cost increase, Promotional pricing"
                />
                <p className="text-xs text-gray-500 mt-1">Required to create price audit log</p>
              </div>
            )}
          </section>
          )}

          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Variants</h2>
            <p className="text-sm text-gray-500">
              Add options like size or colour. Each option can have multiple values —
              colours get a swatch, sizes can carry a per-box price, and any value can have its own image.
            </p>

            <ProductVariants
              variants={variants}
              setVariants={setVariants}
              mode={mode}
              productId={initialData?.id}
              onImageUpload={handleVariantImageUpload}
            />
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Visibility</h2>
            <div>
              <label className="block text-sm font-normal text-gray-900 mb-2">Status</label>
              <select
                {...form.register('status')}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...form.register('isFeatured')} className="rounded" />
                <span className="text-sm font-normal text-gray-900">Featured Product</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...form.register('isEcoCertified')} className="rounded" />
                <span className="text-sm font-normal text-gray-900">Eco-Certified</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...form.register('sampleAvailable')} className="rounded" />
                <span className="text-sm font-normal text-gray-900">Sample Available</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">Eco Certification</label>
              <Input {...form.register('ecoCertification')} placeholder="e.g. GOTS, FSC, GRS, rPET" />
              <p className="text-xs text-gray-500 mt-1">Name of the eco certification (if eco-certified)</p>
            </div>
          </section>

          {/* Search engine listing — Shopify-style SEO card with live Google preview. */}
          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Search engine listing</h2>

            <div className="rounded-lg border border-gray-200 p-4">
              <p className="truncate text-xs text-gray-500">
                {(process.env.NEXT_PUBLIC_APP_URL || 'https://givoo.in')}/products/{form.watch('slug') || 'product-handle'}
              </p>
              <p className="mt-0.5 truncate text-lg leading-snug text-[#1a0dab]">
                {form.watch('metaTitle') || form.watch('name') || 'Product title'}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">
                {form.watch('metaDescription') ||
                  stripHtml(form.watch('descriptionShort') || form.watch('descriptionLong')) ||
                  'Add a page title and description to control how this product appears in search results.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">Page title</label>
              <Input {...form.register('metaTitle')} placeholder="SEO page title" />
            </div>

            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">URL handle</label>
              <Input
                value={form.watch('slug') || ''}
                onChange={(e) => form.setValue('slug', e.target.value, { shouldDirty: true })}
                placeholder="product-handle"
              />
            </div>

            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">Meta description</label>
              <textarea
                {...form.register('metaDescription')}
                placeholder="SEO description"
                rows={2}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              />
            </div>
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Analytics</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600">📊 Analytics coming in Phase 2</p>
            </div>
          </section>
        </div>
        {/* Side column — organization */}
        <div className="lg:col-span-1 space-y-5">
          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Categories & Occasions</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Select categories and occasions for this product.
              </p>
            </div>

            {/* Categories */}
            <SearchableMultiSelect
              label="Categories"
              placeholder={categories.length === 0 ? 'Loading categories…' : 'Search & select categories…'}
              options={categories.map((c) => ({ id: c.id, label: c.name }))}
              selected={form.watch('categoryIds') || []}
              onChange={(next) => form.setValue('categoryIds', next)}
            />

            {/* Occasions */}
            <SearchableMultiSelect
              label="Occasions"
              placeholder={occasions.length === 0 ? 'Loading occasions…' : 'Search & select occasions…'}
              options={occasions.map((o) => ({ id: o.id, label: `${o.icon ? o.icon + ' ' : ''}${o.name}` }))}
              selected={form.watch('occasionIds') || []}
              onChange={(next) => form.setValue('occasionIds', next)}
            />

            {/* Recipient Tags */}
            <div>
              <label className="block text-sm font-normal text-gray-900 mb-3">Recipient Tags</label>
              <Controller
                control={form.control}
                name="recipientTags"
                render={({ field }) => (
                  <TagCombobox
                    value={field.value || []}
                    onChange={field.onChange}
                    suggestions={RECIPIENT_OPTIONS}
                    placeholder="Search or add a recipient…"
                  />
                )}
              />
              <p className="text-xs text-gray-500 mt-2">Who this product is meant for (from the product master)</p>
            </div>

            {/* Collection Tags — drive tag-based curated collections */}
            <div>
              <label className="block text-sm font-normal text-gray-900 mb-3">Collection Tags</label>
              <Controller
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <TagCombobox
                    value={field.value || []}
                    onChange={field.onChange}
                    suggestions={COLLECTION_TAG_OPTIONS}
                    placeholder="Search or add a tag…"
                    lowercaseNew
                  />
                )}
              />
              <p className="text-xs text-gray-500 mt-2">
                Products with a tag matching a Collection (set in Occasions → tags) are pulled in automatically.
              </p>
            </div>
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Printing & Branding</h2>
            <div className="bg-gold-50 border border-gold rounded-lg p-4">
              <p className="text-sm text-gold-700 font-normal">
                💡 Printing cost is included in the sellPrice — no separate "Branding Cost" line is shown to customers.
              </p>
            </div>

            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">Printing Technique</label>
              <select
                {...form.register('printingTechnique')}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              >
                <option value="none">None</option>
                <option value="screen_print">Screen Print</option>
                <option value="digital_print">Digital Print</option>
                <option value="embroidery">Embroidery</option>
                <option value="uv_print">UV Print</option>
                <option value="laser_engraving">Laser Engraving</option>
                <option value="emboss">Emboss</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">Printing Position</label>
              <Input {...form.register('printingPosition')} placeholder="e.g. Front Center, Back, Sleeve" />
            </div>

            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">Branding Area</label>
              <Input {...form.register('brandingArea')} placeholder="e.g. 60×40 mm" />
              <p className="text-xs text-gray-500 mt-1">Maximum printable area for the logo/branding</p>
            </div>
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Vendors & Sourcing</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <p className="text-sm text-blue-900">
                Link this product to its vendor(s). Mark one as Primary.
              </p>
              <button
                type="button"
                onClick={() =>
                  setVendorLinks((prev) => [
                    ...prev,
                    {
                      vendorId: '',
                      isPrimary: prev.length === 0,
                      costPrice: null,
                      vendorSku: '',
                      vendorMoq: null,
                      vendorLeadDays: null,
                      sourcingStatus: '',
                      lastPriceConfirmedAt: '',
                    },
                  ])
                }
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-normal rounded-lg hover:bg-blue-700 transition shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Vendor
              </button>
            </div>

            {vendorOptions.length === 0 && (
              <p className="text-sm text-gray-500">
                No vendors found. Create vendors under Admin → Vendors first.
              </p>
            )}

            {vendorLinks.length === 0 ? (
              <p className="text-sm text-gray-500">No vendors linked yet. Click "Add Vendor" to start.</p>
            ) : (
              <div className="space-y-3">
                {vendorLinks.map((link, idx) => {
                  const update = (patch: Partial<VendorLink>) =>
                    setVendorLinks((prev) =>
                      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l))
                    );
                  return (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-normal text-gray-500 uppercase">Vendor {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setVendorLinks((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Remove vendor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                        <div>
                          <label className="block text-xs font-normal text-gray-700 mb-1">Vendor *</label>
                          <SearchableSelect
                            options={vendorOptions.map((v) => ({ id: v.id, label: v.name }))}
                            value={link.vendorId}
                            onChange={(id) => update({ vendorId: id })}
                            placeholder="Select vendor…"
                            emptyText="No vendors yet"
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer pb-2">
                          <input
                            type="radio"
                            name="primaryVendor"
                            checked={link.isPrimary}
                            onChange={() =>
                              setVendorLinks((prev) =>
                                prev.map((l, i) => ({ ...l, isPrimary: i === idx }))
                              )
                            }
                          />
                          <span className="text-sm font-normal text-gray-900">Primary Vendor</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Submit buttons */}
      <div className="flex gap-3 pt-6 border-t border-gray-200">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={goBackToList}>
          Cancel
        </Button>
      </div>

      {/* Image zoom lightbox — view large + edit alt text + set primary / remove */}
      {zoomIdx !== null && images[zoomIdx] && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setZoomIdx(null)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomIdx(null)}
              className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-gray-900/70 text-white hover:bg-gray-900"
              title="Close"
            >
              ×
            </button>

            <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
              {/* Zoomed image */}
              <div className="flex items-center justify-center bg-gray-50 p-4">
                <img
                  src={images[zoomIdx].url}
                  alt={images[zoomIdx].altText || 'Product image'}
                  className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
                />
              </div>

              {/* Details + actions */}
              <div className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900">Image details</h3>
                  {zoomIdx === primaryImageIdx && (
                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
                      Primary
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Image name / Alt text</label>
                  <Input
                    type="text"
                    value={images[zoomIdx].altText || ''}
                    placeholder="Describe this image (used as alt text)"
                    onChange={(e) =>
                      setImages((prev) =>
                        prev.map((p, i) => (i === zoomIdx ? { ...p, altText: e.target.value } : p))
                      )
                    }
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Helps SEO &amp; screen readers.</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveAlt(zoomIdx, images[zoomIdx]?.altText || '')}
                  className="w-full bg-gray-900 text-white text-sm font-medium rounded-lg py-2 hover:bg-gray-800 transition"
                >
                  Save alt text
                </button>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={zoomIdx === primaryImageIdx}
                    onClick={() => handleSetPrimary(zoomIdx)}
                    className="text-sm font-medium rounded-lg py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {zoomIdx === primaryImageIdx ? 'Is Primary' : 'Set Primary'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(zoomIdx)}
                    className="text-sm font-medium rounded-lg py-2 border border-red-200 text-red-600 hover:bg-red-50 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
