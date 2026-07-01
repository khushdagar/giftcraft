'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Star, Trash2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { INDIAN_STATES } from '@/lib/constants';

interface SavedAddress {
  id: string;
  label: string | null;
  contactName: string;
  company: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string | null;
  isDefault: boolean;
}

interface FormValues {
  label: string;
  contactName: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

const emptyForm: FormValues = {
  label: '',
  contactName: '',
  company: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  isDefault: false,
};

/**
 * Self-contained saved-addresses CRUD (list + add/edit/delete/set-default).
 * Rendered both on the standalone /dashboard/addresses page and inside the
 * consolidated profile hub, so the logic lives in one place.
 */
export function SavedAddressesManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['saved-addresses'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/addresses');
      if (!res.ok) throw new Error('Failed to load addresses');
      return res.json() as Promise<{ success: boolean; data: SavedAddress[] }>;
    },
  });

  const addresses = data?.data ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['saved-addresses'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editingId
        ? `/api/dashboard/addresses/${editingId}`
        : '/api/dashboard/addresses';
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save address');
      }
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/addresses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete address');
      return res.json();
    },
    onSuccess: invalidate,
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) throw new Error('Failed to set default');
      return res.json();
    },
    onSuccess: invalidate,
  });

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (a: SavedAddress) => {
    setForm({
      label: a.label ?? '',
      contactName: a.contactName,
      company: a.company ?? '',
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2 ?? '',
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      phone: a.phone ?? '',
      isDefault: a.isDefault,
    });
    setEditingId(a.id);
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  };

  const set = (patch: Partial<FormValues>) => setForm((prev) => ({ ...prev, ...patch }));

  const canSubmit =
    form.contactName.trim() &&
    form.addressLine1.trim() &&
    form.city.trim() &&
    form.state &&
    /^\d{6}$/.test(form.pincode);

  return (
    <div>
      {/* Toolbar */}
      {!showForm && (
        <div className="mb-4 flex justify-end">
          <Button variant="em" onClick={openAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Address
          </Button>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="mb-6 rounded-md border-2 border-em-300 bg-em-50/30 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-ink">
              {editingId ? 'Edit Address' : 'New Address'}
            </h3>
            <button onClick={closeForm} className="text-ink-3 hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <Input
              placeholder="Label (e.g. Head Office) — optional"
              value={form.label}
              onChange={(e) => set({ label: e.target.value })}
              className="rounded-md border-2"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Contact Name *"
                value={form.contactName}
                onChange={(e) => set({ contactName: e.target.value })}
                className="rounded-md border-2"
              />
              <Input
                placeholder="Company (optional)"
                value={form.company}
                onChange={(e) => set({ company: e.target.value })}
                className="rounded-md border-2"
              />
            </div>
            <Input
              placeholder="Address Line 1 *"
              value={form.addressLine1}
              onChange={(e) => set({ addressLine1: e.target.value })}
              className="rounded-md border-2"
            />
            <Input
              placeholder="Address Line 2 (optional)"
              value={form.addressLine2}
              onChange={(e) => set({ addressLine2: e.target.value })}
              className="rounded-md border-2"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="City *"
                value={form.city}
                onChange={(e) => set({ city: e.target.value })}
                className="rounded-md border-2"
              />
              <select
                value={form.state}
                onChange={(e) => set({ state: e.target.value })}
                className="rounded-md border-2 border-bdr px-3 py-2 bg-white"
              >
                <option value="">Select State *</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Pincode (6 digits) *"
                value={form.pincode}
                maxLength={6}
                onChange={(e) =>
                  set({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })
                }
                className="rounded-md border-2"
              />
              <Input
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
                className="rounded-md border-2"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => set({ isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-bdr accent-em"
              />
              Set as default address
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={() => {
                  setError(null);
                  saveMutation.mutate();
                }}
                disabled={!canSubmit || saveMutation.isPending}
                className="rounded-2xl bg-em px-6 py-3 font-normal hover:bg-em-600"
              >
                {saveMutation.isPending ? 'Saving…' : editingId ? 'Update Address' : 'Save Address'}
              </Button>
              <button onClick={closeForm} className="text-sm text-ink-2 hover:text-ink">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-ink-2 py-8">Loading addresses…</p>
      ) : addresses.length === 0 && !showForm ? (
        <div className="rounded-md border-2 border-bdr bg-gray-50 p-12 text-center">
          <MapPin className="mx-auto h-8 w-8 text-ink-3" />
          <p className="mt-3 text-ink-2">No saved addresses yet</p>
          <Button variant="em" onClick={openAdd} className="mt-4 flex items-center gap-2 mx-auto">
            <Plus className="h-4 w-4" /> Add Your First Address
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div
              key={a.id}
              className={`rounded-md border-2 p-5 ${
                a.isDefault ? 'border-em bg-em-50/30' : 'border-bdr bg-white'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{a.label || a.contactName}</span>
                  {a.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-em-100 text-em-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                      <Star className="h-3 w-3 fill-current" /> Default
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-ink-2 space-y-0.5">
                {a.label && <p className="text-ink">{a.contactName}</p>}
                {a.company && <p>{a.company}</p>}
                <p>{a.addressLine1}</p>
                {a.addressLine2 && <p>{a.addressLine2}</p>}
                <p>
                  {a.city}, {a.state} — {a.pincode}
                </p>
                {a.phone && <p>{a.phone}</p>}
              </div>

              <div className="mt-4 flex items-center gap-3 border-t border-bdr pt-3 text-xs">
                {!a.isDefault && (
                  <button
                    onClick={() => setDefaultMutation.mutate(a.id)}
                    disabled={setDefaultMutation.isPending}
                    className="text-em hover:underline"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => openEdit(a)}
                  className="flex items-center gap-1 text-ink-2 hover:text-ink"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this address?')) deleteMutation.mutate(a.id);
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1 text-ink-2 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
