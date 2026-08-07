'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Upload, Images, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

interface UploadResult {
  uploaded: number;
  productsTouched: number;
  total: number;
  unmatched: string[];
  skipped: { name: string; reason: string }[];
  errors: { sku: string; file: string; message: string }[];
}

export default function BulkImagesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; uploaded: number; failed: number } | null>(null);

  const reset = (next: File[]) => { setFiles(next); setResult(null); setError(null); };

  const onUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      const res = await fetch('/api/admin/products/bulk-images', { method: 'POST', body: fd });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }

      const reader = res.body?.getReader();
      if (!reader) { setResult(await res.json()); return; }

      const decoder = new TextDecoder();
      let buffer = '';
      let final: UploadResult | null = null;

      const handleLine = (line: string) => {
        if (!line.trim()) return;
        let msg: any;
        try { msg = JSON.parse(line); } catch { return; }
        if (msg.type === 'start') {
          setProgress({ current: 0, total: msg.total, uploaded: 0, failed: 0 });
        } else if (msg.type === 'progress') {
          setProgress({ current: msg.current, total: msg.total, uploaded: msg.uploaded, failed: msg.failed });
        } else if (msg.type === 'done') {
          final = msg as UploadResult;
        }
      };

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) handleLine(line);
      }
      if (buffer.trim()) handleLine(buffer);
      if (final) setResult(final);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const pct = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
        <h1 className="text-3xl font-normal text-ink">Bulk Upload Images</h1>
        <p className="mt-1 text-sm text-ink-2">
          Attach images to many products at once by naming them after the product SKU.
        </p>
      </div>

      {/* Step 1 — naming */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-em-50 text-sm font-semibold text-em">1</div>
          <div className="flex-1">
            <h2 className="text-base font-medium text-ink">Name your files by SKU</h2>
            <p className="mt-1 text-sm text-ink-2">Either layout works — folders are easiest if your images came from per-product folders.</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-bdr bg-gray-50 p-3">
                <p className="text-xs font-medium text-ink">Folders named by SKU</p>
                <pre className="mt-1.5 overflow-x-auto text-xs leading-relaxed text-ink-2">{`ASG-DRK-ISB-01/
  front.jpg      ← cover
  side.jpg
ASG-GRM-CHO-03/
  box.jpg        ← cover`}</pre>
                <p className="mt-1.5 text-xs text-ink-3">Rename only the folder. Files inside are used in name order.</p>
              </div>
              <div className="rounded-md border border-bdr bg-gray-50 p-3">
                <p className="text-xs font-medium text-ink">Files named by SKU</p>
                <pre className="mt-1.5 overflow-x-auto text-xs leading-relaxed text-ink-2">{`ASG-DRK-ISB-01.jpg    ← cover
ASG-DRK-ISB-01-2.jpg
ASG-DRK-ISB-01-3.jpg
ASG-GRM-CHO-03.jpg    ← cover`}</pre>
                <p className="mt-1.5 text-xs text-ink-3">The plain name is the cover; -2, -3 follow it.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 — rules */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-em-50 text-sm font-semibold text-em">2</div>
          <div className="flex-1">
            <h2 className="text-base font-medium text-ink">A few rules</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-2 list-disc pl-5">
              <li>Upload a <strong>.zip</strong>, or select the image files directly. JPG, PNG, WebP, AVIF and GIF are accepted.</li>
              <li>Each image must be under <strong>10MB</strong>. Images are converted to WebP/AVIF automatically on upload.</li>
              <li>Images are <strong>added</strong> to a product, never replacing what is already there.</li>
              <li>A product that already has a cover image <strong>keeps it</strong> — new images go after the existing ones.</li>
              <li>SKUs that don&apos;t match a product are reported below and nothing is uploaded for them.</li>
              <li>Running the same file twice will add the images <strong>again</strong> — it is not de-duplicated.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Step 3 — upload */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-em-50 text-sm font-semibold text-em">3</div>
          <div className="flex-1">
            <h2 className="text-base font-medium text-ink">Upload</h2>

            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-bdr-2 p-8 text-center transition hover:border-em">
              <input
                type="file"
                multiple
                accept=".zip,.jpg,.jpeg,.png,.webp,.avif,.gif,application/zip,image/*"
                className="hidden"
                onChange={(e) => reset(Array.from(e.target.files ?? []))}
              />
              <Images className="mb-2 h-8 w-8 text-ink-3" />
              {files.length > 0 ? (
                <span className="text-sm font-medium text-ink">
                  {files.length === 1 ? files[0]!.name : `${files.length} files selected`}
                </span>
              ) : (
                <span className="text-sm text-ink-2">Click to choose a .zip or image files</span>
              )}
            </label>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-md border-2 border-red-200 bg-red-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {loading && progress && progress.total > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">Uploading {progress.current} of {progress.total} images…</span>
                  <span className="text-ink-2">{pct}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-em transition-all duration-200" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1.5 flex gap-4 text-xs text-ink-2">
                  <span className="text-em">{progress.uploaded} uploaded</span>
                  {progress.failed > 0 && <span className="text-red-600">{progress.failed} failed</span>}
                </div>
              </div>
            )}

            {loading && !progress && (
              <p className="mt-4 text-sm text-ink-2">Reading the archive…</p>
            )}

            <Button
              onClick={onUpload}
              disabled={files.length === 0 || loading}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-em px-5 py-2.5 text-sm font-medium text-white hover:bg-em-600 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" /> {loading ? 'Uploading…' : 'Upload Images'}
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="rounded-md border-2 border-bdr bg-white p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-em" />
            <h2 className="text-base font-medium text-ink">Upload finished</h2>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-em-50 p-4">
              <p className="text-2xl font-semibold text-em">{result.uploaded}</p>
              <p className="text-xs text-ink-2">Images uploaded</p>
            </div>
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-2xl font-semibold text-ink">{result.productsTouched}</p>
              <p className="text-xs text-ink-2">Products updated</p>
            </div>
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-2xl font-semibold text-red-600">{result.errors.length}</p>
              <p className="text-xs text-ink-2">Failed</p>
            </div>
          </div>

          {result.unmatched.length > 0 && (
            <div className="mt-4 rounded-md border-2 border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">
                {result.unmatched.length} name{result.unmatched.length === 1 ? '' : 's'} matched no product
              </p>
              <p className="mt-1 break-words text-xs text-amber-800">{result.unmatched.join(', ')}</p>
              <p className="mt-1.5 text-xs text-amber-700">Check these against the SKU column in Products — nothing was uploaded for them.</p>
            </div>
          )}

          {result.skipped.length > 0 && (
            <div className="mt-3 rounded-md border border-bdr bg-gray-50 p-3">
              <p className="text-sm font-medium text-ink">{result.skipped.length} file(s) skipped</p>
              <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-ink-2">
                {result.skipped.map((s, i) => <li key={i}>{s.name} — {s.reason}</li>)}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-ink">Images that failed:</p>
              <div className="max-h-64 overflow-y-auto rounded-md border border-bdr">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-3 py-2 text-xs font-normal text-ink-2">SKU</th>
                      <th className="px-3 py-2 text-xs font-normal text-ink-2">File</th>
                      <th className="px-3 py-2 text-xs font-normal text-ink-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bdr">
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-ink-2">{e.sku}</td>
                        <td className="px-3 py-2 text-ink-2">{e.file}</td>
                        <td className="px-3 py-2 text-ink">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <Button
              onClick={() => router.push('/admin/products')}
              className="rounded-md bg-em px-5 py-2.5 text-sm font-medium text-white hover:bg-em-600"
            >
              View Products
            </Button>
            <Button variant="outline" onClick={() => reset([])} className="rounded-md px-5 py-2.5 text-sm">
              Upload more
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
