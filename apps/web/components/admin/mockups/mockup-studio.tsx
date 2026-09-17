'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, ImagePlus, Loader2, Plus, RefreshCw, Search, Sparkles, Upload, X } from 'lucide-react';
import { toast } from '@/lib/stores/toast-store';
import { generatedImageDownloadUrl } from '@/lib/generated-image-download';

/** One item in the mockup — a catalogue product or an uploaded reference photo. */
interface MockupItem {
  /** Product id, or a generated key for uploaded items. */
  key: string;
  name: string;
  brand?: string | null;
  imageUrl: string | null;
  custom: boolean;
}

type BrandingMode = 'auto' | 'apply' | 'skip';

interface BrandingRow {
  mode: BrandingMode;
  technique: string;
  logoColour: string;
  position: string;
}

interface BoxOption {
  id: string;
  name: string;
  imageUrl: string | null;
}

const MAX_ITEMS = 20;
const EMPTY_ROW: BrandingRow = { mode: 'auto', technique: '', logoColour: '', position: '' };

const TECHNIQUES = [
  'Laser engraving',
  'UV printing',
  'Screen printing',
  'Embroidery',
  'Embossing',
  'Debossing',
  'Foil stamping',
  'Digital printing',
];

const inputCls =
  'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500';
const cardCls = 'rounded-lg border border-gray-200 bg-white p-5';

async function uploadImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
  if (file.size > 5 * 1024 * 1024) throw new Error('The image must be smaller than 5 MB');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.error || 'Upload failed');
  return String(data.url);
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function MockupStudio() {
  const [items, setItems] = useState<MockupItem[]>([]);
  const [branding, setBranding] = useState<Record<string, BrandingRow>>({});
  const [boxId, setBoxId] = useState('');
  const [boxColour, setBoxColour] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [label, setLabel] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<string[]>([]); // newest first
  const customSeq = useRef(0);
  const debouncedSearch = useDebounced(search.trim(), 300);

  const boxes = useQuery({
    queryKey: ['mockup-boxes'],
    queryFn: async (): Promise<BoxOption[]> => {
      const res = await fetch('/api/packaging');
      if (!res.ok) throw new Error('Failed to load boxes');
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map((b: { id: string; name: string; imageUrl?: string | null }) => ({
        id: b.id,
        name: b.name,
        imageUrl: b.imageUrl ?? null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const catalogue = useQuery({
    queryKey: ['mockup-products', debouncedSearch],
    queryFn: async (): Promise<MockupItem[]> => {
      const params = new URLSearchParams({ limit: '24', sort: 'featured' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      return (data.products ?? []).map(
        (p: { id: string; name: string; brand?: string | null; images?: { url: string }[] }) => ({
          key: p.id,
          name: p.name,
          brand: p.brand ?? null,
          imageUrl: p.images?.[0]?.url ?? null,
          custom: false,
        })
      );
    },
  });

  const logoUpload = useMutation({
    mutationFn: (file: File) => uploadImage(file, 'proposal-logos'),
    onSuccess: (url) => {
      setLogoUrl(url);
      toast.success('Client logo added');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Logo upload failed'),
  });

  const customUpload = useMutation({
    mutationFn: async (file: File) => ({ url: await uploadImage(file, 'mockup-references'), file }),
    onSuccess: ({ url, file }) => {
      customSeq.current += 1;
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Custom product';
      addItem({ key: `custom-${customSeq.current}`, name, imageUrl: url, custom: true });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Upload failed'),
  });

  const generate = useMutation({
    mutationFn: async () => {
      const brandingMap: Record<string, { apply: boolean; technique?: string; logoColour?: string; position?: string }> = {};
      for (const it of items) {
        const row = branding[it.key] ?? EMPTY_ROW;
        if (row.mode === 'auto') continue;
        brandingMap[it.key] =
          row.mode === 'skip'
            ? { apply: false }
            : {
                apply: true,
                technique: row.technique || undefined,
                logoColour: row.logoColour.trim() || undefined,
                position: row.position.trim() || undefined,
              };
      }
      const res = await fetch('/api/admin/mockups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: items.filter((it) => !it.custom).map((it) => it.key),
          customItems: items
            .filter((it) => it.custom)
            .map((it) => ({ key: it.key, name: it.name.trim(), imageUrl: it.imageUrl })),
          boxId: boxId || null,
          boxColour: boxColour.trim() || null,
          logoUrl: logoUrl || null,
          brandingMap,
          label: label.trim() || null,
          companyName: companyName.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Mockup generation failed');
      return String(data.data.url);
    },
    onSuccess: (url) => {
      setResults((prev) => [url, ...prev]);
      toast.success('Mockup ready');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Mockup generation failed'),
  });

  function addItem(item: MockupItem) {
    setItems((prev) => {
      if (prev.some((p) => p.key === item.key)) return prev;
      if (prev.length >= MAX_ITEMS) {
        toast.error(`A mockup holds at most ${MAX_ITEMS} products`);
        return prev;
      }
      return [...prev, item];
    });
  }

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((p) => p.key !== key));
    setBranding((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const patchRow = (key: string, patch: Partial<BrandingRow>) =>
    setBranding((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY_ROW), ...patch } }));

  const selectedKeys = new Set(items.map((it) => it.key));
  const missingNames = items.some((it) => it.custom && !it.name.trim());
  const canGenerate = items.length > 0 && !missingNames && !generate.isPending;
  const latest = results[0];
  const fileName = (label.trim() || companyName.trim() || 'mockup').replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      {/* ── Left: inputs ─────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Box + logo */}
        <section className={cardCls}>
          <h2 className="mb-4 text-base font-semibold text-gray-900">1. Box and brand</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Gift box</label>
              {boxes.isLoading ? (
                <div className="h-9 animate-pulse rounded-md bg-gray-100" />
              ) : boxes.isError ? (
                <button type="button" onClick={() => boxes.refetch()} className="text-sm font-medium text-red-600 hover:underline">
                  Failed to load boxes — retry
                </button>
              ) : (
                <select value={boxId} onChange={(e) => setBoxId(e.target.value)} className={inputCls}>
                  <option value="">No specific box (premium white box)</option>
                  {(boxes.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={labelCls}>Box colour</label>
              <input
                value={boxColour}
                onChange={(e) => setBoxColour(e.target.value)}
                placeholder="Leave blank to keep the box as photographed"
                maxLength={80}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-gray-400">Brand colour, e.g. “navy blue” or “#1A3C6E”.</p>
            </div>
            <div>
              <label className={labelCls}>Client logo</label>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Client logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide text-gray-400">No logo</span>
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  {logoUpload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {logoUrl ? 'Change' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={logoUpload.isPending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) logoUpload.mutate(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                {logoUrl && (
                  <button type="button" onClick={() => setLogoUrl('')} className="text-sm text-gray-500 hover:text-red-600">
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Without a logo, branded items show a “YOUR LOGO HERE” placeholder.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Client / company</label>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={160} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mockup label</label>
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Diwali option A" maxLength={80} className={inputCls} />
              </div>
            </div>
          </div>
        </section>

        {/* Product picker */}
        <section className={cardCls}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">2. Products</h2>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {customUpload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Upload a product photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={customUpload.isPending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) customUpload.mutate(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the catalogue"
              className={`${inputCls} pl-8`}
            />
          </div>
          {catalogue.isLoading ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-md bg-gray-100" />
              ))}
            </div>
          ) : catalogue.isError ? (
            <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              Failed to load products.{' '}
              <button type="button" onClick={() => catalogue.refetch()} className="font-medium text-indigo-600 hover:underline">
                Retry
              </button>
            </div>
          ) : (catalogue.data ?? []).length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              No products match “{debouncedSearch}”. Upload a product photo instead.
            </div>
          ) : (
            <div className="grid max-h-[420px] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6">
              {(catalogue.data ?? []).map((p) => {
                const picked = selectedKeys.has(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => (picked ? removeItem(p.key) : addItem(p))}
                    className={`group overflow-hidden rounded-md border text-left transition ${
                      picked ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="relative aspect-square bg-gray-50">
                      {p.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt={p.name} loading="lazy" className="h-full w-full object-contain" />
                      )}
                      <span
                        className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white ${
                          picked ? 'bg-indigo-600' : 'bg-gray-900/50 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {picked ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </span>
                    </div>
                    <p className="line-clamp-2 px-2 py-1.5 text-xs text-gray-700">{p.name}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Branding map */}
        <section className={cardCls}>
          <h2 className="text-base font-semibold text-gray-900">3. Branding map</h2>
          <p className="mb-4 mt-1 text-sm text-gray-500">
            Decide which products carry the logo. “Auto” follows the product’s catalogue branding method;
            uploaded products stay unbranded unless you choose “Apply logo”.
          </p>
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              Add products above to build the branding map.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it, idx) => {
                const row = branding[it.key] ?? EMPTY_ROW;
                return (
                  <div key={it.key} className="rounded-md border border-gray-200 p-3">
                    <div className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-xs tabular-nums text-gray-400">{idx + 1}</span>
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                        {it.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.imageUrl} alt={it.name} className="h-full w-full object-contain" />
                        )}
                      </div>
                      {it.custom ? (
                        <input
                          value={it.name}
                          onChange={(e) =>
                            setItems((prev) => prev.map((p) => (p.key === it.key ? { ...p, name: e.target.value } : p)))
                          }
                          placeholder="Product name (required)"
                          maxLength={120}
                          className={`${inputCls} flex-1`}
                        />
                      ) : (
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{it.name}</p>
                      )}
                      <select
                        value={row.mode}
                        onChange={(e) => patchRow(it.key, { mode: e.target.value as BrandingMode })}
                        className={`${inputCls} w-36 shrink-0`}
                      >
                        <option value="auto">{it.custom ? 'Auto (no logo)' : 'Auto (catalogue)'}</option>
                        <option value="apply">Apply logo</option>
                        <option value="skip">No logo</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeItem(it.key)}
                        className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        title="Remove product"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {row.mode === 'apply' && (
                      <div className="mt-3 grid gap-3 pl-8 sm:grid-cols-3">
                        <div>
                          <label className={labelCls}>Method</label>
                          <select value={row.technique} onChange={(e) => patchRow(it.key, { technique: e.target.value })} className={inputCls}>
                            <option value="">Best fit for the material</option>
                            {TECHNIQUES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Logo colour</label>
                          <input
                            value={row.logoColour}
                            onChange={(e) => patchRow(it.key, { logoColour: e.target.value })}
                            placeholder="e.g. white, gold foil"
                            maxLength={80}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Position</label>
                          <input
                            value={row.position}
                            onChange={(e) => patchRow(it.key, { position: e.target.value })}
                            placeholder="e.g. front centre"
                            maxLength={80}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Right: generate + result ─────────────────────────────────── */}
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <section className={cardCls}>
          <h2 className="mb-3 text-base font-semibold text-gray-900">4. Generate</h2>
          <div className="aspect-[5/4] overflow-hidden rounded-md border border-gray-200 bg-gray-50">
            {generate.isPending ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                Creating the mockup — usually 20 to 60 seconds
              </div>
            ) : latest ? (
              <a href={latest} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={latest} alt="Generated mockup" className="h-full w-full object-cover" />
              </a>
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-400">
                Your mockup appears here.
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => generate.mutate()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {latest ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {latest ? 'Regenerate' : 'Generate mockup'}
          </button>
          {latest && !generate.isPending && (
            <a
              href={generatedImageDownloadUrl(latest, fileName)}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          )}
          <p className="mt-3 text-xs text-gray-400">
            {items.length === 0
              ? 'Add at least one product to generate.'
              : missingNames
                ? 'Name every uploaded product first.'
                : `${items.length} product${items.length === 1 ? '' : 's'} · each generation is billed by Gemini.`}
          </p>
        </section>

        {results.length > 1 && (
          <section className={cardCls}>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Earlier versions this session</h3>
            <div className="grid grid-cols-3 gap-2">
              {results.slice(1).map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-md border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Earlier mockup" className="aspect-[5/4] w-full object-cover" />
                </a>
              ))}
            </div>
          </section>
        )}

        <p className="px-1 text-xs text-gray-400">
          All mockups are kept in{' '}
          <Link href="/admin/generated-images" className="font-medium text-indigo-600 hover:underline">
            Generated Images
          </Link>
          .
        </p>
      </aside>
    </div>
  );
}
