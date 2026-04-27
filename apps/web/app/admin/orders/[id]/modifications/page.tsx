'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

interface Modification {
  id: string;
  createdAt: string;
  modifiedBy: string | null;
  diffJson: Record<string, any>;
  reason: string | null;
}

export default function OrderModificationsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ['modifications', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/orders/${orderId}/modifications`);
      if (!response.ok) throw new Error('Failed to fetch modifications');
      return response.json() as Promise<{ success: boolean; data: Modification[] }>;
    },
  });

  const modifications = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">Modification History</h1>
          <p className="mt-1 text-sm text-ink-2">Track all changes made to this order</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-ink-2">Loading modifications...</p>
        </div>
      ) : modifications.length === 0 ? (
        <div className="border border-bdr rounded-lg p-12 text-center">
          <p className="text-ink-2">No modifications recorded for this order yet.</p>
          <p className="text-sm text-ink-2 mt-2">Any changes to the order will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {modifications.map((modification) => (
            <div key={modification.id} className="border border-bdr rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {new Date(modification.createdAt).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {modification.reason && (
                    <p className="text-sm text-ink-2 mt-1">{modification.reason}</p>
                  )}
                </div>
              </div>

              {Object.keys(modification.diffJson).length > 0 && (
                <div className="bg-elevated rounded-lg p-4">
                  <p className="text-xs font-semibold text-ink-2 uppercase mb-3">Changes</p>
                  <div className="space-y-2 text-sm">
                    {Object.entries(modification.diffJson).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2">
                        <span className="text-ink-2 font-mono min-w-max">{key}:</span>
                        <span className="text-ink font-semibold">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
