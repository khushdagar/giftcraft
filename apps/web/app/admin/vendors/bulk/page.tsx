'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Upload, CheckCircle2 } from 'lucide-react';
import { VENDOR_SEED, type SeedVendor } from './vendor-seed';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  to_approach: 'To Approach',
  onboarding: 'Onboarding',
  onboarded: 'Onboarded',
};

type ImportResult = {
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  skipped: { name: string; reason: string }[];
  errors: { name: string; reason: string }[];
};

export default function BulkVendorsPage() {
  const router = useRouter();
  const [json, setJson] = useState(JSON.stringify(VENDOR_SEED, null, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Parse the textarea so the preview always reflects what will be sent.
  let parsed: SeedVendor[] = [];
  let parseError: string | null = null;
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) throw new Error('Expected a JSON array of vendors');
    parsed = data;
  } catch (e: any) {
    parseError = e.message;
  }

  const handleImport = async () => {
    if (parseError) {
      toast.error('Fix the JSON before importing');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/vendors/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendors: parsed }),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error || 'Failed to import vendors');
        return;
      }
      setResult(body.data);
      toast.success(`Imported ${body.data.createdCount} vendor(s)`);
    } catch (e) {
      toast.error('Error importing vendors');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/admin/vendors" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to Vendors
        </Link>
        <h1 className="mt-3 text-3xl font-normal tracking-tight text-ink">Bulk Import Vendors</h1>
        <p className="mt-2 text-sm text-ink-2">
          Pre-loaded with {VENDOR_SEED.length} vendors from the Vendor Master sheet. Review or edit the
          list below, then import. Vendors whose code already exists are skipped automatically, so it&apos;s
          safe to re-run.
        </p>
      </div>

      {result ? (
        <div className="rounded-md border-2 border-bdr bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 text-ink">
            <CheckCircle2 className="h-5 w-5 text-em" />
            <h2 className="text-lg font-medium">Import complete</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-md bg-em-50 p-4 text-center">
              <div className="text-2xl font-semibold text-em-700">{result.createdCount}</div>
              <div className="text-xs text-ink-2 uppercase">Created</div>
            </div>
            <div className="rounded-md bg-gold-50 p-4 text-center">
              <div className="text-2xl font-semibold text-gold-700">{result.skippedCount}</div>
              <div className="text-xs text-ink-2 uppercase">Skipped</div>
            </div>
            <div className="rounded-md bg-gray-50 p-4 text-center">
              <div className="text-2xl font-semibold text-ink">{result.errorCount}</div>
              <div className="text-xs text-ink-2 uppercase">Errors</div>
            </div>
          </div>
          {result.skipped.length > 0 && (
            <div className="text-sm text-ink-2">
              <p className="font-medium text-ink mb-1">Skipped</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {result.skipped.map((s, i) => (
                  <li key={i}>{s.name} — {s.reason}</li>
                ))}
              </ul>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="text-sm text-error">
              <p className="font-medium mb-1">Errors</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {result.errors.map((s, i) => (
                  <li key={i}>{s.name} — {s.reason}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button onClick={() => router.push('/admin/vendors')} className="rounded-2xl bg-em px-6 font-normal hover:bg-em-600">
              View Vendors
            </Button>
            <Button variant="outline" onClick={() => setResult(null)} className="rounded-2xl">
              Import More
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-md border-2 border-bdr overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b-2 border-bdr">
              <span className="text-sm font-medium text-ink">
                Preview {parseError ? '' : `(${parsed.length})`}
              </span>
              <Button
                onClick={handleImport}
                disabled={loading || !!parseError || parsed.length === 0}
                className="rounded-2xl bg-em px-6 font-normal hover:bg-em-600"
              >
                <Upload className="mr-2 h-4 w-4" />
                {loading ? 'Importing...' : `Import ${parsed.length} Vendor${parsed.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
            {parseError ? (
              <div className="p-6 text-sm text-error">Invalid JSON: {parseError}</div>
            ) : (
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white border-b border-bdr sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-normal text-ink-2 uppercase">Code</th>
                      <th className="px-4 py-2 text-left text-xs font-normal text-ink-2 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-normal text-ink-2 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-normal text-ink-2 uppercase">City</th>
                      <th className="px-4 py-2 text-left text-xs font-normal text-ink-2 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bdr">
                    {parsed.map((v, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-ink-2">{v.code || '—'}</td>
                        <td className="px-4 py-2 text-ink">{v.name}</td>
                        <td className="px-4 py-2 text-ink-2">{v.type || '—'}</td>
                        <td className="px-4 py-2 text-ink-2">{v.city || '—'}</td>
                        <td className="px-4 py-2 text-ink-2">
                          {STATUS_LABELS[v.onboardingStatus] || v.onboardingStatus || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">Vendor data (JSON)</label>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              spellCheck={false}
              rows={16}
              className="w-full rounded-md border-2 border-bdr p-3 font-mono text-xs text-ink"
            />
            <p className="mt-1 text-xs text-ink-3">
              Edit the array above to add, remove, or adjust vendors before importing.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
