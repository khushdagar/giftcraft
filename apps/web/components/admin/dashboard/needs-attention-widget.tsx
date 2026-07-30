'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Package,
  PencilLine,
  AlertCircle,
  Star,
  Mail,
  Box,
  Download,
  CheckCircle2,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'order' | 'revision' | 'dispute' | 'review' | 'enquiry' | 'sample' | 'download';
  title: string;
  subtitle: string;
  href: string;
  createdAt: string;
  read: boolean;
}

const ICON = {
  order: Package,
  revision: PencilLine,
  dispute: AlertCircle,
  review: Star,
  enquiry: Mail,
  sample: Box,
  download: Download,
} as const;

const ICON_STYLE = {
  order: 'bg-emerald-50 text-em-700',
  revision: 'bg-amber-50 text-amber-700',
  dispute: 'bg-rose-50 text-rose-700',
  review: 'bg-amber-50 text-amber-700',
  enquiry: 'bg-sky-50 text-sky-700',
  sample: 'bg-violet-50 text-violet-700',
  download: 'bg-gray-100 text-gray-600',
} as const;

const TYPE_LABEL: Record<string, string> = {
  order: 'Orders',
  revision: 'Revisions',
  dispute: 'Disputes',
  review: 'Reviews',
  enquiry: 'Enquiries',
  sample: 'Samples',
  download: 'Deck downloads',
};

const TYPE_CHIP: Record<string, string> = {
  order: 'bg-emerald-50 text-em-700',
  revision: 'bg-amber-50 text-amber-700',
  dispute: 'bg-rose-50 text-rose-700',
  review: 'bg-amber-50 text-amber-700',
  enquiry: 'bg-sky-50 text-sky-700',
  sample: 'bg-violet-50 text-violet-700',
  download: 'bg-gray-100 text-gray-600',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Compact dashboard digest of the same feed as the top-bar bell: everything
 * coming in from the customer side (orders, reviews, enquiries, samples,
 * revisions, disputes, deck downloads) that still needs admin attention.
 */
export function NeedsAttentionWidget() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/notifications');
        if (!res.ok) return;
        const data = await res.json();
        if (active) setItems(data.notifications || []);
      } catch {
        /* transient — next poll reconciles */
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60000);
    // Refresh instantly when a section visit marks notifications as seen.
    const onUpdate = () => load();
    window.addEventListener('admin-notifications-updated', onUpdate);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('admin-notifications-updated', onUpdate);
    };
  }, []);

  // Items are marked "seen" when the admin actually reaches the page they
  // point to (handled globally by AdminNav watching the pathname) — NOT here
  // on click. So an item stays visible until its page was really visited, and
  // is gone when the admin returns to the dashboard.

  // Only UNSEEN items appear here — read ones stay available in the bell.
  const visible = items.filter((n) => !n.read);

  // Per-type counts for the chip row, in a stable order.
  const counts = visible.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {});
  const chipTypes = Object.keys(TYPE_LABEL).filter((t) => counts[t]);
  const unread = visible.length;

  return (
    <div className="rounded-md bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-bdr px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-normal">Needs attention</h2>
          {unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-err px-1.5 text-[10px] font-medium leading-none text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        {chipTypes.length > 0 && (
          <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
            {chipTypes.map((t) => (
              <span
                key={t}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_CHIP[t]}`}
              >
                {counts[t]} {TYPE_LABEL[t]}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 p-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-canvas" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-5">
          <CheckCircle2 className="h-4 w-4 text-suc" />
          <p className="text-[13px] text-ink-3">
            You&apos;re all caught up — nothing from customers is waiting on you.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-bdr">
          {visible.slice(0, 6).map((n) => {
            const Icon = ICON[n.type] ?? Bell;
            return (
              <Link
                key={n.id}
                href={n.href}
                className="flex items-center gap-3 px-4 py-2.5 text-[13px] transition hover:bg-canvas"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${ICON_STYLE[n.type] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{n.title}</p>
                  <p className="truncate text-[11px] text-ink-3">{n.subtitle}</p>
                </div>
                <p className="whitespace-nowrap text-[11px] text-ink-3">{timeAgo(n.createdAt)}</p>
              </Link>
            );
          })}
          {visible.length > 6 && (
            <p className="px-4 py-2 text-center text-[11px] text-ink-3">
              +{visible.length - 6} more in the notification bell above
            </p>
          )}
        </div>
      )}
    </div>
  );
}
