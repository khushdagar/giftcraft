'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

type ConsentKind = 'marketing_email' | 'marketing_whatsapp' | 'analytics' | 'dpdp_consent';

interface ConsentResponse {
  success: boolean;
  data: {
    state: Record<ConsentKind, boolean>;
    updatedAt: Record<ConsentKind, string | null>;
  };
}

const CONSENT_ITEMS: { key: ConsentKind; label: string; description: string }[] = [
  {
    key: 'marketing_email',
    label: 'Marketing Emails',
    description: 'Allow us to send you product updates, offers, and promotions by email.',
  },
  {
    key: 'marketing_whatsapp',
    label: 'Marketing on WhatsApp',
    description: 'Allow us to send offers and updates via WhatsApp.',
  },
  {
    key: 'analytics',
    label: 'Usage Analytics',
    description: 'Allow anonymous analytics to help us improve the platform.',
  },
  {
    key: 'dpdp_consent',
    label: 'Data Processing Consent (DPDP Act)',
    description:
      'Consent to processing your data to fulfil orders and provide our services, per India’s DPDP Act.',
  },
];

export default function PrivacySettingsPage() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<Record<ConsentKind, boolean> | null>(null);
  const [pendingKey, setPendingKey] = useState<ConsentKind | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['consent'],
    queryFn: async () => {
      const res = await fetch('/api/consent');
      if (!res.ok) throw new Error('Failed to load privacy settings');
      return res.json() as Promise<ConsentResponse>;
    },
  });

  useEffect(() => {
    if (data?.data?.state) setState(data.data.state);
  }, [data]);

  const mutation = useMutation({
    mutationFn: async ({ kind, granted }: { kind: ConsentKind; granted: boolean }) => {
      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, granted }),
      });
      if (!res.ok) throw new Error('Failed to update consent');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent'] });
      setPendingKey(null);
    },
    onError: (_e, variables) => {
      // Revert optimistic toggle on failure.
      setState((prev) => (prev ? { ...prev, [variables.kind]: !variables.granted } : prev));
      setPendingKey(null);
    },
  });

  const handleToggle = (kind: ConsentKind) => {
    if (!state) return;
    const next = !state[kind];
    setState({ ...state, [kind]: next });
    setPendingKey(kind);
    mutation.mutate({ kind, granted: next });
  };

  if (isLoading || !state) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-ink-2">Loading privacy settings…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link
          href="/dashboard/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-em"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Settings
        </Link>
        <h1 className="text-3xl font-normal tracking-tight text-ink">Privacy &amp; Consent</h1>
        <p className="mt-1 text-sm text-ink-2">Control how your data is used and shared</p>
      </div>

      <div className="border border-bdr rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-normal text-ink">Consent Preferences</h2>
          <p className="text-sm text-ink-2 mt-1">
            Your choices are logged with a timestamp for compliance.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-bdr">
          {CONSENT_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3">
              <div className="flex-1 pr-4">
                <label className="text-sm font-medium text-ink block">{item.label}</label>
                <p className="text-xs text-ink-2 mt-1">{item.description}</p>
              </div>
              <button
                onClick={() => handleToggle(item.key)}
                disabled={pendingKey === item.key}
                aria-pressed={state[item.key]}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                  state[item.key] ? 'bg-em' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    state[item.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Data rights */}
      {/* <div className="border border-bdr rounded-lg p-6 space-y-3 bg-elevated">
        <h2 className="text-lg font-normal text-ink">Your Data</h2>
        <p className="text-sm text-ink-2">
          Under India&apos;s Digital Personal Data Protection Act, you can request a copy of your
          data or ask us to delete your account. Read our{' '}
          <a href="/privacy" className="text-em hover:underline">
            Privacy Policy
          </a>{' '}
          for details.
        </p>
        <Link
          href="/contact"
          className="inline-block text-sm font-medium text-em hover:underline"
        >
          Request data export or deletion →
        </Link>
      </div> */}

      <p className="text-xs text-ink-3">
        Notification channels ( email ) are managed on the{' '}
        <Link href="/dashboard/settings/notifications" className="text-em hover:underline">
          Notifications
        </Link>{' '}
        page.
      </p>
    </div>
  );
}
