'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { resolveSwatchHex } from '@/lib/color-name';
import { toast } from '@/lib/stores/toast-store';
import { Plus, GripVertical, X, ImagePlus, Search, ChevronRight } from 'lucide-react';

export interface Variant {
  id?: string;
  kind: string;
  value: string;
  hexColor?: string;
  imageUrl?: string;
  price?: number;
  sortOrder: number;
}

interface OptionUi {
  name: string;
  editing: boolean;
}

interface ProductVariantsProps {
  variants: Variant[];
  setVariants: React.Dispatch<React.SetStateAction<Variant[]>>;
  mode: 'create' | 'edit';
  productId?: string;
  /** Existing compress-and-upload handler keyed by the flat variant index. */
  onImageUpload: (idx: number, file: File) => void;
}

// Shopify-style "recommended" option names. Lowercased kinds so the colour /
// size special-casing keeps working.
const RECOMMENDED = [
  { name: 'color', label: 'Color' },
  { name: 'size', label: 'Size' },
  { name: 'material', label: 'Item material' },
  { name: 'style', label: 'Style' },
  { name: 'pattern', label: 'Pattern' },
];

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Shopify-style variant options manager.
 *
 * Values are still stored one-row-per-value in the flat `variants` array (kept
 * as-is for the API), but presented grouped by option name — each option is an
 * editable card with its values as rows. Colour options keep a swatch, size
 * options keep a per-value price, and any value can carry an image.
 */
export function ProductVariants({
  variants,
  setVariants,
  mode,
  productId,
  onImageUpload,
}: ProductVariantsProps) {
  const [options, setOptions] = useState<OptionUi[]>([]);
  const [picker, setPicker] = useState(false); // recommended-option dropdown
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({}); // per-option "add value" text
  const pickerRef = useRef<HTMLDivElement>(null);

  // Keep the option list in sync with the variant kinds. Adds an option for any
  // kind that appears, keeps drafts (editing, no values yet), drops the rest.
  useEffect(() => {
    setOptions((prev) => {
      const kinds: string[] = [];
      for (const v of variants) if (!kinds.includes(v.kind)) kinds.push(v.kind);
      const next = [...prev];
      for (const k of kinds) if (!next.some((o) => o.name === k)) next.push({ name: k, editing: false });
      return next.filter((o) => kinds.includes(o.name) || o.editing);
    });
  }, [variants]);

  // Close the recommended dropdown on outside click.
  useEffect(() => {
    if (!picker) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPicker(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [picker]);

  const setOptionEditing = (name: string, editing: boolean) =>
    setOptions((prev) => prev.map((o) => (o.name === name ? { ...o, editing } : o)));

  const addOption = (name: string) => {
    setPicker(false);
    setSearch('');
    if (name && options.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
      setOptionEditing(name, true);
      return;
    }
    setOptions((prev) => [...prev, { name, editing: true }]);
  };

  const renameOption = (oldName: string, newName: string) => {
    setOptions((prev) => prev.map((o) => (o.name === oldName ? { ...o, name: newName } : o)));
    if (oldName !== newName) {
      setVariants((prev) => prev.map((v) => (v.kind === oldName ? { ...v, kind: newName } : v)));
    }
  };

  const addValues = (optName: string, raw: string) => {
    const values = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (values.length === 0) return;
    setVariants((prev) => {
      const existing = new Set(
        prev.filter((v) => v.kind === optName).map((v) => v.value.toLowerCase()),
      );
      const toAdd: Variant[] = [];
      for (const val of values) {
        if (existing.has(val.toLowerCase())) continue;
        existing.add(val.toLowerCase());
        toAdd.push({ kind: optName, value: val, sortOrder: prev.length + toAdd.length });
      }
      return toAdd.length ? [...prev, ...toAdd] : prev;
    });
    setDrafts((prev) => ({ ...prev, [optName]: '' }));
  };

  const updateVariant = (idx: number, patch: Partial<Variant>) =>
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));

  const deleteVariantAt = async (idx: number) => {
    const v = variants[idx];
    if (v?.id && mode === 'edit' && productId) {
      try {
        await fetch(`/api/admin/products/${productId}/variants?variantId=${v.id}`, {
          method: 'DELETE',
        });
      } catch {
        /* best-effort; local removal still applies */
      }
    }
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const deleteOption = async (optName: string) => {
    const toDelete = variants.filter((v) => v.kind === optName);
    if (mode === 'edit' && productId) {
      for (const v of toDelete) {
        if (v.id) {
          await fetch(`/api/admin/products/${productId}/variants?variantId=${v.id}`, {
            method: 'DELETE',
          }).catch(() => {});
        }
      }
    }
    setVariants((prev) => prev.filter((v) => v.kind !== optName));
    setOptions((prev) => prev.filter((o) => o.name !== optName));
    toast.success('✅ Option removed', 1500);
  };

  // Flat-index entries for one option (so image upload gets the right index).
  const entriesFor = (optName: string) =>
    variants.map((v, i) => ({ v, i })).filter((e) => e.v.kind === optName);

  const usedKinds = new Set(options.map((o) => o.name.toLowerCase()));
  const recommended = RECOMMENDED.filter(
    (r) =>
      !usedKinds.has(r.name) &&
      (!search || r.label.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-3">
      {options.map((opt) => {
        const isColor = opt.name.toLowerCase() === 'color';
        const isSize = opt.name.toLowerCase() === 'size';
        const entries = entriesFor(opt.name);

        // ── Collapsed summary ────────────────────────────────────────────
        if (!opt.editing) {
          return (
            <div
              key={opt.name}
              onClick={() => setOptionEditing(opt.name, true)}
              className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-gray-200 p-3 transition hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="flex items-start gap-2">
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{cap(opt.name)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {entries.length === 0 ? (
                      <span className="text-xs text-gray-400">No values yet</span>
                    ) : (
                      entries.map(({ v }) => (
                        <span
                          key={v.value}
                          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 py-0.5 pr-2.5 text-xs text-gray-700"
                        >
                          {v.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={v.imageUrl}
                              alt={v.value}
                              className="h-5 w-5 rounded-full border border-gray-300 object-cover"
                            />
                          ) : isColor ? (
                            <span
                              className="ml-1 h-3 w-3 rounded-full border border-gray-300"
                              style={{ backgroundColor: resolveSwatchHex(v.value, v.hexColor) }}
                            />
                          ) : (
                            <span className="ml-1.5" />
                          )}
                          {v.value}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOptionEditing(opt.name, true)}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
            </div>
          );
        }

        // ── Expanded editor ──────────────────────────────────────────────
        return (
          <div key={opt.name} className="rounded-lg border border-gray-300 p-4">
            <div className="flex gap-2">
              <GripVertical className="mt-8 h-4 w-4 shrink-0 text-gray-300" />
              <div className="flex-1 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Option name</label>
                  <Input
                    value={opt.name}
                    onChange={(e) => renameOption(opt.name, e.target.value)}
                    placeholder="e.g. Color, Size, Material"
                    className="text-sm"
                  />
                </div>

                {/* Values */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500">
                    Option values
                  </label>
                  {entries.map(({ v, i }) => (
                    <div key={i} className="flex items-center gap-2">
                      {/* Leading media control: image thumb (any) or colour swatch */}
                      <label
                        className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-gray-300"
                        title={v.imageUrl ? 'Change image' : 'Add image'}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onImageUpload(i, f);
                            e.target.value = '';
                          }}
                        />
                        {v.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.imageUrl} alt={v.value} className="h-full w-full object-cover" />
                        ) : isColor ? (
                          <span
                            className="block h-full w-full"
                            style={{ backgroundColor: resolveSwatchHex(v.value, v.hexColor) }}
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-gray-400">
                            <ImagePlus className="h-4 w-4" />
                          </span>
                        )}
                      </label>

                      <Input
                        value={v.value}
                        onChange={(e) => updateVariant(i, { value: e.target.value })}
                        className="flex-1 text-sm"
                      />

                      {isColor && (
                        <input
                          type="color"
                          value={resolveSwatchHex(v.value, v.hexColor)}
                          onChange={(e) => updateVariant(i, { hexColor: e.target.value })}
                          className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-gray-300 bg-white p-0.5"
                          title="Pick colour"
                        />
                      )}

                      {isSize && (
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="text-xs text-gray-400">₹</span>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Price"
                            value={v.price ?? ''}
                            onChange={(e) =>
                              updateVariant(i, {
                                price: e.target.value === '' ? undefined : Number(e.target.value),
                              })
                            }
                            className="w-20 text-xs"
                            title="Price for this size"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteVariantAt(i)}
                        className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        title="Remove value"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {/* Add value */}
                  <div className="flex items-center gap-2">
                    <span className="h-9 w-9 shrink-0" />
                    <Input
                      value={drafts[opt.name] || ''}
                      onChange={(e) => setDrafts((p) => ({ ...p, [opt.name]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addValues(opt.name, drafts[opt.name] || '');
                        }
                      }}
                      onBlur={() => addValues(opt.name, drafts[opt.name] || '')}
                      placeholder={`Add ${cap(opt.name) || 'value'} (comma-separate for multiple)`}
                      className="flex-1 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => deleteOption(opt.name)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addValues(opt.name, drafts[opt.name] || '');
                      setOptionEditing(opt.name, false);
                    }}
                    className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add option + recommended dropdown */}
      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setPicker((p) => !p)}
          className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          {options.length === 0 ? 'Add options like size or color' : 'Add another option'}
        </button>

        {picker && (
          <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim()) addOption(search.trim().toLowerCase());
                }}
                placeholder="Search"
                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {recommended.length > 0 && (
              <>
                <p className="px-2 py-1 text-xs font-semibold text-gray-500">Recommended</p>
                {recommended.map((r) => (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => addOption(r.name)}
                    className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-gray-800 hover:bg-gray-100"
                  >
                    {r.label}
                  </button>
                ))}
              </>
            )}

            <button
              type="button"
              onClick={() => addOption(search.trim().toLowerCase() || '')}
              className="mt-1 flex w-full items-center gap-2 border-t border-gray-100 px-2 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4" />
              {search.trim() ? `Create "${search.trim()}"` : 'Create custom option'}
              <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
