'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { z } from 'zod';

const UpdateSchema = z.object({
  status: z.enum(['open', 'under_review', 'resolved', 'closed']),
  resolutionNote: z.string().min(10).max(1000).optional(),
});

interface DisputeStatusUpdaterProps {
  disputeId: string;
  currentStatus: string;
  orderNumber: string;
}

export function DisputeStatusUpdater({
  disputeId,
  currentStatus,
  orderNumber,
}: DisputeStatusUpdaterProps) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = { status, resolutionNote: note || undefined };
      const validation = UpdateSchema.safeParse(payload);

      if (!validation.success) {
        setError(validation.error.errors[0]?.message || 'Invalid input');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/disputes/${disputeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error?.message || 'Failed to update dispute');
        return;
      }

      setSuccess(true);
      setNote('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-md border-2 border-bdr bg-white p-5 space-y-4">
      <div>
        <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-3">Update Status</p>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-4 py-2 rounded-md border-2 border-bdr focus:border-navy-800 focus:outline-none"
        >
          <option value="open">Open</option>
          <option value="under_review">Under Review</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {(status === 'resolved' || status === 'closed') && (
        <div>
          <label className="block text-xs font-normal uppercase tracking-wider text-ink-3 mb-2">
            Resolution Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain how this dispute was resolved..."
            rows={4}
            className="w-full px-4 py-2 rounded-md border-2 border-bdr focus:border-navy-800 focus:outline-none resize-none"
          />
          {note.length < 10 && note.length > 0 && (
            <p className="text-xs text-err mt-1">Minimum 10 characters</p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-err/10 p-3">
          <p className="text-xs text-err">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-emerald-50 border-2 border-emerald-200 p-3">
          <p className="text-xs text-emerald-700 font-normal">Dispute updated successfully</p>
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Updating...' : 'Update Dispute'}
      </Button>
    </form>
  );
}
