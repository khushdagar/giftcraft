'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Communication {
  id: string;
  type: string;
  note: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdAt: string;
}

export function VendorCommunicationsTab({ vendorId }: { vendorId: string }) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'call' as const,
    note: '',
  });

  useEffect(() => {
    fetchCommunications();
  }, [vendorId]);

  const fetchCommunications = async () => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/communications`);
      const { data } = await response.json();
      setCommunications(data.communications);
    } catch (error) {
      toast.error('Failed to fetch communications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to add communication');
        return;
      }

      toast.success('Communication logged');
      setFormData({ type: 'call', note: '' });
      setShowForm(false);
      fetchCommunications();
    } catch (error) {
      toast.error('Error logging communication');
      console.error(error);
    }
  };

  if (loading) return <div className="text-center py-8 text-ink-2">Loading communications...</div>;

  const typeIcons: Record<string, string> = {
    call: '📞',
    email: '📧',
    whatsapp: '💬',
    meeting: '🤝',
    note: '📝',
  };

  const typeColors: Record<string, string> = {
    call: 'bg-sky-50 text-sky-700',
    email: 'bg-indigo-50 text-indigo-700',
    whatsapp: 'bg-em-50 text-em-700',
    meeting: 'bg-violet-50 text-violet-700',
    note: 'bg-recessed text-ink-2',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-ink">Communication Log</h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="rounded-2xl bg-em px-6 font-bold"
        >
          {showForm ? 'Cancel' : '+ Log Communication'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-bdr rounded-lg p-6 bg-canvas">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-ink mb-2">Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-bdr rounded-md text-sm bg-white"
            >
              <option value="call">📞 Call</option>
              <option value="email">📧 Email</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="meeting">🤝 Meeting</option>
              <option value="note">📝 Note</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-ink mb-2">Details *</label>
            <Textarea
              value={formData.note}
              onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Summary of communication, outcomes, action items, etc."
              rows={4}
              required
            />
          </div>

          <Button type="submit" className="rounded-2xl bg-em px-6 font-bold">
            Log Communication
          </Button>
        </form>
      )}

      <div className="space-y-3">
        {communications.length === 0 ? (
          <div className="text-center py-8 text-ink-2">No communication records yet</div>
        ) : (
          communications.map((comm) => (
            <div key={comm.id} className="border border-bdr rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="text-2xl">{typeIcons[comm.type] || '📌'}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${typeColors[comm.type]}`}>
                      {comm.type.replace('_', ' ').charAt(0).toUpperCase() + comm.type.slice(1)}
                    </span>
                    <span className="text-xs text-ink-2">
                      {new Date(comm.createdAt).toLocaleDateString('en-IN')} {new Date(comm.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-ink whitespace-pre-wrap mb-2">{comm.note}</p>
                  <p className="text-xs text-ink-2">
                    by {comm.createdBy?.name || comm.createdBy?.email || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
