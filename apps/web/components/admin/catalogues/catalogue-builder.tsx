'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  FileDown,
  ImageIcon,
  LibraryBig,
  Loader2,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { MediaLibraryModal } from '@/components/admin/media-library-modal';
import { compressAndUpload } from '@/hooks/use-compressed-upload';
import { formatRupees } from '@/lib/utils';
import {
  CATALOGUE_THEMES,
  PRICE_MODE_OPTIONS,
  THEME_KEYS,
  type CatalogueThemeKey,
  type PriceModeKey,
} from '@/lib/catalogue';

/**
 * Catalogue builder — create/edit screen for /admin/catalogues.
 *
 * Left: details + an ordered list of sections. A section is either
 *   • From category — products are pulled live from a Category when the PDF
 *     renders (never goes stale), optionally capped; or
 *   • Hand-picked — searched and added one by one, each with an optional badge.
 * Right: look & pricing, and a live page estimate from the same resolver the
 * PDF uses. One layout only (the approved one) — nothing to configure there.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface EditorItem {
  productId: string;
  badge: string | null;
  name: string;
  sku: string;
  imageUrl: string | null;
}

export interface EditorSection {
  title: string;
  mode: 'category' | 'manual';
  categoryId: string | null;
  includeChildren: boolean;
  maxProducts: number | null;
  items: EditorItem[];
}

export interface EditorCatalogue {
  id: string;
  title: string;
  slug: string;
  closingNote: string | null;
  coverImageUrl: string | null;
  /** Photo behind the closing "Thank you" page; null = homepage hero banner. */
  closingImageUrl: string | null;
  theme: CatalogueThemeKey;
  priceMode: PriceModeKey;
  showSku: boolean;
  showMoq: boolean;
  sections: EditorSection[];
}

interface SectionDraft extends Omit<EditorSection, 'items'> {
  key: string;
  items: (EditorItem & { badge: string })[];
}

interface CategoryOption {
  id: string;
  name: string;
  parentId: string | null;
}

interface PickerProduct {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  fromPrice: number | null;
}

interface PreviewSection {
  title: string;
  count: number;
  pages: number;
  products: { id: string; name: string; imageUrl: string | null; price: string | null }[];
}

interface Preview {
  sections: PreviewSection[];
  totalProducts: number;
  totalPages: number;
}

/** Which image slot an upload / library pick is for. */
type ImageTarget = 'cover' | 'closing';

// ── Helpers ────────────────────────────────────────────────────────────────

let seq = 0;
const nextKey = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;

const inputCls =
  'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500';
const cardCls = 'rounded-lg border border-gray-200 bg-white p-5';
const smallBtn =
  'inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50';
const iconBtn =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40';

function newSection(mode: SectionDraft['mode']): SectionDraft {
  return {
    key: nextKey(),
    title: '',
    mode,
    categoryId: null,
    includeChildren: true,
    maxProducts: null,
    items: [],
  };
}

function fromEditor(initial: EditorCatalogue | null) {
  return {
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    closingNote: initial?.closingNote ?? '',
    coverImageUrl: initial?.coverImageUrl ?? '',
    closingImageUrl: initial?.closingImageUrl ?? '',
    theme: initial?.theme ?? ('warm' as CatalogueThemeKey),
    priceMode: initial?.priceMode ?? ('starting' as PriceModeKey),
    showSku: initial?.showSku ?? false,
    showMoq: initial?.showMoq ?? true,
  };
}

function toSectionPayload(s: SectionDraft) {
  return {
    title: s.title,
    mode: s.mode,
    categoryId: s.mode === 'category' ? s.categoryId : null,
    includeChildren: s.includeChildren,
    maxProducts: s.mode === 'category' ? s.maxProducts : null,
    items:
      s.mode === 'manual'
        ? s.items.map((it) => ({ productId: it.productId, badge: it.badge || null }))
        : [],
  };
}

function toPickerProduct(p: any): PickerProduct {
  const prices = (p.priceTiers ?? [])
    .map((t: any) => Number(t.sellPrice))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  return {
    id: p.id,
    name: p.name,
    sku: p.sku ?? '',
    imageUrl: p.images?.[0]?.url ?? null,
    fromPrice: prices.length ? Math.min(...prices) : null,
  };
}

function Thumb({ url, size = 'h-9 w-9' }: { url: string | null; size?: string }) {
  return (
    <span
      className={`${size} shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-gray-300">
          <ImageIcon className="h-4 w-4" />
        </span>
      )}
    </span>
  );
}

/**
 * Image field: thumbnail, URL input, Upload (compressed in the browser, sent to
 * Spaces) and Media library, plus a clear button.
 */
function ImageField({
  value,
  placeholder,
  hint,
  thumbClass = 'h-14 w-20',
  uploading,
  onChange,
  onUpload,
  onLibrary,
  clearLabel = 'Remove',
}: {
  value: string;
  placeholder: string;
  hint?: string;
  thumbClass?: string;
  uploading: boolean;
  onChange: (url: string) => void;
  onUpload: (file: File) => void;
  onLibrary: () => void;
  clearLabel?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-start gap-3">
      <span
        className={`${thumbClass} shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-gray-300">
            <ImageIcon className="h-5 w-5" />
          </span>
        )}
      </span>
      <div className="flex-1 space-y-2">
        <input
          className={inputCls}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className={smallBtn}
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <button type="button" className={smallBtn} onClick={onLibrary}>
            <LibraryBig className="h-3.5 w-3.5" /> Media library
          </button>
          {value && (
            <button type="button" className={smallBtn} onClick={() => onChange('')}>
              <X className="h-3.5 w-3.5" /> {clearLabel}
            </button>
          )}
        </div>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function CatalogueBuilder({ initial }: { initial: EditorCatalogue | null }) {
  const router = useRouter();
  const [form, setForm] = useState(() => fromEditor(initial));
  const [sections, setSections] = useState<SectionDraft[]>(() =>
    (initial?.sections ?? []).map((s) => ({
      ...s,
      key: nextKey(),
      items: s.items.map((it) => ({ ...it, badge: it.badge ?? '' })),
    }))
  );
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [libraryFor, setLibraryFor] = useState<ImageTarget | null>(null);
  const [uploadingFor, setUploadingFor] = useState<ImageTarget | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  // Known once the catalogue exists (a new one gets it from POST).
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);
  // Snapshot of the last SAVED state — the PDF only ever renders what is
  // saved, so Download compares against this and saves first if needed.
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const currentKey = JSON.stringify({ form, sections: sections.map(toSectionPayload) });
  const dirty = savedKey !== currentKey;
  useEffect(() => {
    // An existing catalogue starts out clean; a new one is dirty until created.
    if (initial) setSavedKey(currentKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Categories for the "From category" picker (parents, then their children).
  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((d) =>
        setCategories(
          (d.categories ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
            parentId: c.parentId ?? null,
          }))
        )
      )
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  // Live page estimate — same resolver as the PDF, debounced.
  const previewKey = JSON.stringify({
    priceMode: form.priceMode,
    sections: sections.map(toSectionPayload),
  });
  useEffect(() => {
    if (sections.length === 0) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewing(true);
    const timer = setTimeout(() => {
      fetch('/api/admin/catalogues/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: previewKey,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d) setPreview(d);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setPreviewing(false);
        });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [previewKey, sections.length]);

  const previewFor = (index: number): PreviewSection | null => preview?.sections[index] ?? null;

  // ── Section ops ──
  const updateSection = (key: string, patch: Partial<SectionDraft>) =>
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const addSection = (mode: SectionDraft['mode']) =>
    setSections((prev) => [...prev, newSection(mode)]);

  const removeSection = (key: string) =>
    setSections((prev) => prev.filter((s) => s.key !== key));

  const moveSection = (key: string, dir: -1 | 1) =>
    setSections((prev) => {
      const i = prev.findIndex((s) => s.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  // ── Images ──
  const applyImage = (target: ImageTarget, url: string) =>
    set(target === 'cover' ? 'coverImageUrl' : 'closingImageUrl', url);

  const uploadImage = async (target: ImageTarget, file: File) => {
    setUploadingFor(target);
    try {
      const data = await compressAndUpload(file, { folder: 'catalogues' });
      applyImage(target, data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingFor(null);
    }
  };

  const isUploading = (target: ImageTarget) => uploadingFor === target;

  // ── Save / download ──
  /** Persists the form. Resolves to the catalogue id, or null on failure. */
  const save = async (): Promise<string | null> => {
    if (!form.title.trim()) {
      toast.error('Give the catalogue a title');
      return null;
    }
    if (sections.length === 0) {
      toast.error('Add at least one section');
      return null;
    }
    for (const [i, s] of sections.entries()) {
      if (!s.title.trim()) {
        toast.error(`Section ${i + 1} needs a title`);
        return null;
      }
      if (s.mode === 'category' && !s.categoryId) {
        toast.error(`Pick a category for "${s.title}"`);
        return null;
      }
      if (s.mode === 'manual' && s.items.length === 0) {
        toast.error(`Add products to "${s.title}"`);
        return null;
      }
    }

    const keyAtSave = currentKey;
    setSaving(true);
    try {
      const body = {
        ...form,
        slug: form.slug || null,
        closingNote: form.closingNote || null,
        coverImageUrl: form.coverImageUrl || null,
        closingImageUrl: form.closingImageUrl || null,
        sections: sections.map(toSectionPayload),
      };
      const res = await fetch(savedId ? `/api/admin/catalogues/${savedId}` : '/api/admin/catalogues', {
        method: savedId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      const id = data.catalogue.id as string;
      setSavedKey(keyAtSave);
      toast.success(savedId ? 'Catalogue saved' : 'Catalogue created');
      if (savedId) router.refresh();
      else {
        setSavedId(id);
        router.replace(`/admin/catalogues/${id}`);
      }
      return id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
      return null;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Download = save (when anything changed) + fetch the PDF. The PDF is
   * rendered from the database, so downloading unsaved edits would silently
   * give the old version.
   */
  const download = async () => {
    const id = dirty || !savedId ? await save() : savedId;
    if (!id) return;
    window.location.assign(`/api/admin/catalogues/${id}/pdf`);
  };

  const themeMeta = CATALOGUE_THEMES[form.theme];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-bdr pb-4">
        <div className="min-w-0">
          <Link
            href="/admin/catalogues"
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Catalogues
          </Link>
          <h1 className="mt-1 truncate text-3xl font-normal tracking-tight text-ink">
            {initial ? initial.title : 'New catalogue'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {savedId && dirty && !saving && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || (!!savedId && !dirty)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {savedId ? (dirty ? 'Save' : 'Saved') : 'Create'}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            title={dirty || !savedId ? 'Saves your changes, then downloads the PDF' : 'Downloads the PDF'}
          >
            <FileDown className="h-4 w-4" />
            {dirty || !savedId ? 'Save & download PDF' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Main column ── */}
        <div className="space-y-6">
          {/* Details */}
          <section className={cardCls}>
            <h2 className="text-sm font-semibold text-gray-900">Details</h2>
            <div className="mt-4 grid gap-4">
              <div>
                <label className={labelCls}>Title (cover page)</label>
                <input
                  className={inputCls}
                  placeholder="Events & Recognition"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Cover photo</label>
                <ImageField
                  value={form.coverImageUrl}
                  placeholder="https://… or upload / pick from the media library"
                  hint="Fills the bottom half of the cover. Without one, the cover is a plain theme-coloured page with the title."
                  uploading={isUploading('cover')}
                  onChange={(url) => set('coverImageUrl', url)}
                  onUpload={(f) => uploadImage('cover', f)}
                  onLibrary={() => setLibraryFor('cover')}
                />
              </div>
              <div>
                <label className={labelCls}>Closing note (thank-you page)</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  placeholder="Need something custom? Our team can source and brand almost anything…"
                  value={form.closingNote}
                  onChange={(e) => set('closingNote', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Thank-you page photo</label>
                <ImageField
                  value={form.closingImageUrl}
                  placeholder="Leave empty to use the homepage hero banner"
                  uploading={isUploading('closing')}
                  onChange={(url) => set('closingImageUrl', url)}
                  onUpload={(f) => uploadImage('closing', f)}
                  onLibrary={() => setLibraryFor('closing')}
                  clearLabel="Use homepage banner"
                />
              </div>
            </div>
          </section>

          {/* Sections */}
          <section className={cardCls}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Sections</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Each section prints its name as a heading, then three products per page.
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className={smallBtn} onClick={() => addSection('category')}>
                  <Tag className="h-3.5 w-3.5" /> From category
                </button>
                <button type="button" className={smallBtn} onClick={() => addSection('manual')}>
                  <Plus className="h-3.5 w-3.5" /> Hand-picked
                </button>
              </div>
            </div>

            {sections.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                No sections yet. Start with <strong>From category</strong> to pull in a whole
                category, or <strong>Hand-picked</strong> to choose products one by one.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {sections.map((s, index) => (
                  <SectionEditor
                    key={s.key}
                    index={index}
                    total={sections.length}
                    section={s}
                    categories={categories}
                    preview={previewFor(index)}
                    onChange={(patch) => updateSection(s.key, patch)}
                    onMove={(dir) => moveSection(s.key, dir)}
                    onRemove={() => removeSection(s.key)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          <section className={cardCls}>
            <h2 className="text-sm font-semibold text-gray-900">Look &amp; pricing</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelCls}>Theme</label>
                <div className="flex gap-2">
                  {THEME_KEYS.map((key) => {
                    const t = CATALOGUE_THEMES[key];
                    const active = form.theme === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        title={t.label}
                        onClick={() => set('theme', key)}
                        className={`h-8 w-8 rounded-md border-2 transition ${
                          active ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: t.block }}
                        aria-pressed={active}
                      />
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-gray-500">{themeMeta.label} — cover and closing page.</p>
              </div>
              <div>
                <label className={labelCls}>Prices</label>
                <select
                  className={inputCls}
                  value={form.priceMode}
                  onChange={(e) => set('priceMode', e.target.value as PriceModeKey)}
                >
                  {PRICE_MODE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={form.showMoq}
                  onChange={(e) => set('showMoq', e.target.checked)}
                />
                Show MOQ on each product
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={form.showSku}
                  onChange={(e) => set('showSku', e.target.checked)}
                />
                Show SKU codes
              </label>
            </div>
          </section>

          <section className={cardCls}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Page estimate</h2>
              {previewing && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
            </div>
            {preview && preview.totalProducts > 0 ? (
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-gray-50 p-2">
                  <dt className="text-[10px] uppercase tracking-wide text-gray-500">Sections</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {preview.sections.filter((s) => s.count > 0).length}
                  </dd>
                </div>
                <div className="rounded-md bg-gray-50 p-2">
                  <dt className="text-[10px] uppercase tracking-wide text-gray-500">Products</dt>
                  <dd className="text-lg font-semibold text-gray-900">{preview.totalProducts}</dd>
                </div>
                <div className="rounded-md bg-gray-50 p-2">
                  <dt className="text-[10px] uppercase tracking-wide text-gray-500">Pages</dt>
                  <dd className="text-lg font-semibold text-gray-900">{preview.totalPages}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                Add a section with products to see how many pages the PDF will run to.
              </p>
            )}
            <p className="mt-3 text-xs text-gray-500">
              Cover + contents (for 2+ sections) + three products per page + thank-you page.
              Sections with no products are skipped when printing.
            </p>
          </section>
        </div>
      </div>

      {libraryFor && (
        <MediaLibraryModal
          multiple={false}
          title={libraryFor === 'cover' ? 'Choose the cover photo' : 'Choose the thank-you page photo'}
          onClose={() => setLibraryFor(null)}
          onConfirm={(picked) => {
            const url = picked[0]?.url;
            if (url) applyImage(libraryFor, url);
            setLibraryFor(null);
          }}
        />
      )}
    </div>
  );
}

// ── Section editor ─────────────────────────────────────────────────────────

function SectionEditor({
  index,
  total,
  section,
  categories,
  preview,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  section: SectionDraft;
  categories: CategoryOption[];
  preview: PreviewSection | null;
  onChange: (patch: Partial<SectionDraft>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const categoryName = useMemo(
    () => categories.find((c) => c.id === section.categoryId)?.name ?? '',
    [categories, section.categoryId]
  );

  // Picking a category auto-titles the section unless the admin typed one.
  const pickCategory = (id: string) => {
    const name = categories.find((c) => c.id === id)?.name ?? '';
    const untouched = !section.title.trim() || section.title === categoryName;
    onChange({ categoryId: id || null, ...(untouched && name ? { title: name } : {}) });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
      <div className="flex items-center gap-2">
        <span className="w-7 shrink-0 text-xs font-semibold text-gray-400">
          {String(index + 1).padStart(2, '0')}
        </span>
        <input
          className={`${inputCls} font-medium`}
          placeholder={section.mode === 'category' ? 'Section name (defaults to category)' : 'Section name'}
          value={section.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" className={iconBtn} disabled={index === 0} onClick={() => onMove(-1)} title="Move up">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" className={iconBtn} disabled={index === total - 1} onClick={() => onMove(1)} title="Move down">
            <ArrowDown className="h-4 w-4" />
          </button>
          <button type="button" className={`${iconBtn} hover:text-rose-600`} onClick={onRemove} title="Remove section">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="mt-3 inline-flex rounded-md border border-gray-200 bg-white p-0.5 text-xs font-medium">
        {(
          [
            ['category', 'From category'],
            ['manual', 'Hand-picked'],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange({ mode })}
            className={`rounded px-3 py-1.5 transition ${
              section.mode === mode ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section.mode === 'category' && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Category</label>
              <select
                className={inputCls}
                value={section.categoryId ?? ''}
                onChange={(e) => pickCategory(e.target.value)}
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? `— ${c.name}` : c.name}
                  </option>
                ))}
              </select>
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-gray-300"
                  checked={section.includeChildren}
                  onChange={(e) => onChange({ includeChildren: e.target.checked })}
                />
                Include sub-categories
              </label>
            </div>
            <div>
              <label className={labelCls}>Max products</label>
              <input
                type="number"
                min={1}
                max={200}
                className={inputCls}
                placeholder="All"
                value={section.maxProducts ?? ''}
                onChange={(e) =>
                  onChange({ maxProducts: e.target.value ? Math.max(1, Number(e.target.value)) : null })
                }
              />
            </div>
        </div>
      )}

      {section.mode === 'manual' && (
        <ProductPicker
          categories={categories}
          items={section.items}
          onChange={(items) => onChange({ items })}
        />
      )}

      {/* Live preview strip */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3 text-xs text-gray-600">
        {preview ? (
          preview.count > 0 ? (
            <>
              <span className="font-medium text-gray-900">
                {preview.count} {preview.count === 1 ? 'product' : 'products'}
              </span>
              <span>·</span>
              <span>
                {preview.pages} {preview.pages === 1 ? 'page' : 'pages'}
              </span>
              <span className="ml-auto flex -space-x-1.5">
                {preview.products.slice(0, 8).map((p) => (
                  <span key={p.id} className="rounded-md ring-2 ring-white" title={p.name}>
                    <Thumb url={p.imageUrl} size="h-7 w-7" />
                  </span>
                ))}
                {preview.count > 8 && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-200 text-[10px] font-semibold text-gray-600 ring-2 ring-white">
                    +{preview.count - 8}
                  </span>
                )}
              </span>
            </>
          ) : (
            <span className="text-amber-700">
              {section.mode === 'category'
                ? section.categoryId
                  ? 'No active products in this category — it will be skipped when printing.'
                  : 'Pick a category to see its products.'
                : 'Add products below.'}
            </span>
          )
        ) : (
          <span>Calculating…</span>
        )}
      </div>
    </div>
  );
}

// ── Product picker (hand-picked sections) ──────────────────────────────────

function ProductPicker({
  categories,
  items,
  onChange,
}: {
  categories: CategoryOption[];
  items: SectionDraft['items'];
  onChange: (items: SectionDraft['items']) => void;
}) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(items.length === 0);

  const selected = useMemo(() => new Set(items.map((i) => i.productId)), [items]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ limit: '40', sort: 'featured' });
      if (search.trim()) params.set('search', search.trim());
      if (categoryId) params.set('categoryId', categoryId);
      fetch(`/api/products?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : { products: [] }))
        .then((d) => {
          if (!cancelled) setResults((d.products ?? []).map(toPickerProduct));
        })
        .catch(() => {
          if (!cancelled) toast.error('Failed to load products');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, categoryId, open]);

  const add = (p: PickerProduct) => {
    if (selected.has(p.id)) return;
    onChange([
      ...items,
      { productId: p.id, name: p.name, sku: p.sku, imageUrl: p.imageUrl, badge: '' },
    ]);
  };
  const addAll = () => {
    const fresh = results.filter((p) => !selected.has(p.id));
    if (fresh.length === 0) return;
    onChange([
      ...items,
      ...fresh.map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        imageUrl: p.imageUrl,
        badge: '',
      })),
    ]);
  };
  const remove = (id: string) => onChange(items.filter((i) => i.productId !== id));
  const move = (id: string, dir: -1 | 1) => {
    const i = items.findIndex((it) => it.productId === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  const setBadge = (id: string, badge: string) =>
    onChange(items.map((it) => (it.productId === id ? { ...it, badge } : it)));

  return (
    <div className="mt-3 space-y-3">
      {/* Selected */}
      {items.length > 0 && (
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <p className="text-xs font-medium text-gray-700">
              {items.length} {items.length === 1 ? 'product' : 'products'} in this section
            </p>
            <button type="button" className={smallBtn} onClick={() => setOpen((o) => !o)}>
              {open ? 'Hide search' : <><Plus className="h-3.5 w-3.5" /> Add more</>}
            </button>
          </div>
          <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
            {items.map((it, i) => (
              <li key={it.productId} className="flex items-center gap-2 px-3 py-1.5">
                <span className="w-5 text-[10px] text-gray-400">{i + 1}</span>
                <Thumb url={it.imageUrl} size="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-900">{it.name}</p>
                  <p className="truncate text-[10px] text-gray-500">{it.sku}</p>
                </div>
                <input
                  className="w-24 rounded-md border border-gray-200 px-2 py-1 text-[11px] placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
                  placeholder="Badge (New)"
                  maxLength={24}
                  value={it.badge}
                  onChange={(e) => setBadge(it.productId, e.target.value)}
                />
                <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(it.productId, -1)} title="Move up">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" className={iconBtn} disabled={i === items.length - 1} onClick={() => move(it.productId, 1)} title="Move down">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" className={`${iconBtn} hover:text-rose-600`} onClick={() => remove(it.productId)} title="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search */}
      {open && (
        <div className="rounded-md border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                className={`${inputCls} pl-8`}
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={`${inputCls} w-auto`}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? `— ${c.name}` : c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={smallBtn}
              onClick={addAll}
              disabled={loading || results.every((p) => selected.has(p.id))}
              title="Add every product shown"
            >
              <Plus className="h-3.5 w-3.5" /> Add all shown
            </button>
          </div>
          <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
            {loading && results.length === 0 ? (
              <li className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading products…
              </li>
            ) : results.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-gray-500">No products match.</li>
            ) : (
              results.map((p) => {
                const added = selected.has(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-2 px-3 py-1.5">
                    <Thumb url={p.imageUrl} size="h-8 w-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-900">{p.name}</p>
                      <p className="truncate text-[10px] text-gray-500">
                        {p.sku}
                        {p.fromPrice != null ? ` · from ${formatRupees(p.fromPrice)}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => add(p)}
                      disabled={added}
                      className={`${smallBtn} ${added ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}`}
                    >
                      {added ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" /> Add
                        </>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
