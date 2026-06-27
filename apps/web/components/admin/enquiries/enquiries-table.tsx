'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Mail, Phone } from 'lucide-react';

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

const STATUS_OPTIONS = ['new', 'contacted', 'quoted', 'closed'] as const;

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-amber-100 text-amber-700',
  contacted: 'bg-sky-100 text-sky-700',
  quoted: 'bg-indigo-100 text-indigo-700',
  closed: 'bg-gray-100 text-gray-600',
};

export function EnquiriesTable({ initialData }: { initialData: Enquiry[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialData);
  const [busyId, setBusyId] = useState<string | null>(null);

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    const prev = rows;
    setRows((r) => r.map((e) => (e.id === id ? { ...e, status } : e))); // optimistic
    try {
      const res = await fetch(`/api/admin/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRows(prev); // revert on failure
      alert('Failed to update status.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this enquiry? This cannot be undone.')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/enquiries/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setRows((r) => r.filter((e) => e.id !== id));
    } catch {
      alert('Failed to delete enquiry.');
    } finally {
      setBusyId(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <Mail className="mx-auto mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No enquiries yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Company / Contact', 'Reach', 'Product', 'Qty', 'Message', 'Received', 'Status', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-normal uppercase text-gray-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {rows.map((e) => (
            <tr key={e.id} className="align-top hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{e.companyName}</p>
                <p className="text-xs text-gray-500">{e.contactName}</p>
              </td>
              <td className="px-4 py-3 text-sm">
                <a href={`mailto:${e.email}`} className="flex items-center gap-1 text-emerald-700 hover:underline">
                  <Mail className="h-3 w-3" /> {e.email}
                </a>
                <a href={`tel:${e.phone}`} className="mt-1 flex items-center gap-1 text-gray-600 hover:underline">
                  <Phone className="h-3 w-3" /> {e.phone}
                </a>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">{e.productName || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{e.quantity ?? '—'}</td>
              <td className="px-4 py-3 max-w-xs text-sm text-gray-600">
                <span className="line-clamp-2" title={e.message || ''}>{e.message || '—'}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                {new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3">
                <select
                  value={e.status}
                  disabled={busyId === e.id}
                  onChange={(ev) => updateStatus(e.id, ev.target.value)}
                  className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[e.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => remove(e.id)}
                  disabled={busyId === e.id}
                  title="Delete"
                  className="text-gray-500 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
