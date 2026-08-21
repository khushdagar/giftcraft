'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';

interface RedirectRow {
  id: string;
  source: string;
  destination: string;
  statusCode: number;
  isActive: boolean;
  note: string | null;
  updatedAt: string;
}

interface UploadResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: { row: number; url: string; message: string }[];
}

const TYPES = [
  { value: 301, label: 'Permanent (301)', hint: 'The page moved for good — passes ranking to the new URL' },
  { value: 302, label: 'Temporary (302)', hint: 'The old URL is coming back — keeps ranking where it is' },
  { value: 410, label: 'Gone (410)', hint: 'Deliberately removed, no replacement — drops out of Google faster' },
];

const typeLabel = (code: number) => TYPES.find((t) => t.value === code)?.label ?? `${code}`;

const typeStyle = (code: number) =>
  code === 301
    ? 'bg-em-50 text-em'
    : code === 302
      ? 'bg-amber-50 text-amber-700'
      : 'bg-gray-100 text-ink-2';

export function RedirectsManager({ redirects }: { redirects: RedirectRow[] }) {
  const router = useRouter();

  // ── Single add ──
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [statusCode, setStatusCode] = useState(301);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addOk, setAddOk] = useState<string | null>(null);

  // ── Bulk upload ──
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  // ── Table ──
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<RedirectRow | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return redirects;
    return redirects.filter(
      (r) =>
        r.source.includes(q) ||
        r.destination.includes(q) ||
        (r.note ?? '').toLowerCase().includes(q)
    );
  }, [redirects, query]);

  const addRedirect = async () => {
    setSaving(true);
    setAddError(null);
    setAddOk(null);
    try {
      const res = await fetch('/api/admin/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, destination, statusCode, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save the redirect');
      setAddOk(`${data.redirect.source} is now redirecting.`);
      setSource('');
      setDestination('');
      setNote('');
      router.refresh();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Could not save the redirect');
    } finally {
      setSaving(false);
    }
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/redirects/bulk-upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResult(data);
      setFile(null);
      router.refresh();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const patchRow = async (row: RedirectRow, body: Record<string, unknown>) => {
    setBusyId(row.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/admin/redirects/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update the redirect');
      setEditing(null);
      router.refresh();
    } catch (e) {
      setRowError(e instanceof Error ? e.message : 'Could not update the redirect');
    } finally {
      setBusyId(null);
    }
  };

  const deleteRow = async (row: RedirectRow) => {
    if (!confirm(`Delete the redirect for ${row.source}? The old URL will go back to showing a 404.`)) {
      return;
    }
    setBusyId(row.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/admin/redirects/${row.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not delete the redirect');
      }
      router.refresh();
    } catch (e) {
      setRowError(e instanceof Error ? e.message : 'Could not delete the redirect');
    } finally {
      setBusyId(null);
    }
  };

  const input =
    'w-full rounded-md border-2 border-bdr px-3 py-2 text-sm text-ink outline-none focus:border-em';

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-normal text-ink">URL Redirects</h1>
        <p className="mt-1 text-sm text-ink-2">
          Send old URLs that Google still has indexed to the right page. Changes go live within a
          minute — no deploy needed.
        </p>
      </div>

      {/* ── Add one ── */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <h2 className="text-base font-medium text-ink">Add a redirect</h2>
        <p className="mt-1 text-sm text-ink-2">
          Paste the 404 URL from Search Console — a full{' '}
          <code className="rounded bg-gray-50 px-1 py-0.5 text-xs">https://…</code> link works, only
          the path is kept.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Old URL (404)</label>
            <input
              className={input}
              placeholder="/old-corporate-gifts"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">
              New URL {statusCode === 410 && <span className="text-ink-3">— not needed for Gone</span>}
            </label>
            <input
              className={input}
              placeholder="/catalog"
              value={destination}
              disabled={statusCode === 410}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Type</label>
            <select
              className={input}
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value))}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-3">
              {TYPES.find((t) => t.value === statusCode)?.hint}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Note (optional)</label>
            <input
              className={input}
              placeholder="GSC 404 report, Aug 2026"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {addError && (
          <div className="mt-3 flex items-start gap-2 rounded-md border-2 border-red-200 bg-red-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{addError}</p>
          </div>
        )}
        {addOk && (
          <div className="mt-3 flex items-start gap-2 rounded-md border-2 border-em bg-em-50 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-em" />
            <p className="text-sm text-ink">{addOk}</p>
          </div>
        )}

        <Button
          onClick={addRedirect}
          disabled={saving || !source.trim() || (statusCode !== 410 && !destination.trim())}
          className="mt-4 rounded-md bg-em px-5 py-2.5 text-sm font-medium text-white hover:bg-em-600"
        >
          {saving ? 'Saving…' : 'Add redirect'}
        </Button>
      </div>

      {/* ── Bulk upload ── */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <h2 className="text-base font-medium text-ink">Upload a sheet</h2>
        <p className="mt-1 text-sm text-ink-2">
          For a whole GSC export. One row per URL, in a .csv or .xlsx file. Columns:{' '}
          <strong>Old URL</strong>, <strong>New URL</strong>, <strong>Type</strong>,{' '}
          <strong>Note</strong>. A URL that already has a redirect is updated, so a corrected sheet
          can just be re-uploaded.
        </p>

        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href="/api/admin/redirects/bulk-upload/template"
            className="inline-flex items-center gap-2 rounded-md border-2 border-bdr px-4 py-2 text-sm font-medium text-ink transition hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Download template
          </a>
          <a
            href="/api/admin/redirects/export"
            className="inline-flex items-center gap-2 rounded-md border-2 border-bdr px-4 py-2 text-sm font-medium text-ink transition hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Export current redirects
          </a>
        </div>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-bdr-2 p-8 text-center transition hover:border-em">
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
              setUploadError(null);
            }}
          />
          <FileSpreadsheet className="mb-2 h-8 w-8 text-ink-3" />
          {file ? (
            <span className="text-sm font-medium text-ink">{file.name}</span>
          ) : (
            <span className="text-sm text-ink-2">Click to choose a .csv or .xlsx file</span>
          )}
        </label>

        {uploadError && (
          <div className="mt-3 flex items-start gap-2 rounded-md border-2 border-red-200 bg-red-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{uploadError}</p>
          </div>
        )}

        {file && (
          <Button
            onClick={upload}
            disabled={uploading}
            className="mt-4 rounded-md bg-em px-5 py-2.5 text-sm font-medium text-white hover:bg-em-600"
          >
            {uploading ? 'Importing…' : 'Import redirects'}
          </Button>
        )}

        {result && (
          <div className="mt-5">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="rounded-md bg-gray-50 p-4">
                <p className="text-2xl font-semibold text-ink">{result.total}</p>
                <p className="text-xs text-ink-2">Rows</p>
              </div>
              <div className="rounded-md bg-em-50 p-4">
                <p className="text-2xl font-semibold text-em">{result.created}</p>
                <p className="text-xs text-ink-2">Added</p>
              </div>
              <div className="rounded-md bg-gray-50 p-4">
                <p className="text-2xl font-semibold text-ink">{result.updated}</p>
                <p className="text-xs text-ink-2">Updated</p>
              </div>
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-2xl font-semibold text-red-600">{result.failed}</p>
                <p className="text-xs text-ink-2">Skipped</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-ink">Rows not imported:</p>
                <div className="max-h-64 overflow-y-auto rounded-md border border-bdr">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-3 py-2 text-xs font-normal text-ink-2">Row</th>
                        <th className="px-3 py-2 text-xs font-normal text-ink-2">Old URL</th>
                        <th className="px-3 py-2 text-xs font-normal text-ink-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bdr">
                      {result.errors.map((e, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-ink-2">{e.row || '—'}</td>
                          <td className="px-3 py-2 break-all text-ink-2">{e.url || '—'}</td>
                          <td className="px-3 py-2 text-ink">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Existing rules ── */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium text-ink">
            Live redirects <span className="text-ink-3">({redirects.length})</span>
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              className="w-64 rounded-md border-2 border-bdr py-2 pl-9 pr-3 text-sm outline-none focus:border-em"
              placeholder="Search URLs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {rowError && (
          <div className="mt-3 flex items-start gap-2 rounded-md border-2 border-red-200 bg-red-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{rowError}</p>
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="mt-6 text-sm text-ink-2">
            {redirects.length === 0
              ? 'No redirects yet. Add one above, or upload a sheet.'
              : 'No redirect matches that search.'}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-bdr">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 text-xs font-normal text-ink-2">Old URL</th>
                  <th className="px-3 py-2 text-xs font-normal text-ink-2">New URL</th>
                  <th className="px-3 py-2 text-xs font-normal text-ink-2">Type</th>
                  <th className="px-3 py-2 text-xs font-normal text-ink-2">Live</th>
                  <th className="px-3 py-2 text-xs font-normal text-ink-2">Note</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-bdr">
                {filtered.map((row) =>
                  editing?.id === row.id ? (
                    <tr key={row.id} className="bg-gray-50">
                      <td className="px-3 py-2">
                        <input
                          className={input}
                          value={editing.source}
                          onChange={(e) => setEditing({ ...editing, source: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className={input}
                          value={editing.destination}
                          disabled={editing.statusCode === 410}
                          onChange={(e) => setEditing({ ...editing, destination: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className={input}
                          value={editing.statusCode}
                          onChange={(e) =>
                            setEditing({ ...editing, statusCode: Number(e.target.value) })
                          }
                        >
                          {TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-ink-3">—</td>
                      <td className="px-3 py-2">
                        <input
                          className={input}
                          value={editing.note ?? ''}
                          onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <button
                          onClick={() =>
                            patchRow(row, {
                              source: editing.source,
                              destination: editing.destination,
                              statusCode: editing.statusCode,
                              note: editing.note,
                            })
                          }
                          disabled={busyId === row.id}
                          className="mr-2 rounded-md bg-em px-3 py-1.5 text-xs font-medium text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditing(null);
                            setRowError(null);
                          }}
                          className="rounded-md border-2 border-bdr px-3 py-1.5 text-xs text-ink"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.id} className={row.isActive ? '' : 'opacity-60'}>
                      <td className="px-3 py-2 break-all font-medium text-ink">{row.source}</td>
                      <td className="px-3 py-2 break-all text-ink-2">
                        {row.statusCode === 410 ? (
                          <span className="text-ink-3">— removed for good</span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <ArrowRight className="h-3 w-3 shrink-0 text-ink-3" />
                            {row.destination}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeStyle(row.statusCode)}`}
                        >
                          {typeLabel(row.statusCode)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => patchRow(row, { isActive: !row.isActive })}
                          disabled={busyId === row.id}
                          title={row.isActive ? 'Switch off' : 'Switch on'}
                          className={`h-5 w-9 rounded-full transition ${row.isActive ? 'bg-em' : 'bg-gray-300'}`}
                        >
                          <span
                            className={`block h-4 w-4 rounded-full bg-white transition ${row.isActive ? 'translate-x-4' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-ink-3">{row.note || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <button
                          onClick={() => {
                            setEditing(row);
                            setRowError(null);
                          }}
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
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <details className="mt-4 text-sm text-ink-2">
          <summary className="cursor-pointer font-medium text-ink">
            How these rules work — worth reading once
          </summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              Only the path is matched. Query strings (<code>?utm_source=…</code>) are ignored on the
              old URL and carried over to the new one automatically.
            </li>
            <li>
              A trailing <code>/*</code> moves a whole folder:{' '}
              <code>/blog/*</code> → <code>/insights/*</code> sends{' '}
              <code>/blog/gift-ideas</code> to <code>/insights/gift-ideas</code>.
            </li>
            <li>
              Chains are refused. If B is already redirected, a new A → B is rejected — point A at
              the final URL instead, since every extra hop loses ranking signal.
            </li>
            <li>
              Use <strong>Gone (410)</strong> when a page is deliberately dead with no replacement.
              Redirecting everything to the homepage instead is treated by Google as a soft 404 and
              does not help.
            </li>
            <li>Switching a rule off leaves it in the list but stops it redirecting.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
