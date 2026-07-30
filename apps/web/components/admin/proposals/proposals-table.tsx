'use client';

import { useState } from 'react';
import { FileText, ExternalLink, Link as LinkIcon, Check } from 'lucide-react';
import { formatRupees } from '@/lib/utils';

interface ProposalRow {
  id: string;
  recipientEmail: string;
  recipientName: string | null;
  companyName: string | null;
  createdAt: string;
  shareToken: string;
  quoteStatus: string;
  expiresAt: string;
  grandTotal: number;
  productCount: number;
  packQuantity: number;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  converted: 'bg-indigo-100 text-indigo-700',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-rose-100 text-rose-700',
};

export function ProposalsTable({ initialData }: { initialData: ProposalRow[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = async (p: ProposalRow) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/quote/${p.shareToken}`);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      alert('Failed to copy link.');
    }
  };

  if (initialData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No proposals sent yet.</p>
        <p className="mt-1 text-xs text-gray-400">
          Create one from here or straight from an enquiry / GHL lead.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[860px]">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Recipient', 'Company', 'Pack', 'Total (incl. GST)', 'Sent', 'Status', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-normal uppercase text-gray-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {initialData.map((p) => {
            const status =
              p.quoteStatus === 'active' && new Date(p.expiresAt) < new Date()
                ? 'expired'
                : p.quoteStatus;
            return (
              <tr key={p.id} className="align-top hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{p.recipientName || '—'}</p>
                  <p className="text-xs text-gray-500">{p.recipientEmail}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.companyName || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {p.productCount} {p.productCount === 1 ? 'item' : 'items'} × {p.packQuantity} packs
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 tabular-nums whitespace-nowrap">
                  {formatRupees(p.grandTotal)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                  {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => copyLink(p)}
                    title="Copy quote link"
                    className="mr-3 inline-flex text-gray-500 hover:text-gray-900"
                  >
                    {copiedId === p.id ? <Check className="h-4 w-4 text-emerald-600" /> : <LinkIcon className="h-4 w-4" />}
                  </button>
                  <a
                    href={`/quote/${p.shareToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open quote page"
                    className="inline-flex text-gray-500 hover:text-gray-900"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
