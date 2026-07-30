'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, Users, RefreshCw, FileText } from 'lucide-react';

interface GhlLead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  tags: string[];
  dateAdded: string | null;
}

type State =
  | { kind: 'loading' }
  | { kind: 'not_configured' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; leads: GhlLead[] };

/** Leads pulled live from the GoHighLevel API — nothing is stored locally. */
export function GhlLeadsTable() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = async () => {
    setState({ kind: 'loading' });
    try {
      const res = await fetch('/api/admin/ghl/leads');
      const data = await res.json();
      if (data.error === 'not_configured') {
        setState({ kind: 'not_configured' });
      } else if (!res.ok || !data.success) {
        setState({ kind: 'error', message: data.error || 'Failed to load GHL leads' });
      } else {
        setState({ kind: 'ready', leads: data.data });
      }
    } catch {
      setState({ kind: 'error', message: 'Failed to reach the server' });
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (state.kind === 'loading') {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (state.kind === 'not_configured') {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-700">GoHighLevel is not connected yet</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-gray-500">
          Add <code className="rounded bg-gray-100 px-1 py-0.5">GHL_API_KEY</code> (a Private
          Integration token) and <code className="rounded bg-gray-100 px-1 py-0.5">GHL_LOCATION_ID</code>{' '}
          to your environment, then restart the app. Leads will appear here automatically.
        </p>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-sm text-gray-600">{state.message}</p>
        <button
          onClick={load}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (state.leads.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No leads found in GoHighLevel.</p>
      </div>
    );
  }

  const proposalHref = (l: GhlLead) => {
    const params = new URLSearchParams();
    if (l.email) params.set('email', l.email);
    if (l.name) params.set('name', l.name);
    if (l.companyName) params.set('company', l.companyName);
    return `/admin/proposals/new?${params.toString()}`;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[820px]">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Contact', 'Reach', 'Company', 'Tags', 'Added', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-normal uppercase text-gray-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {state.leads.map((l) => (
            <tr key={l.id} className="align-top hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{l.name || '—'}</p>
              </td>
              <td className="px-4 py-3 text-sm">
                {l.email ? (
                  <a href={`mailto:${l.email}`} className="flex items-center gap-1 text-emerald-700 hover:underline">
                    <Mail className="h-3 w-3" /> {l.email}
                  </a>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
                {l.phone && (
                  <a href={`tel:${l.phone}`} className="mt-1 flex items-center gap-1 text-gray-600 hover:underline">
                    <Phone className="h-3 w-3" /> {l.phone}
                  </a>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">{l.companyName || '—'}</td>
              <td className="px-4 py-3">
                <div className="flex max-w-xs flex-wrap gap-1">
                  {l.tags.length === 0 ? (
                    <span className="text-sm text-gray-400">—</span>
                  ) : (
                    l.tags.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {t}
                      </span>
                    ))
                  )}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                {l.dateAdded
                  ? new Date(l.dateAdded).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={proposalHref(l)}
                  title={l.email ? 'Create proposal' : 'Lead has no email'}
                  aria-disabled={!l.email}
                  className={`inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium ${
                    l.email
                      ? 'text-gray-700 hover:bg-gray-100'
                      : 'pointer-events-none text-gray-300'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" /> Proposal
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
