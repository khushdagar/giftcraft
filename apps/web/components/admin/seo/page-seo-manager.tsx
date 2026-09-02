'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';

export interface PageSeoRow {
  id: string;
  path: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  noIndex: boolean | null;
  noFollow: boolean | null;
  updatedAt: string;
}

interface FormState {
  path: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  noIndex: '' | 'true' | 'false';
  noFollow: '' | 'true' | 'false';
}

const EMPTY: FormState = {
  path: '',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  ogTitle: '',
  ogDescription: '',
  ogImageUrl: '',
  noIndex: '',
  noFollow: '',
};

const tri = (value: boolean | null): '' | 'true' | 'false' =>
  value === null ? '' : value ? 'true' : 'false';

/** Every fixed page of the site, for the picker. Dynamic pages use "Custom". */
const KNOWN_PAGES: { group: string; pages: { path: string; label: string }[] }[] = [
  {
    group: 'Main pages',
    pages: [
      { path: '/', label: 'Home' },
      { path: '/catalog', label: 'Catalog (all products)' },
      { path: '/categories', label: 'Categories' },
      { path: '/occasions', label: 'Occasions' },
      { path: '/curated-packs', label: 'Curated Packs' },
      { path: '/curated-packs/budget', label: 'Curated Packs — by Budget' },
      { path: '/curated-packs/occasions', label: 'Curated Packs — by Occasion' },
      { path: '/blog', label: 'Blog' },
      { path: '/pricing', label: 'Pricing' },
    ],
  },
  {
    group: 'Info pages',
    pages: [
      { path: '/contact', label: 'Contact' },
      { path: '/faq', label: 'FAQ' },
      { path: '/gst', label: 'GST' },
      { path: '/privacy', label: 'Privacy Policy' },
      { path: '/terms', label: 'Terms' },
      { path: '/returns', label: 'Returns' },
      { path: '/shipping', label: 'Shipping' },
      { path: '/sell-with-us', label: 'Sell With Us' },
    ],
  },
  {
    group: 'Tools',
    pages: [
      { path: '/builder', label: 'Gift Builder' },
      { path: '/box', label: 'Box' },
      { path: '/planner', label: 'Budget Planner' },
      { path: '/compare', label: 'Compare' },
      { path: '/wishlist', label: 'Wishlist' },
    ],
  },
];

const KNOWN_PATHS = KNOWN_PAGES.flatMap((g) => g.pages.map((p) => p.path));

const robotsLabel = (row: PageSeoRow): string | null => {
  const parts: string[] = [];
  if (row.noIndex !== null) parts.push(row.noIndex ? 'noindex' : 'index');
  if (row.noFollow !== null) parts.push(row.noFollow ? 'nofollow' : 'follow');
  return parts.length ? parts.join(', ') : null;
};

export function PageSeoManager({ entries }: { entries: PageSeoRow[] }) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [customPath, setCustomPath] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (r) =>
        r.path.includes(q) ||
        (r.metaTitle ?? '').toLowerCase().includes(q) ||
        (r.metaDescription ?? '').toLowerCase().includes(q)
    );
  }, [entries, query]);

  const startEdit = (row: PageSeoRow) => {
    setEditingId(row.id);
    setCustomPath(!KNOWN_PATHS.includes(row.path));
    setForm({
      path: row.path,
      metaTitle: row.metaTitle ?? '',
      metaDescription: row.metaDescription ?? '',
      canonicalUrl: row.canonicalUrl ?? '',
      ogTitle: row.ogTitle ?? '',
      ogDescription: row.ogDescription ?? '',
      ogImageUrl: row.ogImageUrl ?? '',
      noIndex: tri(row.noIndex),
      noFollow: tri(row.noFollow),
    });
    setError(null);
    setOk(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const reset = () => {
    setEditingId(null);
    setForm(EMPTY);
    setCustomPath(false);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const body = {
        path: form.path,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        canonicalUrl: form.canonicalUrl,
        ogTitle: form.ogTitle,
        ogDescription: form.ogDescription,
        ogImageUrl: form.ogImageUrl,
        noIndex: form.noIndex === '' ? null : form.noIndex === 'true',
        noFollow: form.noFollow === '' ? null : form.noFollow === 'true',
      };
      const res = await fetch(
        editingId ? `/api/admin/page-seo/${editingId}` : '/api/admin/page-seo',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save the SEO entry');
      setOk(`SEO for ${data.pageSeo.path} is live — the page has been refreshed.`);
      reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the SEO entry');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row: PageSeoRow) => {
    if (!confirm(`Remove the SEO override for ${row.path}? The page goes back to its built-in tags.`)) {
      return;
    }
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/page-seo/${row.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not delete the entry');
      }
      if (editingId === row.id) reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the entry');
    } finally {
      setBusyId(null);
    }
  };

  const uploadOgImage = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'seo');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Image upload failed');
      set({ ogImageUrl: data.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const input =
    'w-full rounded-md border-2 border-bdr px-3 py-2 text-sm text-ink outline-none focus:border-em';
  const label = 'mb-1 block text-xs font-medium text-ink-2';

  const counter = (value: string, ideal: number) => (
    <span className={`text-xs ${value.length > ideal ? 'text-amber-600' : 'text-ink-3'}`}>
      {value.length}/{ideal}
    </span>
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-normal text-ink">SEO Meta Tags</h1>
        <p className="mt-1 text-sm text-ink-2">
          Override the meta tags of any public page — title, description, canonical, Open Graph and
          robots. Changes go live within a minute, no deploy needed. Fields left empty keep the
          page&apos;s built-in value.
        </p>
      </div>

      {/* ── Add / edit ── */}
      <div ref={formRef} className="rounded-md border-2 border-bdr bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-ink">
            {editingId ? `Editing ${form.path}` : 'Add a page'}
          </h2>
          {editingId && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-md border-2 border-bdr px-3 py-1.5 text-xs text-ink hover:bg-gray-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel edit
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={label}>Page</label>
            <select
              className={input}
              value={customPath ? 'custom' : form.path}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setCustomPath(true);
                  set({ path: '' });
                } else {
                  setCustomPath(false);
                  set({ path: e.target.value });
                }
              }}
            >
              <option value="">Choose a page…</option>
              {KNOWN_PAGES.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.pages.map((p) => (
                    <option key={p.path} value={p.path}>
                      {p.label} — {p.path}
                    </option>
                  ))}
                </optgroup>
              ))}
              <optgroup label="Anything else">
                <option value="custom">Custom / dynamic page (product, blog post, category…)</option>
              </optgroup>
            </select>
            {customPath && (
              <>
                <input
                  className={`${input} mt-2`}
                  placeholder="/products/steel-bottle — or paste the full https://… URL"
                  value={form.path}
                  onChange={(e) => set({ path: e.target.value })}
                  autoFocus
                />
                <p className="mt-1 text-xs text-ink-3">
                  A product is <code>/products/its-slug</code>, a blog post is{' '}
                  <code>/blog/its-slug</code>, a category is <code>/category/its-slug</code>, and
                  so on. Only the path is kept from a pasted URL.
                </p>
              </>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className={label}>Meta title</label>
              {counter(form.metaTitle, 60)}
            </div>
            <input
              className={input}
              placeholder="Used exactly as entered — include the brand yourself if wanted"
              value={form.metaTitle}
              onChange={(e) => set({ metaTitle: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Canonical URL</label>
            <input
              className={input}
              placeholder="https://givoo.in/…  (only when it should differ)"
              value={form.canonicalUrl}
              onChange={(e) => set({ canonicalUrl: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <label className={label}>Meta description</label>
              {counter(form.metaDescription, 160)}
            </div>
            <textarea
              className={input}
              rows={2}
              value={form.metaDescription}
              onChange={(e) => set({ metaDescription: e.target.value })}
            />
          </div>

          <div>
            <label className={label}>og:title (social share title)</label>
            <input
              className={input}
              placeholder="Defaults to the meta title"
              value={form.ogTitle}
              onChange={(e) => set({ ogTitle: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>og:description</label>
            <input
              className={input}
              placeholder="Defaults to the meta description"
              value={form.ogDescription}
              onChange={(e) => set({ ogDescription: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className={label}>og:image (1200 × 630 works best)</label>
            <div className="flex items-start gap-3">
              <input
                className={input}
                placeholder="https://… — or upload"
                value={form.ogImageUrl}
                onChange={(e) => set({ ogImageUrl: e.target.value })}
              />
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadOgImage(f);
                }}
              />
              <button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="inline-flex shrink-0 items-center gap-2 rounded-md border-2 border-bdr px-4 py-2 text-sm font-medium text-ink transition hover:bg-gray-50"
              >
                <ImagePlus className="h-4 w-4" />
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
            {form.ogImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.ogImageUrl}
                alt="og:image preview"
                className="mt-2 h-20 rounded-md border border-bdr bg-gray-50 object-cover"
              />
            )}
          </div>

          <div>
            <label className={label}>Robots — indexing</label>
            <select
              className={input}
              value={form.noIndex}
              onChange={(e) => set({ noIndex: e.target.value as FormState['noIndex'] })}
            >
              <option value="">Page default</option>
              <option value="false">index — show in Google</option>
              <option value="true">noindex — keep out of Google</option>
            </select>
          </div>
          <div>
            <label className={label}>Robots — links</label>
            <select
              className={input}
              value={form.noFollow}
              onChange={(e) => set({ noFollow: e.target.value as FormState['noFollow'] })}
            >
              <option value="">Page default</option>
              <option value="false">follow links</option>
              <option value="true">nofollow links</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md border-2 border-red-200 bg-red-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {ok && (
          <div className="mt-3 flex items-start gap-2 rounded-md border-2 border-em bg-em-50 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-em" />
            <p className="text-sm text-ink">{ok}</p>
          </div>
        )}

        <Button
          onClick={save}
          disabled={saving || uploading || !form.path.trim()}
          className="mt-4 rounded-md bg-em px-5 py-2.5 text-sm font-medium text-white hover:bg-em-600"
        >
          {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add SEO entry'}
        </Button>
      </div>

      {/* ── Existing entries ── */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium text-ink">
            Pages with overrides <span className="text-ink-3">({entries.length})</span>
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              className="w-64 rounded-md border-2 border-bdr py-2 pl-9 pr-3 text-sm outline-none focus:border-em"
              placeholder="Search paths or titles…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-6 text-sm text-ink-2">
            {entries.length === 0
              ? 'No overrides yet. Every page currently uses its built-in tags — add a page above to change one.'
              : 'No entry matches that search.'}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-bdr">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 text-xs font-normal text-ink-2">Page</th>
                  <th className="px-3 py-2 text-xs font-normal text-ink-2">Meta title</th>
                  <th className="px-3 py-2 text-xs font-normal text-ink-2">Robots</th>
                  <th className="px-3 py-2 text-xs font-normal text-ink-2">Updated</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-bdr">
                {filtered.map((row) => (
                  <tr key={row.id} className={editingId === row.id ? 'bg-gray-50' : ''}>
                    <td className="px-3 py-2 break-all font-medium text-ink">{row.path}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-ink-2" title={row.metaTitle ?? ''}>
                      {row.metaTitle || <span className="text-ink-3">— unchanged</span>}
                    </td>
                    <td className="px-3 py-2">
                      {robotsLabel(row) ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.noIndex ? 'bg-amber-50 text-amber-700' : 'bg-em-50 text-em'
                          }`}
                        >
                          {robotsLabel(row)}
                        </span>
                      ) : (
                        <span className="text-ink-3">default</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-ink-3">
                      {new Date(row.updatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button
                        onClick={() => startEdit(row)}
                        title="Edit"
                        className="mr-1 rounded-md p-1.5 text-ink-2 hover:bg-gray-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteRow(row)}
                        disabled={busyId === row.id}
                        title="Delete"
                        className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <details className="mt-4 text-sm text-ink-2">
          <summary className="cursor-pointer font-medium text-ink">
            How overrides work — worth reading once
          </summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              Only the fields you fill in change. An entry with just a meta description keeps the
              page&apos;s own title, canonical and everything else.
            </li>
            <li>
              The meta title is used <strong>exactly as entered</strong> — the automatic
              &ldquo;· GIVOO&rdquo; suffix is not added, so include the brand yourself if you want
              it.
            </li>
            <li>
              og:title and og:description fall back to your meta title/description, so usually only
              those two need filling.
            </li>
            <li>
              &ldquo;Page default&rdquo; for robots keeps the page&apos;s own behaviour (some pages
              already noindex themselves when empty). Only pick index/noindex to force it.
            </li>
            <li>Deleting an entry puts the page straight back on its built-in tags.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
