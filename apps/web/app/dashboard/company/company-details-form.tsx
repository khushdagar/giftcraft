'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { INDIAN_STATES } from '@/lib/constants';

export interface CompanyFormValues {
  name: string;
  gstin: string;
  pan: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  website: string;
}

export function CompanyDetailsForm({
  initial,
  canEdit,
  isNew = false,
}: {
  initial: CompanyFormValues;
  canEdit: boolean;
  isNew?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CompanyFormValues>(initial);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (patch: Partial<CompanyFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setSaved(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/dashboard/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save company details');
      }
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
      setSaved(true);
      // Re-render the server page so a newly created company (and the team
      // section) appears, and the auto-fill data is fresh everywhere.
      router.refresh();
    },
  });

  const field = (
    label: string,
    key: keyof CompanyFormValues,
    placeholder?: string
  ) => (
    <div>
      <label className="text-xs font-normal uppercase tracking-wider text-ink-3">
        {label}
      </label>
      <Input
        value={values[key]}
        onChange={(e) => set({ [key]: e.target.value } as Partial<CompanyFormValues>)}
        placeholder={placeholder}
        disabled={!canEdit}
        className="mt-1 rounded-md border-2 disabled:bg-gray-50"
      />
    </div>
  );

  return (
    <div className="rounded-md border-2 border-bdr bg-white p-6">
      <div className="mb-4">
        <h2 className="font-normal text-ink">Company Details</h2>
        {isNew && (
          <p className="mt-1 text-xs text-ink-3">
            Add your company once — these details auto-fill on every future checkout.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {field('Company Name', 'name', 'Acme Pvt Ltd')}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('GSTIN', 'gstin', '07XXXXXXXXX1Z5')}
          {field('PAN', 'pan', 'ABCDE1234F')}
        </div>

        {field('Address', 'addressLine', 'Building, street, area')}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('City', 'city', 'New Delhi')}
          <div>
            <label className="text-xs font-normal uppercase tracking-wider text-ink-3">
              State
            </label>
            <select
              value={values.state}
              onChange={(e) => set({ state: e.target.value })}
              disabled={!canEdit}
              className="mt-1 w-full rounded-md border-2 border-bdr px-3 py-2 bg-white disabled:bg-gray-50"
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('Pincode', 'pincode', '110001')}
          {field('Phone', 'phone', '9876543210')}
        </div>

        {field('Website', 'website', 'https://acme.com')}
      </div>

      {canEdit && (
        <div className="mt-6 flex items-center gap-3 border-t border-bdr pt-4">
          <Button
            onClick={() => mutation.mutate()}
            disabled={!dirty || mutation.isPending || !values.name.trim()}
            className="rounded-2xl bg-em px-6 py-3 font-normal hover:bg-em-600"
          >
            {mutation.isPending
              ? 'Saving…'
              : isNew
                ? 'Create Company'
                : 'Save Details'}
          </Button>
          {saved && (
            <p className="text-sm text-em-700">
              {isNew ? '✓ Company created' : '✓ Saved'}
            </p>
          )}
          {mutation.isError && (
            <p className="text-sm text-red-600">
              {(mutation.error as Error)?.message || 'Failed to save'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
