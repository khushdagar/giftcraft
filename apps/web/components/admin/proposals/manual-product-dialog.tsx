'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ImagePlus, Loader2, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field-error';

/** The shape /api/admin/proposals/manual-product returns — same as /api/products rows. */
export interface ManualProductResult {
  id: string;
  name: string;
  brand: string | null;
  proposalOnly?: boolean;
  images: { url: string }[];
  priceTiers: { minQty: number; maxQty: number | null; sellPrice: number }[];
}

interface HsnOption {
  code: string;
  description: string;
  gstRate: number;
}

const GST_RATES = [0, 5, 12, 18, 28];

const optionalNumber = z.preprocess(
  (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : Number(v)),
  z.number().min(0, 'Cannot be negative').optional()
);

const formSchema = z.object({
  name: z.string().trim().min(2, 'Enter the product name').max(160),
  brand: z.string().trim().max(80).optional(),
  sellPrice: z.preprocess(
    (v) => (v === '' || v == null ? NaN : Number(v)),
    z
      .number({ invalid_type_error: 'Enter the sell price' })
      .positive('Enter the sell price')
      .max(10000000)
  ),
  costPrice: optionalNumber,
  hsnCode: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, 'HSN code must be 4 to 8 digits'),
  gstRate: z.preprocess((v) => Number(v), z.number().min(0).max(28)),
  keyFeatures: z.string().trim().max(2000).optional(),
  weightG: optionalNumber,
});

type FormValues = z.infer<typeof formSchema>;

const inputCls =
  'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500';

const DEFAULTS = {
  name: '',
  brand: '',
  sellPrice: '' as unknown as number,
  costPrice: undefined,
  hsnCode: '',
  gstRate: 18,
  keyFeatures: '',
  weightG: undefined,
};

/**
 * A one-off product for this proposal only — something the lead asked for that
 * is not in the catalogue. Saved hidden (never listed on the storefront or in
 * the Products tab), with one flat price instead of quantity tiers.
 */
export function ManualProductDialog({
  open,
  onOpenChange,
  onCreated,
  editId,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: ManualProductResult) => void;
  /** Set to correct an existing manual product instead of adding a new one. */
  editId?: string | null;
  onUpdated?: (product: ManualProductResult) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: DEFAULTS });

  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [hsnOptions, setHsnOptions] = useState<HsnOption[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Known HSN codes — picking one fills in its GST rate.
  useEffect(() => {
    if (!open || hsnOptions.length > 0) return;
    fetch('/api/hsn')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setHsnOptions(Array.isArray(d) ? d : []))
      .catch(() => {/* the code can still be typed by hand */});
  }, [open, hsnOptions.length]);

  // GST follows the HSN code: a known code fixes the rate (the tax master is
  // the source of truth). Only a brand-new code lets the admin choose one.
  const hsnCode = watch('hsnCode');
  const knownHsn = hsnOptions.find((h) => h.code === hsnCode?.trim());
  const knownRate = knownHsn?.gstRate;
  useEffect(() => {
    if (knownRate != null) setValue('gstRate', knownRate);
  }, [knownRate, setValue]);

  // Edit mode — pull the saved details (HSN, cost, features…) into the form.
  const [loadingDetails, setLoadingDetails] = useState(false);
  useEffect(() => {
    if (!open || !editId) return;
    let cancelled = false;
    setLoadingDetails(true);
    fetch(`/api/admin/proposals/manual-product/${editId}`, { cache: 'no-store' })
      .then((r) => r.json().catch(() => null))
      .then((d) => {
        if (cancelled) return;
        if (!d?.success) throw new Error(d?.error || 'Could not load the product');
        const p = d.data;
        reset({
          name: p.name,
          brand: p.brand ?? '',
          sellPrice: p.sellPrice,
          costPrice: p.costPrice ?? undefined,
          hsnCode: p.hsnCode,
          gstRate: p.gstRate,
          keyFeatures: p.keyFeatures ?? '',
          weightG: p.weightG ?? undefined,
        });
        setImageUrl(p.imageUrl || '');
        setImageError('');
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : 'Could not load the product');
        onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, editId, reset, onOpenChange]);

  const close = () => {
    onOpenChange(false);
    reset(DEFAULTS);
    setImageUrl('');
    setImageError('');
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('The image must be smaller than 5 MB');
      return;
    }
    setUploading(true);
    setImageError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'proposal-products');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Image upload failed');
      setImageUrl(String(data.url));
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!imageUrl) {
      setImageError('Add a product image');
      return;
    }
    try {
      const res = await fetch(
        editId
          ? `/api/admin/proposals/manual-product/${editId}`
          : '/api/admin/proposals/manual-product',
        {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, imageUrl }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to save the product');
      if (editId) {
        onUpdated?.(data.data as ManualProductResult);
        toast.success('Product updated', {
          description: 'Proposals already sent keep the price they were quoted at.',
        });
      } else {
        onCreated(data.data as ManualProductResult);
        toast.success('Product added to this pack', {
          description: 'It is only used for proposals and is not listed in the catalogue.',
        });
      }
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add the product');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto">
        <DialogTitle className="text-base font-semibold text-gray-900">
          {editId ? 'Edit manual product' : 'Add a manual product'}
        </DialogTitle>
        <DialogDescription className="text-xs text-gray-500">
          For an item the client asked for that is not in the catalogue. It is used for proposals
          only and will not appear on the website or in Products.
        </DialogDescription>

        {loadingDetails && (
          <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading product details…
          </div>
        )}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={`mt-2 space-y-3 ${loadingDetails ? 'pointer-events-none opacity-50' : ''}`}
          noValidate
        >
          <div className="flex gap-3">
            <div className="shrink-0">
              <span className={labelCls}>Image *</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => uploadImage(e.target.files?.[0])}
              />
              {imageUrl ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                  <Image src={imageUrl} alt="" fill sizes="96px" className="object-contain" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-gray-600 shadow hover:text-red-600"
                    title="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-gray-50 text-[11px] text-gray-500 hover:border-indigo-400 hover:text-indigo-600 ${
                    imageError ? 'border-red-400' : 'border-gray-300'
                  }`}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <label className={labelCls} htmlFor="mp-name">Product name *</label>
                <input id="mp-name" {...register('name')} className={inputCls} placeholder="e.g. Copper Water Bottle 1 L" />
                <FieldError message={errors.name?.message} />
              </div>
              <div>
                <label className={labelCls} htmlFor="mp-brand">Brand</label>
                <input id="mp-brand" {...register('brand')} className={inputCls} placeholder="Optional" />
              </div>
            </div>
          </div>
          <FieldError message={imageError} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="mp-sell">Sell price (₹, excl. GST) *</label>
              <input id="mp-sell" type="number" step="0.01" min="0" inputMode="decimal" {...register('sellPrice')} className={`${inputCls} tabular-nums`} placeholder="0.00" />
              <FieldError message={errors.sellPrice?.message} />
            </div>
            <div>
              <label className={labelCls} htmlFor="mp-cost">Cost price (₹)</label>
              <input id="mp-cost" type="number" step="0.01" min="0" inputMode="decimal" {...register('costPrice')} className={`${inputCls} tabular-nums`} placeholder="Optional, internal" />
              <FieldError message={errors.costPrice?.message} />
            </div>
          </div>
          <p className="-mt-1 text-[11px] text-gray-400">
            One flat price per unit at any quantity — no price tiers. Include branding in it.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls} htmlFor="mp-hsn">HSN code *</label>
              <input id="mp-hsn" list="mp-hsn-list" inputMode="numeric" {...register('hsnCode')} className={`${inputCls} tabular-nums`} placeholder="e.g. 7418" />
              <datalist id="mp-hsn-list">
                {hsnOptions.map((h) => (
                  <option key={h.code} value={h.code}>
                    {h.description} · {h.gstRate}%
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelCls} htmlFor="mp-gst">GST rate</label>
              {knownHsn ? (
                <div
                  id="mp-gst"
                  className={`${inputCls} cursor-not-allowed bg-gray-50 tabular-nums text-gray-700`}
                  title="Set by the HSN code"
                >
                  {knownHsn.gstRate}% <span className="text-[11px] text-gray-400">· auto</span>
                </div>
              ) : (
                <select id="mp-gst" {...register('gstRate')} className={inputCls}>
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={labelCls} htmlFor="mp-weight">Weight (g)</label>
              <input id="mp-weight" type="number" min="0" inputMode="numeric" {...register('weightG')} className={`${inputCls} tabular-nums`} placeholder="Optional" />
            </div>
          </div>
          <FieldError message={errors.hsnCode?.message} />
          {!errors.hsnCode && /^\d{4,8}$/.test(hsnCode?.trim() ?? '') && (
            <p className="-mt-1 text-[11px] text-gray-400">
              {knownHsn
                ? `${knownHsn.description} — GST is taken from this HSN code.`
                : 'New HSN code — choose its GST rate once and it will be remembered.'}
            </p>
          )}

          <div>
            <label className={labelCls} htmlFor="mp-features">Key features</label>
            <textarea id="mp-features" rows={3} {...register('keyFeatures')} className={inputCls} placeholder={'One per line — shown on the product page of the deck\nPure copper, leak-proof lid\n1 litre capacity'} />
            <FieldError message={errors.keyFeatures?.message} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={close} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || uploading || loadingDetails} className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editId ? 'Save changes' : 'Add to pack'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
