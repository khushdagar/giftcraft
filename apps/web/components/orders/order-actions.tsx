'use client';

import Link from 'next/link';
import { ExternalLink, Link2, RotateCcw } from 'lucide-react';
import { toast } from '@/lib/stores/toast-store';

/**
 * Action row on the dashboard order detail page: open the public tracking
 * page, copy its shareable link, and rebuild the order in the gift builder.
 * The tracking page is public-by-link (no auth), so the copied URL can be
 * forwarded to anyone — recipients, finance, the boss.
 */
export function OrderActions({ orderId, reorderHref }: { orderId: string; reorderHref?: string }) {
  const copyTrackingLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/orders/${orderId}/track`);
      toast.success('Tracking link copied — anyone with it can follow this order');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const btn =
    'inline-flex items-center gap-1.5 rounded-full border border-bdr px-3.5 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-em hover:text-em';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {reorderHref && (
        <Link
          href={reorderHref}
          className="inline-flex items-center gap-1.5 rounded-full bg-em px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-em-700"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reorder
        </Link>
      )}
      <Link href={`/orders/${orderId}/track`} target="_blank" className={btn}>
        <ExternalLink className="h-3.5 w-3.5" /> Track order
      </Link>
      <button type="button" onClick={copyTrackingLink} className={btn}>
        <Link2 className="h-3.5 w-3.5" /> Copy tracking link
      </button>
    </div>
  );
}
