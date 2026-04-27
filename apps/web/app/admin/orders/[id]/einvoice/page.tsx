'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function OrderEInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [generating, setGenerating] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['einvoice', orderId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/admin/orders/${orderId}/einvoice`);
        if (response.status === 404) {
          return null; // No invoice yet
        }
        if (!response.ok) throw new Error('Failed to fetch e-invoice');
        return response.json() as Promise<{ success: boolean; data: any }>;
      } catch (error) {
        return null;
      }
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/orders/${orderId}/einvoice`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to generate e-invoice');
      return response.json();
    },
    onSuccess: () => {
      setGenerating(false);
      refetch();
    },
    onError: () => {
      setGenerating(false);
    },
  });

  const einvoice = data?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">E-Invoice</h1>
          <p className="mt-1 text-sm text-ink-2">GST e-invoice management</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-ink-2">Loading...</p>
        </div>
      ) : einvoice ? (
        <div className="space-y-6">
          {/* Generated E-Invoice */}
          <div className="border border-bdr rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-ink">Invoice Generated</h2>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-emerald-600 uppercase font-semibold">IRN (Invoice Registration Number)</p>
                  <p className="text-lg font-black text-emerald-900 mt-1">{einvoice.irn}</p>
                </div>
                {einvoice.ackNumber && (
                  <div>
                    <p className="text-xs text-emerald-600 uppercase font-semibold">Acknowledgement Number</p>
                    <p className="text-sm font-semibold text-emerald-900 mt-1">{einvoice.ackNumber}</p>
                  </div>
                )}
                {einvoice.ackDate && (
                  <div>
                    <p className="text-xs text-emerald-600 uppercase font-semibold">Acknowledged Date</p>
                    <p className="text-sm font-semibold text-emerald-900 mt-1">
                      {new Date(einvoice.ackDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {einvoice.qrPayload && (
              <div className="border border-bdr rounded-lg p-4 bg-elevated">
                <p className="text-xs text-ink-2 uppercase font-semibold mb-3">QR Code Data</p>
                <div className="bg-white p-3 rounded border border-bdr break-all text-xs font-mono">
                  {einvoice.qrPayload}
                </div>
              </div>
            )}

            <div className="text-sm text-ink-2 pt-4 border-t border-bdr">
              <p>Status: <span className="font-semibold text-ink">{einvoice.status}</span></p>
              <p className="mt-2">Generated on {new Date(einvoice.createdAt).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-bdr rounded-lg p-12 text-center space-y-4">
          <p className="text-ink-2">No e-invoice generated yet for this order.</p>
          <p className="text-sm text-ink-2">
            E-invoices are only available for B2B orders (GST Bill Type: B2B)
          </p>
          <Button
            onClick={() => {
              setGenerating(true);
              generateMutation.mutate();
            }}
            disabled={generateMutation.isPending || generating}
            className="rounded-2xl bg-em px-6 py-2 font-bold hover:bg-em-600"
          >
            {generateMutation.isPending || generating ? 'Generating...' : 'Generate E-Invoice'}
          </Button>
        </div>
      )}
    </div>
  );
}
