'use client';

import { useEffect, useState } from 'react';
import { Trash2, Mail, Phone, FileText, RefreshCw, Send } from 'lucide-react';
import { ProposalDialog } from './proposal-dialog';

interface WebsiteEnquiry {
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

interface GhlLead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  tags: string[];
  dateAdded: string | null;
}

// One row shape for both sources.
interface Row {
  key: string;
  source: 'website' | 'ghl';
  enquiryId: string | null; // only website rows can update status / be deleted
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  productName: string | null;
  quantity: number | null;
  message: string | null;
  tags: string[];
  status: string | null;
  createdAt: string | null;
}

interface ProposalInfo {
  recipientEmail: string;
  createdAt: string;
  quoteStatus: string;
  shareToken: string;
}

const STATUS_OPTIONS = ['new', 'contacted', 'quoted', 'closed'] as const;

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-amber-100 text-amber-700',
  contacted: 'bg-sky-100 text-sky-700',
  quoted: 'bg-indigo-100 text-indigo-700',
  closed: 'bg-gray-100 text-gray-600',
};

const QUOTE_STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  converted: 'bg-indigo-100 text-indigo-700',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-rose-100 text-rose-700',
};

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

export function EnquiriesUnifiedTable({ initialData }: { initialData: WebsiteEnquiry[] }) {
  const [websiteRows, setWebsiteRows] = useState(initialData);
  const [busyId, setBusyId] = useState<string | null>(null);

  // GHL leads — pulled live from the GoHighLevel API, nothing stored locally.
  const [ghlLeads, setGhlLeads] = useState<GhlLead[]>([]);
  const [ghlNote, setGhlNote] = useState<string | null>('Loading GoHighLevel leads…');

  // Latest proposal per lead email (lowercased) so each row can show its status.
  const [proposals, setProposals] = useState<Record<string, ProposalInfo>>({});

  const [dialog, setDialog] = useState<{
    open: boolean;
    prefill: { email: string; name: string; company: string };
  }>({ open: false, prefill: { email: '', name: '', company: '' } });

  const loadGhl = async () => {
    setGhlNote('Loading GoHighLevel leads…');
    try {
      const res = await fetch('/api/admin/ghl/leads');
      const data = await res.json();
      if (data.error === 'not_configured') {
        setGhlNote('GoHighLevel is not connected — add GHL_API_KEY and GHL_LOCATION_ID to include GHL leads here.');
      } else if (!res.ok || !data.success) {
        setGhlNote(data.error || 'Failed to load GoHighLevel leads.');
      } else {
        setGhlLeads(data.data);
        setGhlNote(null);
      }
    } catch {
      setGhlNote('Failed to reach the server for GoHighLevel leads.');
    }
  };

  const loadProposals = async () => {
    try {
      const res = await fetch('/api/admin/proposals');
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, ProposalInfo> = {};
      // API returns newest first — keep the latest proposal per email.
      (data.data || []).forEach((p: any) => {
        const key = (p.recipientEmail || '').toLowerCase();
        if (key && !map[key]) {
          map[key] = {
            recipientEmail: p.recipientEmail,
            createdAt: p.createdAt,
            quoteStatus: p.quoteStatus,
            shareToken: p.shareToken,
          };
        }
      });
      setProposals(map);
    } catch {
      /* proposal statuses are non-critical — rows still render */
    }
  };

  useEffect(() => {
    loadGhl();
    loadProposals();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    const prev = websiteRows;
    setWebsiteRows((r) => r.map((e) => (e.id === id ? { ...e, status } : e))); // optimistic
    try {
      const res = await fetch(`/api/admin/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setWebsiteRows(prev); // revert on failure
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
      setWebsiteRows((r) => r.filter((e) => e.id !== id));
    } catch {
      alert('Failed to delete enquiry.');
    } finally {
      setBusyId(null);
    }
  };

  const openProposal = (row: Row) => {
    setDialog({
      open: true,
      prefill: {
        email: row.email || '',
        name: row.contactName || '',
        company: row.companyName || '',
      },
    });
  };

  // ── Merge both sources into one list, newest first ──────────────────────
  const rows: Row[] = [
    ...websiteRows.map((e) => ({
      key: `web-${e.id}`,
      source: 'website' as const,
      enquiryId: e.id,
      companyName: e.companyName,
      contactName: e.contactName,
      email: e.email,
      phone: e.phone,
      productName: e.productName,
      quantity: e.quantity,
      message: e.message,
      tags: [],
      status: e.status,
      createdAt: e.createdAt,
    })),
    ...ghlLeads.map((l) => ({
      key: `ghl-${l.id}`,
      source: 'ghl' as const,
      enquiryId: null,
      companyName: l.companyName,
      contactName: l.name,
      email: l.email,
      phone: l.phone,
      productName: null,
      quantity: null,
      message: null,
      tags: l.tags,
      status: null,
      createdAt: l.dateAdded,
    })),
  ].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return (
    <div className="space-y-3">
      {ghlNote && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-gray-600">
          <span>{ghlNote}</span>
          <button
            onClick={loadGhl}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Mail className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No enquiries yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[1080px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Source', 'Company / Contact', 'Reach', 'Product', 'Qty', 'Message', 'Received', 'Status', 'Proposal', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-normal uppercase text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((row) => {
                const proposal = row.email ? proposals[row.email.toLowerCase()] : undefined;
                return (
                  <tr key={row.key} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                          row.source === 'website'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-violet-100 text-violet-700'
                        }`}
                      >
                        {row.source === 'website' ? 'Website' : 'GHL'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{row.companyName || '—'}</p>
                      <p className="text-xs text-gray-500">{row.contactName || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.email ? (
                        <a href={`mailto:${row.email}`} className="flex items-center gap-1 text-emerald-700 hover:underline">
                          <Mail className="h-3 w-3" /> {row.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                      {row.phone && (
                        <a href={`tel:${row.phone}`} className="mt-1 flex items-center gap-1 text-gray-600 hover:underline">
                          <Phone className="h-3 w-3" /> {row.phone}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.productName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.quantity ?? '—'}</td>
                    <td className="px-4 py-3 max-w-xs text-sm text-gray-600">
                      {row.source === 'ghl' ? (
                        row.tags.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {row.tags.slice(0, 4).map((t) => (
                              <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                {t}
                              </span>
                            ))}
                          </div>
                        )
                      ) : (
                        <span className="line-clamp-2" title={row.message || ''}>{row.message || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{fmtDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      {row.source === 'website' && row.enquiryId ? (
                        <select
                          value={row.status ?? 'new'}
                          disabled={busyId === row.enquiryId}
                          onChange={(ev) => updateStatus(row.enquiryId!, ev.target.value)}
                          className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[row.status ?? ''] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {proposal ? (
                        <div className="space-y-1">
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${QUOTE_STATUS_STYLES[proposal.quoteStatus] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {proposal.quoteStatus}
                          </span>
                          <p className="text-xs text-gray-500">Sent {fmtDate(proposal.createdAt)}</p>
                          <button
                            onClick={() => openProposal(row)}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 hover:underline"
                          >
                            <Send className="h-3 w-3" /> Resend
                          </button>
                        </div>
                      ) : row.email ? (
                        <button
                          onClick={() => openProposal(row)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          <FileText className="h-3.5 w-3.5" /> Proposal
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400" title="Lead has no email">No email</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {row.source === 'website' && row.enquiryId && (
                        <button
                          onClick={() => remove(row.enquiryId!)}
                          disabled={busyId === row.enquiryId}
                          title="Delete"
                          className="text-gray-500 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProposalDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        prefill={dialog.prefill}
        onSent={() => {
          setDialog((d) => ({ ...d, open: false }));
          loadProposals(); // refresh proposal status column
        }}
      />
    </div>
  );
}
