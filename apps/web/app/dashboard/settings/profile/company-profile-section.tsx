'use client';

import { useQuery } from '@tanstack/react-query';
import { CompanyDetailsForm } from '../../company/company-details-form';

/**
 * Loads the signed-in user's company and renders the shared editable company
 * form. Used inside the consolidated profile hub so company details can be
 * created/updated in the same place as personal and address details.
 */
export function CompanyProfileSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-company'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/company');
      if (!res.ok) return null;
      return res.json() as Promise<{ success: boolean; data: any; canEdit: boolean }>;
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <p className="text-ink-2">Loading company…</p>
      </div>
    );
  }

  const company = data?.data ?? null;

  return (
    <CompanyDetailsForm
      canEdit
      isNew={!company}
      initial={{
        name: company?.name ?? '',
        gstin: company?.gstin ?? '',
        pan: company?.pan ?? '',
        addressLine: company?.addressLine ?? '',
        city: company?.city ?? '',
        state: company?.state ?? '',
        pincode: company?.pincode ?? '',
        phone: company?.phone ?? '',
        website: company?.website ?? '',
      }}
    />
  );
}
