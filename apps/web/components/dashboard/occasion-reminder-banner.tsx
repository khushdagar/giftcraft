import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { nextOccasion } from '@/lib/occasion-dates';

/**
 * "Diwali is in 45 days — order by Sep 20" banner on the dashboard overview.
 * The order-by date backs off the event date by the same lead-time constants
 * the delivery estimates use. Renders nothing when no occasion is inside the
 * 75-day window. Server component — the dashboard subtree is force-dynamic, so
 * "today" is always current.
 */
export function OccasionReminderBanner({ savedPackCount }: { savedPackCount: number }) {
  const occasion = nextOccasion();
  if (!occasion) return null;

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-md border-2 border-gold-200 bg-gold-50 px-5 py-4">
      <span className="text-3xl" aria-hidden>
        {occasion.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">
          {occasion.name} is in {occasion.daysUntil} day{occasion.daysUntil === 1 ? '' : 's'}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-2">
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-gold-700" />
          {occasion.orderByPassed ? (
            <>Production takes time — order today to have a chance of on-time delivery.</>
          ) : (
            <>
              With production &amp; shipping time, order by{' '}
              <span className="font-semibold text-ink">{fmt(occasion.orderByDate)}</span> for
              on-time delivery.
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {savedPackCount > 0 && (
          <Link
            href="/dashboard/saved-packs"
            className="rounded-full border border-gold-200 bg-white px-4 py-2 text-xs font-semibold text-ink-2 transition hover:border-em hover:text-em"
          >
            Reorder a saved pack
          </Link>
        )}
        <Link
          href={occasion.slug ? `/occasion/${occasion.slug}` : '/builder'}
          className="rounded-full bg-em px-4 py-2 text-xs font-semibold text-white transition hover:bg-em-700"
        >
          Start a pack
        </Link>
      </div>
    </div>
  );
}
