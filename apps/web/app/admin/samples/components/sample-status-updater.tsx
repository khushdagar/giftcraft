'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUSES = ['requested', 'approved', 'shipped', 'rejected'] as const;

interface SampleStatusUpdaterProps {
  sampleId: string;
  currentStatus: string;
}

export function SampleStatusUpdater({ sampleId, currentStatus }: SampleStatusUpdaterProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (next: string) => {
    const previous = status;
    setStatus(next);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/samples/${sampleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setStatus(previous);
        setError(data.error || 'Failed to update');
        return;
      }

      router.refresh();
    } catch (err) {
      setStatus(previous);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={status}
        disabled={isLoading}
        onChange={(e) => handleChange(e.target.value)}
        className="px-3 py-2 rounded-md border-2 border-bdr text-sm focus:border-navy-800 focus:outline-none disabled:opacity-50 capitalize"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s} className="capitalize">
            {s}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-err">{error}</p>}
    </div>
  );
}
