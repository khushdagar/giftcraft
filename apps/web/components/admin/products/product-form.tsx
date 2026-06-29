'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { formatRupees } from '@/lib/utils';
import { toast, useToastStore } from '@/lib/stores/toast-store';
import { resolveSwatchHex } from '@/lib/color-name';
import { SearchableMultiSelect } from './searchable-multi-select';

const ProductSchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  sku: z.string().min(1, 'SKU required'),
  descriptionShort: z.string().nullable().optional(),
  descriptionLong: z.string().nullable().optional(),
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

// Per-vendor sourcing status from the product master
const SOURCING_OPTIONS = [
  { value: 'ok', label: 'OK' },
  { value: 'to_approach', label: 'To Approach' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'onboarded', label: 'Onboarded' },
];

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
}: {
  mode: 'create' | 'edit';
  initialData?: SerializedProduct;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceReason, setPriceReason] = useState('');
  // Drag-to-reorder state for the price-tier rows.
  const [dragTierIdx, setDragTierIdx] = useState<number | null>(null);
  const [dragOverTierIdx, setDragOverTierIdx] = useState<number | null>(null);
  const [images, setImages] = useState<Array<{ id?: string; url: string; isPrimary: boolean; file?: File }>>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; parentId?: string | null }>>([]);
  const [occasions, setOccasions] = useState<Array<{ id: string; name: string; icon?: string }>>([]);
  const [variants, setVariants] = useState<Array<{ id?: string; kind: string; value: string; hexColor?: string; sortOrder: number }>>([]);
  const [newVariant, setNewVariant] = useState({ kind: 'color', value: '', hexColor: '', customKind: '' });
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [vendorLinks, setVendorLinks] = useState<VendorLink[]>([]);

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

  // Load existing images when editing
  useEffect(() => {
    if (mode === 'edit' && initialData?.images) {
      setImages(
        initialData.images.map((img: any) => ({
          id: img.id,
          url: img.url,
          isPrimary: img.isPrimary,
        }))
      );
    }
  }, [mode, initialData]);

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

      // Add product data with variants - ensure proper data types
      const dataWithVariants = {
        ...data,
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

      // Wait a moment before navigating to let toast display
      setTimeout(() => {
        router.push('/admin/products');
        router.refresh();
      }, 500);
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
                <label className="block text-sm font-normal text-gray-900 mb-1">SKU *</label>
                <Input {...form.register('sku')} placeholder="e.g. FLASK-500-SS" />
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
              <textarea
                {...form.register('descriptionLong')}
                placeholder="Detailed product description"
                rows={4}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">Weight (g)</label>
                <Input type="number" {...form.register('weightG', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">Lead Time (days)</label>
                <Input type="number" {...form.register('leadTimeDays', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="block text-sm font-normal text-gray-900 mb-1">MOQ</label>
                <Input type="number" {...form.register('moq', { valueAsNumber: true })} placeholder="e.g. 25" />
                <p className="text-xs text-gray-500 mt-1">Min. order quantity</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-normal text-blue-900 mb-3">Product Dimensions (cm)</p>
              <p className="text-xs text-blue-800 mb-3">Required for automatic packaging suggestions</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-normal text-gray-900 mb-1">Length (L)</label>
                  <Input type="number" step="0.1" min="0" {...form.register('lengthCm', { valueAsNumber: true })} placeholder="cm" />
                </div>
                <div>
                  <label className="block text-sm font-normal text-gray-900 mb-1">Width (W)</label>
                  <Input type="number" step="0.1" min="0" {...form.register('widthCm', { valueAsNumber: true })} placeholder="cm" />
                </div>
                <div>
                  <label className="block text-sm font-normal text-gray-900 mb-1">Height (H)</label>
                  <Input type="number" step="0.1" min="0" {...form.register('heightCm', { valueAsNumber: true })} placeholder="cm" />
                </div>
              </div>
            </div>
          </section>

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

          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Images</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Upload product images. First image will be set as primary.
              </p>
            </div>

            {/* Upload Area */}
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-500 transition block text-center">
              <input
                key={`file-input-${images.length}`}
                type="file"
                multiple
                accept="image/*"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);

                  if (files.length === 0) return;

                  // Only upload if in edit mode (product already exists)
                  if (mode === 'edit' && initialData?.id) {
                    let uploadingToastId: string | null = null;
                    try {
                      // Show uploading toast and capture its ID for later dismissal
                      uploadingToastId = toast.info('📤 Uploading images...', 0); // No auto-dismiss

                      const formData = new FormData();
                      files.forEach((file) => {
                        formData.append('images', file);
                      });

                      const res = await fetch(`/api/admin/products/${initialData.id}/images`, {
                        method: 'POST',
                        body: formData,
                      });

                      if (!res.ok) {
                        const error = await res.json();
                        throw new Error(error.error || 'Upload failed');
                      }

                      const result = await res.json();

                      // Dismiss the uploading toast
                      if (uploadingToastId) {
                        useToastStore.getState().removeToast(uploadingToastId);
                      }

                      // Replace local images state with all images from server
                      // (result.images already contains ALL images, not just new ones)
                      setImages(
                        result.images.map((img: any) => ({
                          id: img.id,
                          url: img.url,
                          isPrimary: img.isPrimary,
                        }))
                      );

                      // Show result toast
                      if (result.uploadedCount > 0) {
                        toast.success(`✅ ${result.uploadedCount} image(s) saved to database!`);
                      }
                      if (result.failedCount > 0) {
                        toast.error(`⚠️ Failed: ${result.failedImages.join(', ')}`);
                      }
                    } catch (err) {
                      // Dismiss the uploading toast on error
                      if (uploadingToastId) {
                        useToastStore.getState().removeToast(uploadingToastId);
                      }

                      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
                      toast.error(`❌ Error: ${errorMsg}`);
                    }
                  } else if (mode === 'create') {
                    // For create mode, just add to local state (will be uploaded on save)
                    let loadedCount = 0;

                    files.forEach((file) => {
                      // Validate file size (5MB)
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error(`❌ ${file.name} exceeds 5MB limit`);
                        return;
                      }

                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setImages((prev) => [
                          ...prev,
                          {
                            url: event.target?.result as string,
                            isPrimary: prev.length === 0,
                            file,
                          },
                        ]);
                        loadedCount++;
                        if (loadedCount === files.length) {
                          toast.info(`✅ ${files.length} image(s) ready to upload`);
                        }
                      };
                      reader.onerror = () => {
                        toast.error(`❌ Failed to read ${file.name}`);
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                }}
                className="hidden"
              />
              <div>
                <p className="text-sm font-normal text-gray-900">Click to upload images</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP up to 5MB each</p>
              </div>
            </label>

            {/* Image List */}
            {images.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-normal text-gray-900">Uploaded Images ({images.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                        <img
                          src={img.url}
                          alt={`Product ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Primary Badge */}
                      {img.isPrimary && (
                        <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-1 rounded font-normal">
                          Primary
                        </div>
                      )}

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center gap-2">
                        {!img.isPrimary && (
                          <button
                            type="button"
                            onClick={async () => {
                              // Update local state
                              setImages((prev) =>
                                prev.map((p, i) => ({
                                  ...p,
                                  isPrimary: i === idx,
                                }))
                              );

                              // If image has ID (saved in DB), update in database
                              if (img.id && mode === 'edit' && initialData?.id) {
                                try {
                                  const res = await fetch(
                                    `/api/admin/products/${initialData.id}/images?imageId=${img.id}`,
                                    { method: 'PUT' }
                                  );
                                  if (!res.ok) {
                                    toast.error('Failed to update primary image');
                                  }
                                } catch (err) {
                                  console.error('Error updating primary image:', err);
                                }
                              }
                            }}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-normal hover:bg-blue-700"
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            // If image has ID (saved in DB), delete from database
                            if (img.id && mode === 'edit' && initialData?.id) {
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

                                // Remove from local state
                                setImages((prev) => prev.filter((_, i) => i !== idx));
                                toast.success('✅ Image deleted');
                              } catch (err) {
                                const errorMsg = err instanceof Error ? err.message : 'Delete failed';
                                toast.error(`❌ Error: ${errorMsg}`);
                              }
                            } else {
                              // Not saved yet, just remove from local state
                              setImages((prev) => prev.filter((_, i) => i !== idx));
                              toast.info('Image removed');
                            }
                          }}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs font-normal hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

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

          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Variants</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-normal">
                💡 Add product variants like color, size, material, etc. You can add multiple values at once by separating them with commas (e.g., "Small, Medium, Large"). Use the "Custom" type to add any variant type you want (e.g., Brand, Design, Collection).
              </p>
            </div>

            {/* Add New Variant Form */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-normal text-gray-900">Add New Variant</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-normal text-gray-900 mb-1">Type *</label>
                  <select
                    value={newVariant.kind}
                    onChange={(e) => {
                      setNewVariant({ ...newVariant, kind: e.target.value, customKind: '' });
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  >
                    <option value="color">Color</option>
                    <option value="size">Size</option>
                    <option value="material">Material</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-normal text-gray-900 mb-1">Value *</label>
                  <Input
                    type="text"
                    placeholder={
                      newVariant.kind === 'color'
                        ? 'e.g. Red, Blue, Green'
                        : newVariant.kind === 'size'
                        ? 'e.g. Small, Medium, Large, XL'
                        : newVariant.kind === 'material'
                        ? 'e.g. Cotton, Polyester, Wool'
                        : 'e.g. Nike, Adidas, Puma'
                    }
                    value={newVariant.value}
                    onChange={(e) => setNewVariant({ ...newVariant, value: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">💡 Separate multiple values with commas to add them all at once</p>
                </div>
              </div>

              {/* Custom Variant Type Input */}
              {newVariant.kind === 'custom' && (
                <div>
                  <label className="block text-sm font-normal text-gray-900 mb-1">Custom Type Name *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Brand, Design, Pattern, Collection"
                    value={newVariant.customKind}
                    onChange={(e) => setNewVariant({ ...newVariant, customKind: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">What would you like to call this variant type?</p>
                </div>
              )}

              {newVariant.kind === 'color' && (
                <div>
                  <label className="block text-sm font-normal text-gray-900 mb-1">Color Code</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={newVariant.hexColor || '#000000'}
                      onChange={(e) => setNewVariant({ ...newVariant, hexColor: e.target.value })}
                      className="w-16 h-10 p-1 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <Input
                      type="text"
                      placeholder="#000000"
                      value={newVariant.hexColor}
                      onChange={(e) => setNewVariant({ ...newVariant, hexColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  // Determine the actual kind to use
                  const actualKind = newVariant.kind === 'custom' ? newVariant.customKind : newVariant.kind;

                  // Validation
                  if (newVariant.kind === 'custom') {
                    const customKindTrimmed = actualKind.trim();
                    if (!customKindTrimmed) {
                      toast.error('❌ Please enter a custom variant type name', 3000);
                      return;
                    }
                  }

                  const rawValue = newVariant.value.trim();
                  if (!rawValue) {
                    toast.error('❌ Please enter a variant value', 3000);
                    return;
                  }

                  // Split by comma to support multiple values (e.g., "Small, Medium, Large")
                  const values = rawValue
                    .split(',')
                    .map((v) => v.trim())
                    .filter((v) => v.length > 0);

                  if (values.length === 0) {
                    toast.error('❌ Please enter at least one variant value', 3000);
                    return;
                  }

                  // Validate hex color only if single color variant
                  if (newVariant.kind === 'color' && newVariant.hexColor && values.length === 1) {
                    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                    if (!hexRegex.test(newVariant.hexColor)) {
                      toast.error('❌ Invalid hex color format (use #RRGGBB)', 3000);
                      return;
                    }
                  }

                  // Check for duplicates
                  const newVariants: Array<{ id?: string; kind: string; value: string; hexColor?: string; sortOrder: number }> = [];
                  const duplicates: string[] = [];

                  values.forEach((value) => {
                    const isDuplicate = variants.some(
                      (v) => v.kind.toLowerCase() === actualKind.toLowerCase() && v.value.toLowerCase() === value.toLowerCase()
                    );

                    if (isDuplicate) {
                      duplicates.push(value);
                    } else {
                      newVariants.push({
                        kind: actualKind,
                        value,
                        hexColor: newVariant.kind === 'color' && newVariant.hexColor ? newVariant.hexColor : undefined,
                        sortOrder: variants.length + newVariants.length,
                      });
                    }
                  });

                  if (newVariants.length === 0) {
                    toast.error(`❌ All values already exist as variants`, 3000);
                    return;
                  }

                  setVariants([...variants, ...newVariants]);
                  setNewVariant({ kind: 'color', value: '', hexColor: '', customKind: '' });

                  const message =
                    newVariants.length === 1
                      ? `✅ 1 variant added`
                      : `✅ ${newVariants.length} variants added`;

                  if (duplicates.length > 0) {
                    toast.warning(`${message} (${duplicates.join(', ')} already existed)`, 3000);
                  } else {
                    toast.success(message, 2000);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-normal py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="h-4 w-4" /> Add Variant
              </button>
            </div>

            {/* Variants List */}
            {variants.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-normal text-gray-900">Product Variants ({variants.length})</h3>
                <div className="grid gap-2">
                  {variants.map((variant, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        {variant.kind === 'color' && (
                          <div
                            className="w-6 h-6 rounded-md border border-gray-300"
                            style={{ backgroundColor: resolveSwatchHex(variant.value, variant.hexColor) }}
                          />
                        )}
                        <div>
                          <p className="text-xs text-gray-500 font-normal uppercase">{variant.kind}</p>
                          <p className="text-sm font-medium text-gray-900">{variant.value}</p>
                        </div>
                      </div>
                      {/* Inline colour editor for existing colour variants */}
                      {variant.kind === 'color' && (
                        <div className="flex items-center gap-2 ml-auto mr-3">
                          <input
                            type="color"
                            value={resolveSwatchHex(variant.value, variant.hexColor)}
                            onChange={(e) =>
                              setVariants(
                                variants.map((v, i) =>
                                  i === idx ? { ...v, hexColor: e.target.value } : v
                                )
                              )
                            }
                            className="w-9 h-9 p-1 border border-gray-300 rounded-lg cursor-pointer bg-white"
                            title="Pick colour"
                          />
                          <Input
                            type="text"
                            placeholder="#000000"
                            value={variant.hexColor || ''}
                            onChange={(e) =>
                              setVariants(
                                variants.map((v, i) =>
                                  i === idx ? { ...v, hexColor: e.target.value } : v
                                )
                              )
                            }
                            className="w-28 text-sm"
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (mode === 'edit' && variant.id) {
                              // Delete from API if already saved
                              const res = await fetch(
                                `/api/admin/products/${initialData?.id}/variants?variantId=${variant.id}`,
                                { method: 'DELETE' }
                              );
                              if (!res.ok) {
                                const error = await res.json();
                                throw new Error(error.error || 'Failed to delete variant');
                              }
                            }
                            // Remove from local list
                            setVariants(variants.filter((_, i) => i !== idx));
                            toast.success('✅ Variant removed', 2000);
                          } catch (err) {
                            const errorMsg = err instanceof Error ? err.message : 'Failed to remove variant';
                            toast.error(`❌ Error: ${errorMsg}`, 4000);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Remove variant"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Visibility & SEO</h2>
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

            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">Meta Title</label>
              <Input {...form.register('metaTitle')} placeholder="SEO page title" />
            </div>

            <div>
              <label className="block text-sm font-normal text-gray-900 mb-1">Meta Description</label>
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
              <div className="flex flex-wrap gap-2">
                {RECIPIENT_OPTIONS.map((tag) => {
                  const selected = form.watch('recipientTags')?.includes(tag) || false;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const current = form.getValues('recipientTags') || [];
                        if (current.includes(tag)) {
                          form.setValue('recipientTags', current.filter((t) => t !== tag));
                        } else {
                          form.setValue('recipientTags', [...current, tag]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full border text-sm transition ${
                        selected
                          ? 'bg-dark text-inv border-dark'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">Who this product is meant for (from the product master)</p>
            </div>

            {/* Collection Tags — drive tag-based curated collections */}
            <div>
              <label className="block text-sm font-normal text-gray-900 mb-3">Collection Tags</label>
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  new Set([
                    ...COLLECTION_TAG_OPTIONS,
                    ...((form.watch('tags') as string[] | undefined) || []),
                  ])
                ).map((tag) => {
                  const selected = form.watch('tags')?.includes(tag) || false;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const current = form.getValues('tags') || [];
                        if (current.includes(tag)) {
                          form.setValue('tags', current.filter((t) => t !== tag));
                        } else {
                          form.setValue('tags', [...current, tag]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full border text-sm transition ${
                        selected
                          ? 'bg-dark text-inv border-dark'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                placeholder="Add a custom tag and press Enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim().toLowerCase();
                    if (!val) return;
                    const current = form.getValues('tags') || [];
                    if (!current.includes(val)) form.setValue('tags', [...current, val]);
                    e.currentTarget.value = '';
                  }
                }}
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
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
                Link this product to its vendor(s) with sourcing details. Mark one as Primary.
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

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-normal text-gray-700 mb-1">Vendor *</label>
                          <select
                            value={link.vendorId}
                            onChange={(e) => update({ vendorId: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                          >
                            <option value="">Select vendor…</option>
                            {vendorOptions.map((v) => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-normal text-gray-700 mb-1">Sourcing Status</label>
                          <select
                            value={link.sourcingStatus}
                            onChange={(e) => update({ sourcingStatus: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                          >
                            <option value="">—</option>
                            {SOURCING_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-normal text-gray-700 mb-1">Vendor SKU</label>
                          <Input
                            value={link.vendorSku}
                            onChange={(e) => update({ vendorSku: e.target.value })}
                            placeholder="SKU"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-normal text-gray-700 mb-1">Vendor Cost ₹</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={link.costPrice ?? ''}
                            onChange={(e) =>
                              update({ costPrice: e.target.value === '' ? null : Number(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-normal text-gray-700 mb-1">Vendor MOQ</label>
                          <Input
                            type="number"
                            value={link.vendorMoq ?? ''}
                            onChange={(e) =>
                              update({ vendorMoq: e.target.value === '' ? null : Number(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-normal text-gray-700 mb-1">Vendor Lead (days)</label>
                          <Input
                            type="number"
                            value={link.vendorLeadDays ?? ''}
                            onChange={(e) =>
                              update({ vendorLeadDays: e.target.value === '' ? null : Number(e.target.value) })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                          <label className="block text-xs font-normal text-gray-700 mb-1">Last Price Confirmed</label>
                          <Input
                            type="date"
                            value={link.lastPriceConfirmedAt}
                            onChange={(e) => update({ lastPriceConfirmedAt: e.target.value })}
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
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
