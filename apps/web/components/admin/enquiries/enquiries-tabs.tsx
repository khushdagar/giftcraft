'use client';

import { useState } from 'react';
import { EnquiriesTable } from '@/components/admin/enquiries/enquiries-table';
import { GhlLeadsTable } from '@/components/admin/enquiries/ghl-leads-table';

interface Enquiry {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  quantity: number | null;
  message: string | null;
  productName: string | null;
  status: string;
  createdAt: string;
}

export function EnquiriesTabs({ initialData }: { initialData: Enquiry[] }) {
  const [tab, setTab] = useState<'website' | 'ghl'>('website');

  const tabCls = (active: boolean) =>
    `rounded-md px-4 py-2 text-sm font-medium transition-colors ${
      active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setTab('website')} className={tabCls(tab === 'website')}>
          Website
        </button>
        <button onClick={() => setTab('ghl')} className={tabCls(tab === 'ghl')}>
          GoHighLevel
        </button>
      </div>

      {tab === 'website' ? <EnquiriesTable initialData={initialData} /> : <GhlLeadsTable />}
    </div>
  );
}
