'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft, ListChecks } from 'lucide-react';

interface UploadResult {
  created: number;
  failed: number;
  total: number;
  errors: { row: number; pack: string; message: string }[];
  /** Total images downloaded + uploaded across the whole import. */
  images: number;
  /** Image links that could not be fetched — the pack itself still imported. */
  warnings: { row: number; pack: string; message: string }[];
}

export default function PacksBulkUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    created: number;
    failed: number;
    note?: string;
    /** Images done / total for the row being worked on right now. */
    imgDone?: number;
    imgTotal?: number;
    /** Images uploaded across the whole import so far. */
    images?: number;
  } | null>(null);

  const onUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/packs/bulk-upload', { method: 'POST', body: fd });

      // Validation errors come back as a normal JSON response (non-200)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }

      // Otherwise the server streams NDJSON progress lines
      const reader = res.body?.getReader();
      if (!reader) {
        const data = await res.json().catch(() => ({}));
        setResult(data);
        return;
      }
      const decoder = new TextDecoder();
      let buffer = '';
      let final: UploadResult | null = null;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          handleLine(line);
        }
      }
      if (buffer.trim()) handleLine(buffer);
      if (final) setResult(final);

      function handleLine(line: string) {
        if (!line.trim()) return;
        let msg: any;
        try { msg = JSON.parse(line); } catch { return; }
        if (msg.type === 'start') {
          setProgress({ current: 0, total: msg.total, created: 0, failed: 0 });
        } else if (msg.type === 'progress') {
          setProgress({
            current: msg.current,
            total: msg.total,
            created: msg.created,
            failed: msg.failed,
            note: msg.note,
            imgDone: msg.imgDone,
            imgTotal: msg.imgTotal,
            images: msg.images,
          });
        } else if (msg.type === 'done') {
          final = { created: msg.created, failed: msg.failed, total: msg.total, errors: msg.errors, warnings: msg.warnings ?? [], images: msg.images ?? 0 };
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/products?view=packs" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Curated Packs
        </Link>
        <h1 className="text-3xl font-normal text-ink">Bulk Upload Curated Packs</h1>
        <p className="mt-1 text-sm text-ink-2">
          Import many packs at once from a CSV or Excel (.xlsx) file — one row per pack, member products listed by SKU.
        </p>
      </div>

      {/* Step 1 — template */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-em-50 text-sm font-semibold text-em">1</div>
          <div className="flex-1">
            <h2 className="text-base font-medium text-ink">Download the template</h2>
            <p className="mt-1 text-sm text-ink-2">
              One row per pack: its name, the occasions it belongs to, and the products inside it.
              A pack has no prices, HSN or dimensions of its own — those are derived from its members,
              exactly like the pack form does.
            </p>
            <p className="mt-2 rounded-lg bg-em-50 px-3 py-2 text-sm text-ink-2">
              Customers reach a pack two ways. The{' '}
              <code className="rounded bg-white px-1 py-0.5 text-xs">occasions</code> cell decides
              which occasion pages it appears on — comma-separate for several. Its budget band is
              worked out from the members&apos; prices, so there is nothing to fill in for that.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href="/api/admin/packs/bulk-upload/template"
                className="inline-flex items-center gap-2 rounded-md border-2 border-bdr px-4 py-2 text-sm font-medium text-ink transition hover:bg-gray-50"
              >
                <Download className="h-4 w-4" /> Blank template
              </a>
              <a
                href="/api/admin/packs/bulk-upload/sample"
                className="inline-flex items-center gap-2 rounded-md border-2 border-em bg-em-50 px-4 py-2 text-sm font-medium text-em transition hover:bg-em-50/70"
              >
                <Download className="h-4 w-4" /> Download sample sheet
              </a>
              <a
                href="/api/admin/packs/bulk-upload/skus"
                className="inline-flex items-center gap-2 rounded-md border-2 border-bdr px-4 py-2 text-sm font-medium text-ink transition hover:bg-gray-50"
              >
                <ListChecks className="h-4 w-4" /> Product SKU list
              </a>
            </div>
            <p className="mt-2 text-xs text-ink-3">
              The template and sample are filled with SKUs from your real catalogue, so they import as-is.
              The SKU list is a reference of every product you can put inside a pack.
            </p>
          </div>
        </div>
      </div>

      {/* Step 2 — rules */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-em-50 text-sm font-semibold text-em">2</div>
          <div className="flex-1">
            <h2 className="text-base font-medium text-ink">Fill it in — a few rules</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-2 list-disc pl-5">
              <li><strong>name</strong> and <strong>products</strong> are the only required columns.</li>
              <li>
                <strong>products</strong> is a comma-separated list of member SKUs. Add a quantity with{' '}
                <code>x</code> — e.g. <code>DRIN-Insula-4 x2, NOTE-A5-1</code>. A SKU that isn&apos;t
                found is reported and the whole row is skipped, so a pack is never created half-filled.
              </li>
              <li>
                <strong>occasions</strong> are matched by name and{' '}
                <strong>created if they don&apos;t exist</strong> — a new occasion comes straight
                from the sheet. Leave it blank and the pack is reachable by budget only.
              </li>
              <li>
                <strong>Pricing is automatic.</strong> A pack&apos;s tiers are the sum of its members&apos; tier
                prices × quantity. Don&apos;t put prices in the sheet.
              </li>
              <li>
                <strong>Images are automatic.</strong> The pack tile and detail page collage the member
                products&apos; images. Only fill <code>imageUrls</code> if you want a custom hero image instead —
                a <strong>Google Drive file link</strong> shared with &ldquo;Anyone with the link&rdquo; works, and
                gets downloaded onto our CDN during the import.
              </li>
              <li>Weight, lead time, MOQ and box dimensions are derived from the members too.</li>
              <li><strong>sku</strong> and <strong>slug</strong> are generated from the pack name if left blank.</li>
              <li>
                <strong>metaTitle</strong> and <strong>metaDescription</strong> set the pack&apos;s SEO
                title and description. Leave them blank and the pack page falls back to its name and
                short description. Aim for ~60 and ~155 characters.
              </li>
              <li><strong>category</strong>, <strong>occasions</strong> are matched by name and created if missing. yes/no field: <code>isFeatured</code>.</li>
              <li>Rows whose pack SKU already exists are skipped (reported below), so re-uploading is safe.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Step 3 — upload */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-em-50 text-sm font-semibold text-em">3</div>
          <div className="flex-1">
            <h2 className="text-base font-medium text-ink">Upload your file</h2>

            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-bdr-2 p-8 text-center transition hover:border-em">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(null); }}
              />
              <FileSpreadsheet className="mb-2 h-8 w-8 text-ink-3" />
              {file ? (
                <span className="text-sm font-medium text-ink">{file.name}</span>
              ) : (
                <span className="text-sm text-ink-2">Click to choose a .csv or .xlsx file</span>
              )}
            </label>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-md border-2 border-red-200 bg-red-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Progress bar (fills as each pack imports) */}
            {loading && progress && progress.total > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">
                    Importing {progress.current} of {progress.total} packs…
                  </span>
                  <span className="text-ink-2">
                    {Math.round((progress.current / progress.total) * 100)}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-em transition-all duration-200"
                    style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex gap-4 text-xs text-ink-2">
                  <span className="text-em">{progress.created} created</span>
                  {progress.failed > 0 && <span className="text-red-600">{progress.failed} skipped</span>}
                  {!!progress.images && <span>{progress.images} images uploaded</span>}
                </div>

                {/* Second bar for the current row's images. Downloading them is
                    the slow part, so the row bar alone would look stuck. */}
                {!!progress.imgTotal && progress.imgTotal > 0 && (
                  <div className="mt-2 rounded-md bg-gray-50 p-2.5">
                    <div className="mb-1 flex items-center justify-between text-xs text-ink-2">
                      <span>{progress.note}</span>
                      <span>
                        {progress.imgDone ?? 0}/{progress.imgTotal}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-ink-2 transition-all duration-200"
                        style={{ width: `${Math.round(((progress.imgDone ?? 0) / progress.imgTotal) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {progress.note && !progress.imgTotal && <p className="mt-1 text-xs text-ink-2">{progress.note}</p>}
              </div>
            )}

            <Button
              onClick={onUpload}
              disabled={!file || loading}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-em px-5 py-2.5 text-sm font-medium text-white hover:bg-em-600 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" /> {loading ? 'Importing…' : 'Import Packs'}
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="rounded-md border-2 border-bdr bg-white p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-em" />
            <h2 className="text-base font-medium text-ink">Import finished</h2>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-2xl font-semibold text-ink">{result.total}</p>
              <p className="text-xs text-ink-2">Rows</p>
            </div>
            <div className="rounded-md bg-em-50 p-4">
              <p className="text-2xl font-semibold text-em">{result.created}</p>
              <p className="text-xs text-ink-2">Created</p>
            </div>
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-2xl font-semibold text-red-600">{result.failed}</p>
              <p className="text-xs text-ink-2">Skipped / failed</p>
            </div>
          </div>
          {!!result.images && (
            <p className="mt-2 text-xs text-ink-2">{result.images} images downloaded and uploaded to the CDN.</p>
          )}

          {result.errors.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-ink">Rows not imported:</p>
              <div className="max-h-64 overflow-y-auto rounded-md border border-bdr">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-3 py-2 text-xs font-normal text-ink-2">Row</th>
                      <th className="px-3 py-2 text-xs font-normal text-ink-2">Pack</th>
                      <th className="px-3 py-2 text-xs font-normal text-ink-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bdr">
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-ink-2">{e.row}</td>
                        <td className="px-3 py-2 text-ink-2">{e.pack || '—'}</td>
                        <td className="px-3 py-2 text-ink">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-ink">
                Imported, but these image links could not be fetched:
              </p>
              <div className="max-h-64 overflow-y-auto rounded-md border border-amber-200 bg-amber-50">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="px-3 py-2 text-xs font-normal text-ink-2">Row</th>
                      <th className="px-3 py-2 text-xs font-normal text-ink-2">Pack</th>
                      <th className="px-3 py-2 text-xs font-normal text-ink-2">Image link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200">
                    {result.warnings.map((w, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 align-top text-ink-2">{w.row}</td>
                        <td className="px-3 py-2 align-top text-ink-2">{w.pack || '—'}</td>
                        <td className="px-3 py-2 break-all text-ink">{w.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <Button
              onClick={() => router.push('/admin/products?view=packs')}
              className="rounded-md bg-em px-5 py-2.5 text-sm font-medium text-white hover:bg-em-600"
            >
              View Packs
            </Button>
            <Button
              variant="outline"
              onClick={() => { setFile(null); setResult(null); }}
              className="rounded-md px-5 py-2.5 text-sm"
            >
              Import another file
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
