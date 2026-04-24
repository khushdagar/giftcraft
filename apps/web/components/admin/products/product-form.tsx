'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Tabs from '@radix-ui/react-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { formatRupees } from '@/lib/utils';

const ProductSchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().min(1, 'SKU required'),
  descriptionShort: z.string().optional(),
  descriptionLong: z.string().optional(),
  material: z.string().optional(),
  dimensions: z.string().optional(),
  weightG: z.number().optional(),
  leadTimeDays: z.number().min(1).optional(),
  hsnCode: z.string().optional(),
  printingTechnique: z.string().optional(),
  printingPosition: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived', 'seasonal']).default('draft'),
  isFeatured: z.boolean().default(false),
  isEcoCertified: z.boolean().default(false),
  categoryIds: z.array(z.string()).optional(),
  occasionIds: z.array(z.string()).optional(),
  priceTiers: z.array(
    z.object({
      tier: z.number(),
      minQty: z.number(),
      maxQty: z.number().nullable(),
      costPrice: z.number(),
      sellPrice: z.number(),
    })
  ).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type ProductFormData = z.infer<typeof ProductSchema>;

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
  const [tab, setTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceReason, setPriceReason] = useState('');

  const form = useForm<ProductFormData>({
    resolver: zodResolver(ProductSchema),
    defaultValues: initialData || {
      status: 'draft',
      isFeatured: false,
      isEcoCertified: false,
      priceTiers: [
        { tier: 1, minQty: 25, maxQty: 49, costPrice: 0, sellPrice: 0 },
        { tier: 2, minQty: 50, maxQty: 99, costPrice: 0, sellPrice: 0 },
        { tier: 3, minQty: 100, maxQty: 249, costPrice: 0, sellPrice: 0 },
        { tier: 4, minQty: 250, maxQty: 499, costPrice: 0, sellPrice: 0 },
        { tier: 5, minQty: 500, maxQty: 999, costPrice: 0, sellPrice: 0 },
        { tier: 6, minQty: 1000, maxQty: null, costPrice: 0, sellPrice: 0 },
      ],
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setError(null);

    try {
      const url = mode === 'create' ? '/api/admin/products' : `/api/admin/products/${initialData?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const payload: any = { ...data };
      if (mode === 'edit' && priceReason) {
        payload.priceReason = priceReason;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save product');
      }

      const product = await res.json();
      router.push('/admin/products');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <Tabs.Root value={tab} onValueChange={setTab} className="space-y-4">
        {/* Tab list */}
        <Tabs.List className="flex gap-1 border-b border-gray-200 overflow-x-auto no-scrollbar">
          {[
            { id: 'basic', label: 'Basic' },
            { id: 'tax', label: 'Tax/HSN' },
            { id: 'images', label: 'Images' },
            { id: 'printing', label: 'Printing' },
            { id: 'pricing', label: 'Pricing' },
            { id: 'vendor', label: 'Vendor' },
            { id: 'visibility', label: 'Visibility' },
            { id: 'analytics', label: 'Analytics' },
          ].map((t) => (
            <Tabs.Trigger
              key={t.id}
              value={t.id}
              className={`shrink-0 rounded-md-p px-4 py-2 text-xs font-semibold transition ${
                tab === t.id
                  ? 'bg-dark text-inv'
                  : 'text-ink-3 hover:text-ink border-b-2 border-transparent'
              }`}
            >
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Tab contents */}
        <div className="space-y-4">
          {/* Basic */}
          <Tabs.Content value="basic" className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Product Name *</label>
              <Input {...form.register('name')} placeholder="e.g. Stainless Steel Flask 500ml" />
              {form.formState.errors.name && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Slug</label>
                <Input {...form.register('slug')} placeholder="auto-generated from name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">SKU *</label>
                <Input {...form.register('sku')} placeholder="e.g. FLASK-500-SS" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Brand</label>
                <Input {...form.register('brand')} placeholder="e.g. Borosil" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Material</label>
                <Input {...form.register('material')} placeholder="e.g. Stainless Steel 304" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Short Description</label>
              <textarea
                {...form.register('descriptionShort')}
                placeholder="Brief product description"
                rows={2}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Long Description</label>
              <textarea
                {...form.register('descriptionLong')}
                placeholder="Detailed product description"
                rows={4}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Weight (g)</label>
                <Input type="number" {...form.register('weightG', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Lead Time (days)</label>
                <Input type="number" {...form.register('leadTimeDays', { valueAsNumber: true })} />
              </div>
            </div>
          </Tabs.Content>

          {/* Tax/HSN */}
          <Tabs.Content value="tax" className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Select the HSN code for this product. GST rate will be auto-filled based on the HSN category.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">HSN Code</label>
              <Input {...form.register('hsnCode')} placeholder="e.g. 9617" />
              <p className="text-xs text-gray-500 mt-1">4-digit HSN code for tax classification</p>
            </div>
          </Tabs.Content>

          {/* Images */}
          <Tabs.Content value="images" className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Upload product images. First image will be set as primary. Drag to reorder.
              </p>
            </div>
            <p className="text-sm text-gray-600">Image upload coming soon</p>
          </Tabs.Content>

          {/* Printing */}
          <Tabs.Content value="printing" className="space-y-4">
            <div className="bg-gold-50 border border-gold rounded-lg p-4">
              <p className="text-sm text-gold-700 font-semibold">
                💡 Printing cost is included in the sellPrice — no separate "Branding Cost" line is shown to customers.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Printing Technique</label>
              <select
                {...form.register('printingTechnique')}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              >
                <option value="">None</option>
                <option value="screen_print">Screen Print</option>
                <option value="digital_print">Digital Print</option>
                <option value="embroidery">Embroidery</option>
                <option value="uv_print">UV Print</option>
                <option value="laser_engrave">Laser Engraving</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Printing Position</label>
              <Input {...form.register('printingPosition')} placeholder="e.g. Front Center, Back, Sleeve" />
            </div>
          </Tabs.Content>

          {/* Pricing */}
          <Tabs.Content value="pricing" className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-semibold">Tier</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold">Min Qty</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold">Max Qty</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold">Cost Price</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold">Sell Price</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {form.watch('priceTiers')?.map((tier, idx) => {
                    const cost = form.watch(`priceTiers.${idx}.costPrice`);
                    const sell = form.watch(`priceTiers.${idx}.sellPrice`);
                    const margin = sell && cost ? ((sell - cost) / sell * 100).toFixed(1) : '0';
                    const marginColor = parseFloat(margin) >= 30 ? 'text-green-600' : parseFloat(margin) >= 20 ? 'text-yellow-600' : 'text-red-600';

                    return (
                      <tr key={tier.tier} className="hover:bg-gray-50">
                        <td className="px-2 py-2 font-semibold">{tier.tier}</td>
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
                        <td className={`px-2 py-2 font-semibold text-xs ${marginColor}`}>{margin}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Change Reason *</label>
                <Input
                  value={priceReason}
                  onChange={(e) => setPriceReason(e.target.value)}
                  placeholder="e.g. Supplier cost increase, Promotional pricing"
                />
                <p className="text-xs text-gray-500 mt-1">Required to create price audit log</p>
              </div>
            )}
          </Tabs.Content>

          {/* Vendor */}
          <Tabs.Content value="vendor" className="space-y-4">
            <p className="text-sm text-gray-600">Vendor selection coming soon</p>
          </Tabs.Content>

          {/* Visibility */}
          <Tabs.Content value="visibility" className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
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

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...form.register('isFeatured')} className="rounded" />
                <span className="text-sm font-semibold text-gray-900">Featured Product</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...form.register('isEcoCertified')} className="rounded" />
                <span className="text-sm font-semibold text-gray-900">Eco-Certified</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Meta Title</label>
              <Input {...form.register('metaTitle')} placeholder="SEO page title" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Meta Description</label>
              <textarea
                {...form.register('metaDescription')}
                placeholder="SEO description"
                rows={2}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              />
            </div>
          </Tabs.Content>

          {/* Analytics */}
          <Tabs.Content value="analytics" className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600">📊 Analytics coming in Phase 2</p>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>

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
