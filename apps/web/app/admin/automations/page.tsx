'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  isActive: boolean;
  createdAt: string;
}

function getTriggerLabel(trigger: string) {
  const labels: Record<string, string> = {
    order_placed: 'Order Placed',
    order_confirmed: 'Order Confirmed',
    order_shipped: 'Order Shipped',
    order_delivered: 'Order Delivered',
    order_cancelled: 'Order Cancelled',
    dispute_opened: 'Dispute Opened',
    quote_created: 'Quote Created',
    quote_expired: 'Quote Expired',
    payment_received: 'Payment Received',
    mockup_uploaded: 'Mockup Uploaded',
  };
  return labels[trigger] || trigger;
}

function getActionLabel(action: string) {
  const labels: Record<string, string> = {
    send_email: 'Send Email',
    send_whatsapp: 'Send WhatsApp',
    notify_admin: 'Notify Admin',
    update_order_status: 'Update Order Status',
  };
  return labels[action] || action;
}

export default function AdminAutomationsPage() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: async () => {
      const res = await fetch('/api/admin/automations');
      if (!res.ok) throw new Error('Failed to fetch automations');
      return res.json() as Promise<{ success: boolean; data: AutomationRule[] }>;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (rule: AutomationRule) => {
      const res = await fetch(`/api/admin/automations/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update automation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/automations/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete automation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      setDeletingId(null);
    },
  });

  const rules = response?.data || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8 border-b border-bdr pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-ink">Automations</h1>
            <p className="mt-1 text-sm text-ink-2">{rules.length} rules configured</p>
          </div>
          <Button asChild className="rounded-2xl bg-em px-6 py-2 font-bold hover:bg-em-600">
            <Link href="/admin/automations/new">+ New Rule</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-ink-2">Loading automations...</p>
        </div>
      ) : rules.length === 0 ? (
        <div className="border border-bdr rounded-lg p-12 text-center">
          <p className="text-ink-2 mb-4">No automation rules configured yet</p>
          <Button asChild className="rounded-2xl bg-em px-6 py-2 font-bold">
            <Link href="/admin/automations/new">Create First Rule</Link>
          </Button>
        </div>
      ) : (
        <div className="border border-bdr rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-elevated border-b border-bdr">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Trigger</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Action</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-ink-2 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bdr">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-canvas">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-ink">{rule.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
                      {getTriggerLabel(rule.trigger)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                      {getActionLabel(rule.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleMutation.mutate(rule)}
                      disabled={toggleMutation.isPending}
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                        rule.isActive
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href={`/admin/automations/${rule.id}`}>Edit</Link>
                    </Button>
                    {deletingId === rule.id ? (
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deleteMutation.mutate(rule.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingId(rule.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
