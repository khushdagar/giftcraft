'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface DisputeStatusUpdaterProps {
  disputeId: string;
  currentStatus: string;
  currentResolutionNote: string | null;
}

export function DisputeStatusUpdater({
  disputeId,
  currentStatus,
  currentResolutionNote,
}: DisputeStatusUpdaterProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [resolutionNote, setResolutionNote] = useState(currentResolutionNote || '');

  const handleStatusChange = async () => {
    if (status === 'resolved' && !resolutionNote.trim()) {
      toast.error('Resolution note is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          resolutionNote: status === 'resolved' ? resolutionNote : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to update dispute');
        return;
      }

      toast.success('Dispute updated successfully');
      router.refresh();
    } catch (error) {
      toast.error('Error updating dispute');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'open', label: 'Open', color: 'bg-sky-50 text-sky-700' },
    { value: 'under_review', label: 'Under Review', color: 'bg-amber-50 text-amber-700' },
    { value: 'resolved', label: 'Resolved', color: 'bg-em-50 text-em-700' },
    { value: 'closed', label: 'Closed', color: 'bg-recessed text-ink-2' },
  ];

  return (
    <div className="border border-bdr rounded-lg p-6 bg-canvas">
      <h3 className="text-lg font-bold text-ink mb-6">Update Status</h3>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-ink mb-3">Status</label>
        <div className="grid grid-cols-4 gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatus(option.value)}
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition ${
                status === option.value
                  ? `${option.color} ring-2 ring-offset-2 ring-ink`
                  : 'bg-elevated text-ink hover:bg-recessed'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {status === 'resolved' && (
        <div className="mb-6">
          <label className="block text-sm font-semibold text-ink mb-2">Resolution Note *</label>
          <Textarea
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder="Explain how the dispute was resolved, any compensation offered, etc."
            rows={5}
            required
          />
          <p className="text-xs text-ink-2 mt-2">This will be sent to the customer</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleStatusChange}
          disabled={loading}
          className="bg-em px-6 font-bold rounded-2xl"
        >
          {loading ? 'Updating...' : 'Update Dispute'}
        </Button>
      </div>
    </div>
  );
}
