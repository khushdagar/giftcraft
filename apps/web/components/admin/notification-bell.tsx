'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Package,
  PencilLine,
  AlertCircle,
  CheckCheck,
  X,
  Star,
  Mail,
  Box,
  Download,
  CheckCircle2,
  IndianRupee,
  MessageSquare,
  Store,
  Send,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type:
    | 'order'
    | 'approval'
    | 'payment'
    | 'revision'
    | 'dispute'
    | 'review'
    | 'comment'
    | 'enquiry'
    | 'vendor'
    | 'sample'
    | 'download'
    | 'proposal';
  title: string;
  subtitle: string;
  href: string;
  createdAt: string;
  read: boolean;
}

const ICON = {
  order: Package,
  approval: CheckCircle2,
  payment: IndianRupee,
  revision: PencilLine,
  dispute: AlertCircle,
  review: Star,
  comment: MessageSquare,
  enquiry: Mail,
  vendor: Store,
  sample: Box,
  download: Download,
  proposal: Send,
} as const;

const ICON_STYLE = {
  order: 'bg-emerald-50 text-em-700',
  approval: 'bg-emerald-50 text-em-700',
  payment: 'bg-emerald-50 text-em-700',
  revision: 'bg-amber-50 text-amber-700',
  dispute: 'bg-rose-50 text-rose-700',
  review: 'bg-amber-50 text-amber-700',
  comment: 'bg-sky-50 text-sky-700',
  enquiry: 'bg-sky-50 text-sky-700',
  vendor: 'bg-violet-50 text-violet-700',
  sample: 'bg-violet-50 text-violet-700',
  download: 'bg-gray-100 text-gray-600',
  proposal: 'bg-indigo-50 text-indigo-700',
} as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setCount(data.count || 0);
    } catch {
      /* ignore transient errors */
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch + poll every 60s; also refresh instantly when something else marks
  // notifications read (e.g. visiting a section page counts them as seen).
  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    window.addEventListener('admin-notifications-updated', load);
    return () => {
      clearInterval(interval);
      window.removeEventListener('admin-notifications-updated', load);
    };
  }, [load]);

  // Mark the given keys read on the server. Read notifications stay visible in
  // the bell (styled as read) but drop out of the unread badge — they're only
  // removed once cleared. Optimistically flips them read so the badge updates.
  const markRead = async (keys: string[]) => {
    const set = new Set(keys);
    const wasUnread = items.filter((n) => set.has(n.id) && !n.read).length;
    if (wasUnread === 0) return;
    setItems((prev) => prev.map((n) => (set.has(n.id) ? { ...n, read: true } : n)));
    setCount((c) => Math.max(0, c - wasUnread));
    try {
      await fetch('/api/admin/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      });
    } catch {
      /* ignore — next poll will reconcile */
    }
  };

  // Clear the given keys — removes them from the bell entirely. Optimistically
  // drops them from the list and the unread badge.
  const dismiss = async (keys: string[]) => {
    if (keys.length === 0) return;
    const set = new Set(keys);
    const removedUnread = items.filter((n) => set.has(n.id) && !n.read).length;
    setItems((prev) => prev.filter((n) => !set.has(n.id)));
    setCount((c) => Math.max(0, c - removedUnread));
    try {
      await fetch('/api/admin/notifications/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      });
    } catch {
      /* ignore — next poll will reconcile */
    }
  };

  const clearAll = () => dismiss(items.map((n) => n.id));

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        aria-label={`Notifications, ${count} unread`}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 h-5 min-w-5 px-1 rounded-full bg-err flex items-center justify-center text-[10px] font-normal leading-none text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-medium text-gray-900">Notifications</p>
            {items.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-xs font-medium text-em hover:text-em-700"
                title="Clear all notifications"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                <p className="text-sm text-gray-500">You're all caught up</p>
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICON[n.type] ?? Bell;
                return (
                  <div
                    key={n.id}
                    className={`group relative flex items-center border-b border-gray-50 transition-colors last:border-0 ${
                      n.read ? 'bg-white hover:bg-gray-50' : 'bg-em-50/40 hover:bg-em-50/70'
                    }`}
                  >
                    <Link
                      href={n.href}
                      onClick={() => {
                        markRead([n.id]);
                        setOpen(false);
                      }}
                      className="flex min-w-0 flex-1 gap-3 px-4 py-3"
                    >
                      {!n.read && (
                        <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-em" />
                      )}
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${ICON_STYLE[n.type] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${
                            n.read ? 'font-normal text-gray-600' : 'font-medium text-gray-900'
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="truncate text-xs text-gray-500">{n.subtitle}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{timeAgo(n.createdAt)}</p>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dismiss([n.id]);
                      }}
                      className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-300 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
                      title="Clear notification"
                      aria-label="Clear notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <Link
            href="/admin/orders"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-4 py-2.5 text-center text-xs font-medium text-em hover:bg-gray-50"
          >
            View all orders
          </Link>
        </div>
      )}
    </div>
  );
}
