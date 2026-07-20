'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock } from 'lucide-react';
import { SLA_MINUTES } from '@/lib/constants';

// Display order + labels for each order stage. SLA_MINUTES (defaults) drives the
// initial values; saved overrides from the DB are layered on top.
const STAGES: { key: string; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'quote_sent', label: 'Quote Sent' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'mockup_pending', label: 'Mockup Pending' },
  { key: 'mockup_approved', label: 'Mockup Approved' },
  { key: 'payment_pending', label: 'Payment Pending' },
  { key: 'production', label: 'Production' },
  { key: 'quality_check', label: 'Quality Check' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
];

// Terminal stages have no SLA — shown read-only for clarity.
const TERMINAL = ['completed', 'cancelled', 'refunded'];

function humanize(minutes: number): string {
  if (!minutes || minutes <= 0) return 'No SLA';
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
  const days = hours / 24;
  return `${Number.isInteger(days) ? days : days.toFixed(1)} day${days === 1 ? '' : 's'}`;
}

export default function SlaSettingsPage() {
  const [values, setValues] = useState<Record<string, number>>({ ...SLA_MINUTES });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load saved overrides and layer them onto the defaults.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) return;
        const grouped = await res.json();
        const sla = (grouped.sla || {}) as Record<string, unknown>;
        setValues((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(sla)) {
            const status = k.replace(/^sla\./, '');
            const n = Number(v);
            if (Number.isFinite(n)) next[status] = n;
          }
          return next;
        });
      } catch {
        /* keep defaults on failure */
      }
    })();
  }, []);

  const handleChange = (key: string, raw: string) => {
    const n = parseInt(raw, 10);
    setValues((prev) => ({ ...prev, [key]: Number.isFinite(n) && n >= 0 ? n : 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Persist every stage (editable + terminal) so the config is complete.
      const data: Record<string, number> = {};
      for (const s of STAGES) data[s.key] = values[s.key] ?? 0;
      for (const t of TERMINAL) data[t] = values[t] ?? 0;

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'sla', data }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save SLA settings');
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/admin/settings" className="text-sm text-em hover:underline mb-4 block">
          ← Back to Settings
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-em-400" />
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Operations</p>
        </div>
        <h1 className="text-3xl font-normal text-ink">SLA Targets</h1>
        <p className="text-sm text-ink-2 mt-2">
          Set how long (in minutes) an order may stay in each stage before it is flagged as breached.
          Changes apply within ~30 seconds — no redeploy needed.
        </p>
      </div>

      <div className="max-w-2xl">
        {success && (
          <div className="mb-6 p-4 rounded-md bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-green-700">✓ SLA targets saved</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-bdr rounded-md p-6">
          <div className="space-y-3">
            {STAGES.map((stage) => (
              <div key={stage.key} className="flex items-center gap-4">
                <label className="w-40 text-sm font-medium text-ink">{stage.label}</label>
                <Input
                  type="number"
                  min={0}
                  value={values[stage.key] ?? 0}
                  onChange={(e) => handleChange(stage.key, e.target.value)}
                  className="rounded-md w-32"
                />
                <span className="text-xs text-ink-3">minutes · {humanize(values[stage.key] ?? 0)}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-bdr">
            <p className="text-xs text-ink-3">
              Terminal stages ({TERMINAL.join(', ')}) have no SLA and are always 0.
            </p>
          </div>

          <div className="flex gap-3 pt-6 border-t border-bdr">
            <Button type="submit" disabled={loading} className="rounded-md">
              {loading ? 'Saving...' : 'Save SLA Targets'}
            </Button>
            <Link href="/admin/settings">
              <Button type="button" variant="outline" className="rounded-md">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
