'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Package, PencilLine, AlertCircle } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'order' | 'revision' | 'dispute';
  title: string;
  subtitle: string;
  href: string;
  createdAt: string;
}

const ICON = {
  order: Package,
  revision: PencilLine,
  dispute: AlertCircle,
} as const;

const ICON_STYLE = {
  order: 'bg-emerald-50 text-em-700',
  revision: 'bg-amber-50 text-amber-700',
  dispute: 'bg-rose-50 text-rose-700',
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

  // Fetch + poll every 60s.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/notifications');
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setItems(data.notifications || []);
        setCount(data.count || 0);
      } catch {
        /* ignore transient errors */
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

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
            {count > 0 && (
              <span className="text-xs text-gray-500">{count} pending</span>
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
                const Icon = ICON[n.type];
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 border-b border-gray-50 px-4 py-3 transition-colors hover:bg-gray-50 last:border-0"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${ICON_STYLE[n.type]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="truncate text-xs text-gray-500">{n.subtitle}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </Link>
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
