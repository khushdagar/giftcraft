'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

interface ClientDetail {
  id: string;
  name: string;
  email: string;
  gstin: string | null;
  pan: string | null;
  tier: string;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  website: string | null;
  users: Array<{ id: string; email: string; name: string | null; role: string }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
}

function getTierBadgeColor(tier: string) {
  const colors: Record<string, string> = {
    standard: 'bg-gray-100 text-gray-700',
    silver: 'bg-blue-100 text-blue-700',
    gold: 'bg-amber-100 text-amber-700',
    platinum: 'bg-purple-100 text-purple-700',
  };
  return colors[tier] || colors.standard;
}

export default function AdminClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clientId = params.id as string;

  const [selectedTier, setSelectedTier] = useState<string>('');
  const [editingTier, setEditingTier] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/clients/${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch client');
      return response.json() as Promise<ClientDetail>;
    },
    enabled: !!clientId,
  });

  const updateTierMutation = useMutation({
    mutationFn: async (tier: string) => {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      if (!response.ok) throw new Error('Failed to update tier');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      setEditingTier(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-ink-2">Loading...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-ink-2">Client not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8 border-b border-bdr pb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-ink">{client.name}</h1>
                <p className="mt-1 text-sm text-ink-2">{client.email}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Details */}
          <div className="border border-bdr rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-ink">Company Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-ink-2 uppercase font-semibold">GSTIN</p>
                <p className="text-sm text-ink mt-1">{client.gstin || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-2 uppercase font-semibold">PAN</p>
                <p className="text-sm text-ink mt-1">{client.pan || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-2 uppercase font-semibold">Phone</p>
                <p className="text-sm text-ink mt-1">{client.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-2 uppercase font-semibold">Website</p>
                <p className="text-sm text-ink mt-1">
                  {client.website ? (
                    <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-em hover:underline">
                      {client.website}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </p>
              </div>
            </div>

            {/* Address */}
            {(client.addressLine || client.city || client.state) && (
              <div className="pt-4 border-t border-bdr">
                <p className="text-xs text-ink-2 uppercase font-semibold">Address</p>
                <p className="text-sm text-ink mt-2">
                  {client.addressLine && <div>{client.addressLine}</div>}
                  {(client.city || client.state || client.pincode) && (
                    <div>
                      {client.city && <span>{client.city}</span>}
                      {client.state && <span>{client.state && client.city ? ', ' : ''}{client.state}</span>}
                      {client.pincode && <span> {client.pincode}</span>}
                    </div>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Team Members */}
          {client.users.length > 0 && (
            <div className="border border-bdr rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-bold text-ink">Team Members ({client.users.length})</h2>
              <div className="divide-y divide-bdr">
                {client.users.map((user) => (
                  <div key={user.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink">{user.name || 'Unnamed'}</p>
                      <p className="text-xs text-ink-2">{user.email}</p>
                    </div>
                    <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders */}
          {client.orders.length > 0 && (
            <div className="border border-bdr rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-bold text-ink">Recent Orders ({client.orders.length})</h2>
              <div className="divide-y divide-bdr">
                {client.orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link href={`/admin/orders/${order.id}`} className="text-sm font-medium text-em hover:underline">
                          {order.orderNumber}
                        </Link>
                        <p className="text-xs text-ink-2">
                          {new Date(order.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-ink">₹{order.totalAmount.toLocaleString('en-IN')}</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold capitalize mt-1 ${
                          order.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : order.status === 'shipped'
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {client.orders.length > 5 && (
                <div className="pt-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/orders?clientId=${client.id}`}>View All Orders</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tier Card */}
          <div className="border border-bdr rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-ink">Membership Tier</h2>
            <div className={`p-4 rounded-lg ${getTierBadgeColor(client.tier)}`}>
              <p className="text-sm font-bold uppercase tracking-wider">{client.tier}</p>
            </div>

            {editingTier ? (
              <div className="space-y-3">
                <select
                  value={selectedTier || client.tier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full border border-bdr rounded-lg px-3 py-2 text-sm"
                >
                  <option value="standard">Standard</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-em hover:bg-em-600"
                    onClick={() =>
                      updateTierMutation.mutate(selectedTier || client.tier)
                    }
                    disabled={updateTierMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingTier(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedTier(client.tier);
                  setEditingTier(true);
                }}
              >
                Change Tier
              </Button>
            )}
          </div>

          {/* Stats Card */}
          <div className="border border-bdr rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-ink">Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-ink-2">Total Orders</p>
                <p className="text-2xl font-black text-em">{client.orders.length}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-ink-2">Total Spent</p>
                <p className="text-lg font-bold text-ink">
                  ₹{client.orders.reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
