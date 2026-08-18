'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { compressAndUpload } from '@/hooks/use-compressed-upload';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { X, Upload, ArrowLeft } from 'lucide-react';

interface EntryState {
  slug: 'budget' | 'occasions';
  name: string;
  href: string;
  gradient: string;
  image: string;
  description: string;
}

export function CuratedPacksSettings({ initial }: { initial: EntryState[] }) {
  const router = useRouter();
  const [entries, setEntries] = useState<EntryState[]>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const patch = (slug: string, next: Partial<EntryState>) =>
    setEntries((prev) => prev.map((e) => (e.slug === slug ? { ...e, ...next } : e)));

  const handleUpload = async (slug: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(slug);
    try {
      const data = await compressAndUpload(file, { folder: 'curated-packs' });
      patch(slug, { image: data.url });
      toast.success('Image uploaded — press Save to publish it');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = {};
      for (const e of entries) {
        data[`${e.slug}Image`] = e.image;
        data[`${e.slug}Description`] = e.description;
      }
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'curatedPacks', data }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      toast.success('Saved');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/admin/settings"
            className="mb-2 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Settings
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Curated Packs entries</h1>
          <p className="mt-1 text-sm text-ink-2">
            The two cards on the homepage and at the top of /curated-packs.
          </p>
        </div>
        <Button variant="em" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <div className="space-y-6">
        {entries.map((entry) => (
          <div key={entry.slug} className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-ink">{entry.name}</h2>
              {/* The name and URL are fixed — the navbar and the routes are
                  built on them — so only the artwork and blurb are editable. */}
              <span className="text-xs text-ink-3">{entry.href}</span>
            </div>

            <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
              <div>
                {entry.image ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-bdr bg-gray-50">
                    <Image src={entry.image} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => patch(entry.slug, { image: '' })}
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-ink-2 shadow transition hover:text-rose-600"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-bdr transition hover:bg-gray-50"
                    style={{ background: entry.gradient, borderColor: 'transparent' }}
                  >
                    <Upload className="mb-1.5 h-6 w-6 text-white" />
                    <p className="text-sm font-medium text-white">
                      {uploading === entry.slug ? 'Uploading…' : 'Add image'}
                    </p>
                    <p className="text-xs text-white/80">PNG, JPG up to 5MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUpload(entry.slug, e)}
                      disabled={uploading === entry.slug}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="mt-2 text-xs text-ink-3">
                  Without an image the card keeps the colour shown here.
                </p>
              </div>

              <div>
                <label
                  htmlFor={`${entry.slug}-desc`}
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Description
                </label>
                <textarea
                  id={`${entry.slug}-desc`}
                  rows={4}
                  value={entry.description}
                  onChange={(e) => patch(entry.slug, { description: e.target.value })}
                  className="w-full rounded-lg border border-bdr px-3 py-2 text-sm text-ink focus:border-em focus:outline-none"
                />
                <p className="mt-1 text-xs text-ink-3">
                  Shown under the heading on the card. Leave blank to restore the default.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
