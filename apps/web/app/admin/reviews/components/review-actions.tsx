'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ReviewActionsProps {
  reviewId: string;
  currentStatus: string;
}

export function ReviewActions({ reviewId, currentStatus }: ReviewActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async (fn: () => Promise<Response>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fn();
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Failed to update');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const setStatus = (status: string) =>
    call(() =>
      fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    );

  const handleDelete = () => {
    if (!window.confirm('Delete this review permanently?')) return;
    call(() => fetch(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' }));
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {currentStatus !== 'approved' && (
          <button
            type="button"
            onClick={() => setStatus('approved')}
            disabled={isLoading}
            className="rounded-md border border-em px-3 py-1.5 text-xs font-medium text-em transition hover:bg-em-50 disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {currentStatus !== 'rejected' && (
          <button
            type="button"
            onClick={() => setStatus('rejected')}
            disabled={isLoading}
            className="rounded-md border border-bdr px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:bg-elevated disabled:opacity-50"
          >
            Reject
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isLoading}
          className="rounded-md border border-err px-3 py-1.5 text-xs font-medium text-err transition hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      {error && <p className="text-xs text-err">{error}</p>}
    </div>
  );
}
