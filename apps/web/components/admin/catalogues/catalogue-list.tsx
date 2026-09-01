'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, FileDown, Trash2, Loader2, BookOpen } from 'lucide-react';
import { CATALOGUE_THEMES, type CatalogueThemeKey } from '@/lib/catalogue';

export interface CatalogueRow {
  id: string;
  title: string;
  theme: CatalogueThemeKey;
  updatedAt: string;
  sectionCount: number;
  categorySections: number;
  pickedProducts: number;
}

export function CatalogueList({ rows }: { rows: CatalogueRow[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const remove = async (row: CatalogueRow) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    setDeleting(row.id);
    try {
      const res = await fetch(`/api/admin/catalogues/${row.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Catalogue deleted');
      router.refresh();
    } catch {
      toast.error('Failed to delete catalogue');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bdr pb-4">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-ink">Catalogues</h1>
          <p className="mt-1 text-sm text-ink-2">
            Build a catalogue for a category (or a hand-picked set), or download the complete
            catalogue — every category with three or more products, always live.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/admin/catalogues/complete/pdf"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            title="One PDF of every category that has three or more active products"
          >
            <FileDown className="h-4 w-4" /> Download Complete Catalogue
          </a>
          <Link
            href="/admin/catalogues/new"
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> New catalogue
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No catalogues yet. Build one from a category in a couple of minutes.
          </p>
          <Link
            href="/admin/catalogues/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Create your first catalogue
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {rows.map((row) => {
            const theme = CATALOGUE_THEMES[row.theme];
            return (
              <div
                key={row.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-gray-50"
              >
                <span
                  className="h-9 w-9 shrink-0 rounded-md border border-gray-200"
                  style={{ backgroundColor: theme.block }}
                  aria-hidden
                />
                <div className="min-w-[220px] flex-1">
                  <Link
                    href={`/admin/catalogues/${row.id}`}
                    className="text-sm font-medium text-gray-900 hover:underline"
                  >
                    {row.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {row.sectionCount} {row.sectionCount === 1 ? 'section' : 'sections'}
                    {row.categorySections > 0 ? ` · ${row.categorySections} live from category` : ''}
                    {row.pickedProducts > 0 ? ` · ${row.pickedProducts} hand-picked` : ''}
                    {' · updated '}
                    {new Date(row.updatedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`/api/admin/catalogues/${row.id}/pdf`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    title="Download the PDF"
                  >
                    <FileDown className="h-3.5 w-3.5" /> Download PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => remove(row)}
                    disabled={deleting === row.id}
                    className="inline-flex items-center rounded-md p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    title="Delete"
                  >
                    {deleting === row.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
