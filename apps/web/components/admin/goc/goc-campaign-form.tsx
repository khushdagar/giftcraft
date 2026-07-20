'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableMultiSelect } from '@/components/admin/products/searchable-multi-select';

type CampaignStatus = 'draft' | 'active' | 'paused' | 'expired';

interface GocCampaignFormProps {
  mode?: 'create' | 'edit';
  campaign?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    heroImage: string | null;
    status: CampaignStatus;
    claimLimit: number | null;
    expiresAt: string | null; // ISO string
    productIds: string[];
  };
}

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time.
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function GocCampaignForm({ mode = 'create', campaign }: GocCampaignFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [productOptions, setProductOptions] = useState<{ id: string; label: string }[]>([]);

  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    slug: campaign?.slug || '',
    description: campaign?.description || '',
    heroImage: campaign?.heroImage || '',
    status: (campaign?.status || 'draft') as CampaignStatus,
    claimLimit: campaign?.claimLimit != null ? String(campaign.claimLimit) : '',
    expiresAt: toLocalInput(campaign?.expiresAt || null),
    productIds: campaign?.productIds || ([] as string[]),
  });

  // Load the product catalogue for the gift-option picker.
  useEffect(() => {
    let active = true;
    fetch('/api/products?limit=1000')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.products) return;
        setProductOptions(
          data.products.map((p: any) => ({ id: p.id, label: p.name }))
        );
      })
      .catch(() => {/* picker just stays empty */});
    return () => {
      active = false;
    };
  }, []);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: mode === 'create' ? generateSlug(name) : prev.slug,
    }));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'goc-campaigns');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setFormData((prev) => ({ ...prev, heroImage: data.url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Campaign name is required');
    if (mode === 'create' && !formData.slug.trim()) return toast.error('Slug is required');
    if (formData.productIds.length === 0)
      return toast.error('Select at least one gift option');

    const claimLimitNum = formData.claimLimit.trim()
      ? parseInt(formData.claimLimit, 10)
      : undefined;
    if (claimLimitNum !== undefined && (!Number.isFinite(claimLimitNum) || claimLimitNum < 1)) {
      return toast.error('Claim limit must be a positive number');
    }

    // Build a clean payload — omit optional fields rather than sending empty
    // strings the API's Zod schema would reject (heroImage must be a URL, etc.).
    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      productIds: formData.productIds,
    };
    if (mode === 'create') payload.slug = formData.slug.trim();
    if (formData.heroImage) payload.heroImage = formData.heroImage;
    if (claimLimitNum !== undefined) payload.claimLimit = claimLimitNum;
    if (formData.expiresAt) payload.expiresAt = new Date(formData.expiresAt).toISOString();

    setLoading(true);
    try {
      const url = mode === 'create' ? '/api/admin/goc' : `/api/admin/goc/${campaign?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${mode} campaign`);
      toast.success(`Campaign ${mode === 'create' ? 'created' : 'updated'}!`);
      const id = mode === 'create' ? data.data?.id : campaign?.id;
      router.push(`/admin/goc/${id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${mode} campaign`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this campaign? All its gift options and claims will be removed.'))
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/goc/${campaign?.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete campaign');
      }
      toast.success('Campaign deleted');
      router.push('/admin/goc');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete campaign');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-6">
        <h2 className="text-lg font-normal text-ink">Basic Information</h2>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Campaign Name *</label>
          <Input
            type="text"
            required
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g., Diwali Employee Gifts 2026"
            className="rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Slug</label>
          <Input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="e.g., diwali-2026"
            className="rounded-lg"
            disabled={mode === 'edit'}
          />
          <p className="text-xs text-ink-2 mt-1">
            {mode === 'edit'
              ? 'Slug cannot be changed after creation (claim links depend on it).'
              : 'Used in the public claim link: /claim/your-slug'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Shown to recipients on the claim page."
            rows={2}
            className="rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">
            Hero Image <span className="text-ink-3">(optional)</span>
          </label>
          <div className="flex items-center gap-4">
            <div className="w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-bdr flex items-center justify-center bg-canvas">
              {formData.heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={formData.heroImage} alt="Hero" className="w-full h-full object-cover" />
              ) : (
                <span className="text-ink-3 text-xs">No image</span>
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 px-4 py-2 border-2 border-bdr rounded-lg text-sm font-normal text-ink cursor-pointer hover:border-slate-300">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading…' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {formData.heroImage && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, heroImage: '' })}
                  className="block text-xs text-red-600 hover:underline"
                >
                  Remove image
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gift Options */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-4">
        <div>
          <h2 className="text-lg font-normal text-ink">Gift Options *</h2>
          <p className="text-sm text-ink-2 mt-0.5">
            The products recipients can choose from. Pick at least one.
          </p>
        </div>
        <SearchableMultiSelect
          label="Products"
          options={productOptions}
          selected={formData.productIds}
          onChange={(next) => setFormData({ ...formData, productIds: next })}
          placeholder="Search & add gift products…"
          emptyText="No products found"
        />
        <p className="text-xs text-ink-2">
          {formData.productIds.length} option{formData.productIds.length === 1 ? '' : 's'} selected
        </p>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-6">
        <h2 className="text-lg font-normal text-ink">Settings</h2>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as CampaignStatus })
            }
            className="w-full rounded-lg border border-bdr px-3 py-2 text-sm text-ink focus:outline-none focus:border-em"
          >
            <option value="draft">Draft — not claimable yet</option>
            <option value="active">Active — claim link is live</option>
            <option value="paused">Paused — temporarily closed</option>
            <option value="expired">Expired — closed</option>
          </select>
          <p className="text-xs text-ink-2 mt-1">
            Only <strong>Active</strong> campaigns can be claimed by recipients.
          </p>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">
            Claim Limit <span className="text-ink-3">(optional)</span>
          </label>
          <Input
            type="number"
            min={1}
            value={formData.claimLimit}
            onChange={(e) => setFormData({ ...formData, claimLimit: e.target.value })}
            placeholder="Leave empty for unlimited"
            className="rounded-lg"
          />
          <p className="text-xs text-ink-2 mt-1">Maximum number of recipients who can claim.</p>
        </div>

        <div>
          <label className="block text-sm font-normal text-ink mb-2">
            Expires At <span className="text-ink-3">(optional)</span>
          </label>
          <Input
            type="datetime-local"
            value={formData.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            className="rounded-lg"
          />
          <p className="text-xs text-ink-2 mt-1">After this time, the claim link stops working.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t border-bdr">
        <button
          type="submit"
          disabled={loading || deleting || !formData.name}
          className="px-6 py-3 bg-em hover:bg-em-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-normal rounded-lg transition-colors"
        >
          {loading ? 'Saving…' : mode === 'create' ? 'Create Campaign' : 'Update Campaign'}
        </button>

        <button
          type="button"
          onClick={() => router.push(mode === 'edit' ? `/admin/goc/${campaign?.id}` : '/admin/goc')}
          disabled={loading || deleting}
          className="px-6 py-3 border-2 border-bdr hover:border-slate-300 text-ink font-normal rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || loading}
            className="px-6 py-3 ml-auto bg-red-50 hover:bg-red-100 text-red-600 font-normal rounded-lg transition-colors border-2 border-red-200 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete Campaign'}
          </button>
        )}
      </div>
    </form>
  );
}
