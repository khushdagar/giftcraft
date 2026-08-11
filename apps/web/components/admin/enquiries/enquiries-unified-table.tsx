'use client';

import { Fragment, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Mail, Phone, FileText, RefreshCw, Send, Download, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProposalBuilder } from '@/components/admin/proposals/proposal-builder';
import { ProposalPdfPreview } from './proposal-pdf-preview';

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
  // 'form' = a form submission (one row per enquiry), 'contact' = CRM contact
  origin: 'form' | 'contact';
  formName: string | null;
  status: string;
  message: string | null;
  productName: string | null;
  quantity: number | null;
  quantityLabel: string | null;
  /** Dismissed from this table on our side; still live in GoHighLevel. */
  hidden?: boolean;
  // Everything else the lead submitted — form answers, custom fields, address…
  detail: { label: string; value: string }[];
}

// One row shape for both sources.
interface Row {
  key: string;
  source: 'website' | 'ghl';
  enquiryId: string | null; // only website rows can be deleted
  leadId: string | null; // GHL rows — status is stored against this id
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  productName: string | null;
  quantity: number | null;
  /** GHL leads answer with a range ("25 - 50"), which `quantity` can't hold. */
  quantityLabel: string | null;
  message: string | null;
  tags: string[];
  status: string | null;
  createdAt: string | null;
  formName: string | null;
  detail: { label: string; value: string }[];
  /** GHL row dismissed from this table (never deleted in GoHighLevel). */
  hidden: boolean;
}

interface DeckDownload {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  isAccount: boolean;
  quoteToken: string;
  createdAt: string;
}

type Tab = 'website' | 'ghl' | 'downloads' | 'create';

const GHL_KEY = ['admin', 'ghl-leads'] as const;
const PROPOSALS_KEY = ['admin', 'proposals'] as const;

interface GhlResult {
  leads: GhlLead[];
  missingScopes: string[];
  note: string | null; // set when the tab can't show leads (not configured / API error)
}

interface ProposalInfo {
  recipientEmail: string;
  createdAt: string;
  quoteStatus: string;
  shareToken: string;
  productNames: string[];
  packagingName: string | null;
  addonNames: string[];
  packQuantity: number;
  grandTotal: number;
  /** Token of the multi-option compare page + combined deck (null on legacy). */
  proposalToken: string | null;
  /** Every option in the latest proposal, in the order the lead sees them. */
  packs: { label: string; shareToken: string; grandTotal: number; packQuantity: number }[];
  /** How many proposals this lead has been sent in total. */
  sentCount: number;
}

const STATUS_OPTIONS = ['new', 'contacted', 'quoted', 'pending', 'closed'] as const;

// 'quoted' is the stored value; admins think of it as "proposal sent".
const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Proposal sent',
  pending: 'Pending',
  closed: 'Closed',
};

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-amber-100 text-amber-700',
  contacted: 'bg-sky-100 text-sky-700',
  quoted: 'bg-indigo-100 text-indigo-700',
  pending: 'bg-violet-100 text-violet-700',
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

const fmtMoney = (n: number) =>
  `₹${Math.round(n).toLocaleString('en-IN')}`;

// GHL leads can arrive minutes apart — the time keeps repeat enquiries distinct.
const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

export function EnquiriesUnifiedTable({
  initialData,
  downloads = [],
}: {
  initialData: WebsiteEnquiry[];
  downloads?: DeckDownload[];
}) {
  const [websiteRows, setWebsiteRows] = useState(initialData);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('website');

  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleDetail = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Proposal deck being previewed, if any.
  const [preview, setPreview] = useState<{
    token: string;
    proposalToken?: string | null;
    title: string;
  } | null>(null);

  const router = useRouter();

  // GHL leads — pulled live from the GoHighLevel API, nothing stored locally.
  // Cached for the whole browser session: switching tabs or navigating away and
  // back reuses the cache. Fresh data comes from the Refresh button or a reload.
  const ghlQuery = useQuery({
    queryKey: GHL_KEY,
    queryFn: async (): Promise<GhlResult> => {
      const res = await fetch('/api/admin/ghl/leads');
      const data = await res.json();
      if (data.error === 'not_configured') {
        return {
          leads: [],
          missingScopes: [],
          note: 'GoHighLevel is not connected — add GHL_API_KEY and GHL_LOCATION_ID to include GHL leads here.',
        };
      }
      if (!res.ok || !data.success) {
        return { leads: [], missingScopes: [], note: data.error || 'Failed to load GoHighLevel leads.' };
      }
      return { leads: data.data as GhlLead[], missingScopes: data.missingScopes || [], note: null };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    retry: false,
  });

  const ghlLeads = ghlQuery.data?.leads ?? [];
  // Scopes the token is missing — the tab still works, just with less detail.
  const missingScopes = ghlQuery.data?.missingScopes ?? [];
  const ghlNote = ghlQuery.isFetching
    ? 'Loading GoHighLevel leads…'
    : ghlQuery.isError
      ? 'Failed to reach the server for GoHighLevel leads.'
      : ghlQuery.data?.note ?? null;

  // Latest proposal per lead email (lowercased) so each row can show its status.
  const { data: proposals = {} } = useQuery({
    queryKey: PROPOSALS_KEY,
    queryFn: async () => {
      const res = await fetch('/api/admin/proposals');
      if (!res.ok) return {} as Record<string, ProposalInfo>;
      const data = await res.json();
      const map: Record<string, ProposalInfo> = {};
      // API returns newest first — keep the latest proposal per email, but count
      // the older ones so the row can show "3rd proposal sent".
      (data.data || []).forEach((p: any) => {
        const key = (p.recipientEmail || '').toLowerCase();
        if (!key) return;
        if (map[key]) {
          map[key].sentCount += 1;
          return;
        }
        map[key] = {
          recipientEmail: p.recipientEmail,
          createdAt: p.createdAt,
          quoteStatus: p.quoteStatus,
          shareToken: p.shareToken,
          productNames: p.productNames || [],
          packagingName: p.packagingName ?? null,
          addonNames: p.addonNames || [],
          packQuantity: p.packQuantity || 0,
          grandTotal: p.grandTotal || 0,
          proposalToken: p.proposalToken ?? null,
          packs: p.packs || [],
          sentCount: 1,
        };
      });
      return map;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    retry: false,
  });

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

  // GHL leads live in GoHighLevel — only their pipeline status is stored here.
  const updateGhlStatus = async (leadId: string, status: string) => {
    setBusyId(leadId);
    const prev = queryClient.getQueryData<GhlResult>(GHL_KEY);
    // optimistic — write straight into the cache so it survives navigation too
    queryClient.setQueryData<GhlResult>(GHL_KEY, (old) =>
      old ? { ...old, leads: old.leads.map((l) => (l.id === leadId ? { ...l, status } : l)) } : old
    );
    try {
      const res = await fetch('/api/admin/ghl/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      if (prev) queryClient.setQueryData<GhlResult>(GHL_KEY, prev); // revert on failure
      alert('Failed to update status.');
    } finally {
      setBusyId(null);
    }
  };

  // ── Removing rows ─────────────────────────────────────────────────────────
  // Website enquiries are ours, so they're deleted outright. GHL leads belong to
  // GoHighLevel, so they're only hidden here — the contact stays in the CRM and
  // can be brought back with the "Show hidden" toggle.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleSelect = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const setLeadsHidden = async (leadIds: string[], hidden: boolean) => {
    if (leadIds.length === 0) return;
    const prev = queryClient.getQueryData<GhlResult>(GHL_KEY);
    queryClient.setQueryData<GhlResult>(GHL_KEY, (old) =>
      old
        ? {
            ...old,
            leads: old.leads.map((l) => (leadIds.includes(l.id) ? { ...l, hidden } : l)),
          }
        : old
    );
    try {
      const res = await fetch('/api/admin/ghl/hide', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, hidden }),
      });
      if (!res.ok) throw new Error();
    } catch {
      if (prev) queryClient.setQueryData<GhlResult>(GHL_KEY, prev);
      alert(hidden ? 'Failed to hide lead(s).' : 'Failed to restore lead(s).');
    }
  };

  const hideLead = async (leadId: string) => {
    setBusyId(leadId);
    await setLeadsHidden([leadId], true);
    setBusyId(null);
  };

  // Mixed selections are handled in one pass: website rows are deleted, GHL rows
  // hidden. The confirm spells out which is which so neither is a surprise.
  const removeSelected = async (rows: Row[]) => {
    const picked = rows.filter((r) => selected.has(r.key));
    const enquiryIds = picked.filter((r) => r.enquiryId).map((r) => r.enquiryId!);
    const leadIds = picked.filter((r) => r.leadId).map((r) => r.leadId!);
    if (picked.length === 0) return;

    const parts = [
      enquiryIds.length > 0 && `delete ${enquiryIds.length} website enquiry(ies) permanently`,
      leadIds.length > 0 && `hide ${leadIds.length} GHL lead(s) from this table`,
    ].filter(Boolean);
    if (!confirm(`This will ${parts.join(' and ')}. Continue?`)) return;

    setBulkBusy(true);
    try {
      if (leadIds.length > 0) await setLeadsHidden(leadIds, true);
      if (enquiryIds.length > 0) {
        // Only drop rows whose DELETE actually succeeded, so a failed one stays
        // on screen instead of silently vanishing from the table.
        const results = await Promise.allSettled(
          enquiryIds.map(async (id) => {
            const res = await fetch(`/api/admin/enquiries/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(id);
            return id;
          })
        );
        const ok = new Set(
          results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
        );
        setWebsiteRows((r) => r.filter((e) => !ok.has(e.id)));
        if (ok.size < enquiryIds.length) {
          alert(`${enquiryIds.length - ok.size} enquiry(ies) could not be deleted.`);
        }
      }
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
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

  // Proposals are composed on their own page — a lead can be sent several pack
  // options at once, which needs more room than a dialog. The GHL lead id rides
  // along so the builder can flip its status to "quoted" after sending.
  const openProposal = (row: Row) => {
    const params = new URLSearchParams();
    if (row.email) params.set('email', row.email);
    if (row.contactName) params.set('name', row.contactName);
    if (row.companyName) params.set('company', row.companyName);
    if (row.leadId) params.set('leadId', row.leadId);
    router.push(`/admin/proposals/new?${params.toString()}`);
  };

  // ── Merge both sources into one list, newest first ──────────────────────
  const allRows: Row[] = [
    ...websiteRows.map((e) => ({
      key: `web-${e.id}`,
      source: 'website' as const,
      enquiryId: e.id,
      leadId: null,
      companyName: e.companyName,
      contactName: e.contactName,
      email: e.email,
      phone: e.phone,
      productName: e.productName,
      quantity: e.quantity,
      quantityLabel: null,
      message: e.message,
      tags: [],
      status: e.status,
      createdAt: e.createdAt,
      formName: null,
      detail: [],
      hidden: false,
    })),
    ...ghlLeads.map((l) => ({
      key: `ghl-${l.id}`,
      source: 'ghl' as const,
      enquiryId: null,
      leadId: l.id,
      companyName: l.companyName,
      contactName: l.name,
      email: l.email,
      phone: l.phone,
      productName: l.productName,
      quantity: l.quantity,
      quantityLabel: l.quantityLabel,
      message: l.message,
      tags: l.tags,
      status: l.status || 'new',
      createdAt: l.dateAdded,
      formName: l.formName,
      detail: l.detail || [],
      hidden: l.hidden ?? false,
    })),
  ].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  // Hidden GHL leads drop out unless the toggle is on.
  const rows = allRows.filter((r) => r.source === tab && (showHidden || !r.hidden));
  const hiddenCount = allRows.filter((r) => r.source === tab && r.hidden).length;
  const selectedInTab = rows.filter((r) => selected.has(r.key)).length;

  const TABS: { id: Tab; label: string; count: number | null }[] = [
    { id: 'website', label: 'Enquiries', count: websiteRows.length },
    { id: 'ghl', label: 'GHL Entries', count: ghlLeads.length },
    { id: 'downloads', label: 'Deck Downloads', count: downloads.length },
    // Compose a proposal for anyone — no enquiry row needed.
    { id: 'create', label: 'Create Proposal', count: null },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors ${
              tab === t.id
                ? 'border-gray-900 font-medium text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
            {t.count !== null && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {ghlNote && tab === 'ghl' && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-gray-600">
          <span>{ghlNote}</span>
          <button
            onClick={() => ghlQuery.refetch()}
            disabled={ghlQuery.isFetching}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {tab === 'ghl' && !ghlNote && missingScopes.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          Showing contact details only. To pull the full enquiry (form answers, custom
          fields), add these scopes to the GHL private integration and paste the new token
          into GHL_API_KEY: <strong>{missingScopes.join(', ')}</strong>
        </div>
      )}

      {tab === 'create' ? (
        // Same composer as /admin/proposals/new, with an empty recipient — the
        // admin types any email address and builds the pack options here.
        <ProposalBuilder prefill={{ email: '', name: '', company: '' }} />
      ) : tab === 'downloads' ? (
        downloads.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <Download className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              No downloads yet. They&apos;ll appear here as soon as someone downloads a proposal deck.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[880px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {['Name', 'Reach', 'Company', 'Type', 'Quote', 'Downloaded'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-normal uppercase text-gray-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {downloads.map((d) => (
                  <tr key={d.id} className="align-top hover:bg-gray-50">
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{d.name}</td>
                    <td className="px-3 py-3 text-sm">
                      <a href={`mailto:${d.email}`} className="flex items-center gap-1 text-emerald-700 hover:underline">
                        <Mail className="h-3 w-3" /> {d.email}
                      </a>
                      {d.phone && (
                        <a href={`tel:${d.phone}`} className="mt-1 flex items-center gap-1 text-gray-600 hover:underline">
                          <Phone className="h-3 w-3" /> {d.phone}
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700">{d.company || '—'}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                          d.isAccount ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {d.isAccount ? 'Account' : 'Guest lead'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <a
                        href={`/quote/${d.quoteToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:underline"
                      >
                        View quote
                      </a>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">{fmtDate(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Mail className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">
            {tab === 'ghl' ? 'No GoHighLevel leads.' : 'No enquiries yet.'}
          </p>
        </div>
      ) : (
        <>
        {/* Bulk bar + hidden-rows toggle. Only rendered for the two lead tabs. */}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {selectedInTab > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <span className="text-sm font-medium text-blue-900">{selectedInTab} selected</span>
              <button
                onClick={() => removeSelected(rows)}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {bulkBusy ? 'Removing…' : `Remove ${selectedInTab}`}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-gray-500 hover:text-gray-900 hover:underline"
              >
                Clear
              </button>
            </div>
          )}
          {tab === 'ghl' && hiddenCount > 0 && (
            <button
              onClick={() => setShowHidden((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 hover:underline"
            >
              {showHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showHidden ? 'Hide dismissed rows' : `Show ${hiddenCount} hidden`}
            </button>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          {/* table-fixed + colgroup: every column gets the width declared below
              instead of the browser handing leftover space to whichever column
              it likes (which is what left a big gap after Qty). Also keeps the
              row inside the viewport, so there's no horizontal scrollbar. */}
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[3%]" />{/* Select */}
              <col className="w-[6%]" />{/* Source */}
              <col className="w-[13%]" />{/* Company / Contact */}
              <col className="w-[16%]" />{/* Reach */}
              <col className="w-[8%]" />{/* Product */}
              <col className="w-[7%]" />{/* Qty */}
              <col className="w-[8%]" />{/* Received */}
              <col className="w-[8%]" />{/* Status */}
              <col className="w-[13%]" />{/* Proposal sent */}
              <col className="w-[8%]" />{/* Proposal */}
              <col className="w-[9%]" />{/* Message */}
              <col className="w-[4%]" />{/* Actions */}
            </colgroup>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={rows.length > 0 && selectedInTab === rows.length}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedInTab > 0 && selectedInTab < rows.length;
                    }}
                    onChange={() =>
                      setSelected(
                        selectedInTab === rows.length ? new Set() : new Set(rows.map((r) => r.key))
                      )
                    }
                    className="rounded"
                  />
                </th>
                {/* Message sits at the end: it's the only free-text column, so
                    keeping it between the fixed-width ones squeezed it into a
                    two-word-per-line strip and stretched every row. */}
                {['Source', 'Company / Contact', 'Reach', 'Product', 'Qty', 'Received', 'Status', 'Proposal sent', 'Proposal', 'Message', ''].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-xs font-normal uppercase leading-tight text-gray-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((row) => {
                const proposal = row.email ? proposals[row.email.toLowerCase()] : undefined;
                return (
                  <Fragment key={row.key}>
                  <tr
                    className={`align-top hover:bg-gray-50 ${row.hidden ? 'opacity-50' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.companyName || row.email || 'row'}`}
                        checked={selected.has(row.key)}
                        onChange={() => toggleSelect(row.key)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                          row.source === 'website'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-violet-100 text-violet-700'
                        }`}
                      >
                        {row.source === 'website' ? 'Website' : 'GHL'}
                      </span>
                      {row.formName && (
                        <p className="mt-1 text-xs text-gray-500">{row.formName}</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-medium text-gray-900">{row.companyName || '—'}</p>
                      <p className="text-xs text-gray-500">{row.contactName || '—'}</p>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {row.email ? (
                        <a
                          href={`mailto:${row.email}`}
                          className="flex items-start gap-1 break-all text-emerald-700 hover:underline"
                        >
                          <Mail className="mt-0.5 h-3 w-3 shrink-0" /> {row.email}
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
                    <td className="px-3 py-3 text-sm text-gray-700">{row.productName || '—'}</td>
                    {/* Ranges keep their original form ("25 - 50"); a plain
                        number falls back to the parsed value. */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {row.quantityLabel ?? row.quantity ?? '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                      {fmtDate(row.createdAt)}
                      {row.source === 'ghl' && row.createdAt && (
                        <span className="block text-gray-400">{fmtTime(row.createdAt)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={row.status ?? 'new'}
                        disabled={busyId === (row.enquiryId ?? row.leadId)}
                        onChange={(ev) =>
                          row.enquiryId
                            ? updateStatus(row.enquiryId, ev.target.value)
                            : updateGhlStatus(row.leadId!, ev.target.value)
                        }
                        className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[row.status ?? ''] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* What was actually sent, so a proposal can be checked without
                        digging through the mailbox. */}
                    <td className="px-3 py-3">
                      {proposal ? (
                        <div className="space-y-1">
                          {/* Multi-option proposals list every pack the lead
                              received; single-option ones keep the old summary. */}
                          {proposal.packs.length > 1 ? (
                            <>
                              <p className="text-sm text-gray-900">
                                {proposal.packs.length} pack options
                              </p>
                              <ul className="space-y-0.5">
                                {proposal.packs.map((pk) => (
                                  <li
                                    key={pk.shareToken}
                                    className="flex justify-between gap-2 text-xs text-gray-500"
                                  >
                                    <span className="truncate">{pk.label}</span>
                                    <span className="shrink-0 tabular-nums">
                                      {fmtMoney(pk.grandTotal)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : (
                            <>
                              <p
                                className="text-sm text-gray-900"
                                title={proposal.productNames.join(', ')}
                              >
                                {proposal.productNames.length > 0
                                  ? proposal.productNames.slice(0, 2).join(', ')
                                  : 'Custom pack'}
                                {proposal.productNames.length > 2 && (
                                  <span className="text-gray-500">
                                    {' '}
                                    +{proposal.productNames.length - 2} more
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {proposal.packQuantity ? `${proposal.packQuantity} packs · ` : ''}
                                {fmtMoney(proposal.grandTotal)}
                              </p>
                              {(proposal.packagingName || proposal.addonNames.length > 0) && (
                                <p className="text-xs text-gray-400">
                                  {[proposal.packagingName, ...proposal.addonNames]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              )}
                            </>
                          )}
                          <button
                            onClick={() =>
                              setPreview({
                                token: proposal.shareToken,
                                proposalToken: proposal.proposalToken,
                                title: `Proposal for ${row.companyName || row.contactName || row.email}`,
                              })
                            }
                            className="mt-0.5 inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {proposal.packs.length > 1 ? 'View PDF (all packs)' : 'View PDF'}
                          </button>
                          {proposal.sentCount > 1 && (
                            <p className="text-xs text-gray-400">
                              {proposal.sentCount} sent · showing latest
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
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
                    {/* Message — free text, so it gets a real width here at the
                        end of the row instead of being squeezed mid-table. */}
                    <td className="px-3 py-3 align-top text-sm text-gray-600">
                      <div className="space-y-1.5">
                        {row.message ? (
                          <span className="line-clamp-2 block" title={row.message}>
                            {row.message}
                          </span>
                        ) : (
                          row.tags.length === 0 &&
                          row.detail.length === 0 && <span className="text-gray-400">—</span>
                        )}
                        {row.source === 'ghl' && row.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {row.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                              >
                                {t}
                              </span>
                            ))}
                            {row.tags.length > 3 && (
                              <span className="px-1 py-0.5 text-xs text-gray-400">
                                +{row.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        {row.source === 'ghl' && row.detail.length > 0 && (
                          <button
                            onClick={() => toggleDetail(row.key)}
                            className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-gray-500 hover:text-gray-900 hover:underline"
                          >
                            {expanded.has(row.key) ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                            {expanded.has(row.key)
                              ? 'Hide details'
                              : `All details (${row.detail.length})`}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
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
                      {/* GHL leads are hidden, not deleted — the contact stays
                          in GoHighLevel and can be restored from here. */}
                      {row.source === 'ghl' && row.leadId && (
                        <button
                          onClick={() =>
                            row.hidden
                              ? setLeadsHidden([row.leadId!], false)
                              : hideLead(row.leadId!)
                          }
                          disabled={busyId === row.leadId}
                          title={row.hidden ? 'Restore to list' : 'Hide from list (stays in GoHighLevel)'}
                          className="text-gray-500 hover:text-red-600 disabled:opacity-50"
                        >
                          {row.hidden ? (
                            <RefreshCw className="h-4 w-4" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded.has(row.key) && row.detail.length > 0 && (
                    <tr className="bg-gray-50">
                      <td colSpan={12} className="px-4 py-4">
                        {row.formName && (
                          <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                            Submitted via {row.formName}
                          </p>
                        )}
                        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                          {row.detail.map((d) => (
                            <div key={`${d.label}-${d.value}`} className="min-w-0">
                              <dt className="text-xs text-gray-500">{d.label}</dt>
                              <dd className="break-words text-sm text-gray-900">{d.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      <ProposalPdfPreview
        open={!!preview}
        token={preview?.token ?? ''}
        proposalToken={preview?.proposalToken ?? null}
        title={preview?.title ?? 'Proposal'}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
