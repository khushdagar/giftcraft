import { ASSEMBLY_QC_DAYS, DEFAULT_LEAD_TIME_DAYS } from '@/lib/shipping';

// Upcoming gifting occasions with their calendar dates. Festival dates (lunar
// calendar) shift every year — EXTEND/CORRECT THIS LIST each year; entries in
// the past are ignored automatically, so stale rows are harmless.
//
// `slug` links the banner CTA to an existing /occasion/<slug> landing page when
// one exists; entries without a slug fall back to the builder.
export interface OccasionEvent {
  name: string;
  emoji: string;
  date: string; // YYYY-MM-DD (IST)
  slug?: string;
}

export const OCCASION_EVENTS: OccasionEvent[] = [
  { name: 'Raksha Bandhan', emoji: '🪢', date: '2026-08-28', slug: 'raksha-bandhan' },
  { name: 'Ganesh Chaturthi', emoji: '🐘', date: '2026-09-14' },
  { name: 'Dussehra', emoji: '🏹', date: '2026-10-20' },
  { name: 'Diwali', emoji: '🪔', date: '2026-11-08', slug: 'diwali' },
  { name: 'Christmas', emoji: '🎄', date: '2026-12-25', slug: 'christmas' },
  { name: 'New Year', emoji: '🎉', date: '2027-01-01', slug: 'new-year' },
  { name: 'Republic Day', emoji: '🇮🇳', date: '2027-01-26' },
  { name: "Women's Day", emoji: '💐', date: '2027-03-08', slug: 'womens-day' },
  { name: 'Holi', emoji: '🎨', date: '2027-03-22' },
  { name: 'Diwali', emoji: '🪔', date: '2027-10-29', slug: 'diwali' },
];

// Days a buyer must leave between ordering and the event: vendor lead time +
// in-house assembly/QC + a courier buffer. Same constants the delivery
// estimates use, so the "order by" date is consistent with them.
const COURIER_BUFFER_DAYS = 7;
export const ORDER_BUFFER_DAYS = DEFAULT_LEAD_TIME_DAYS + ASSEMBLY_QC_DAYS + COURIER_BUFFER_DAYS;

export interface UpcomingOccasion extends OccasionEvent {
  daysUntil: number;
  orderByDate: Date;
  /** True once the safe order-by date has passed (rush territory). */
  orderByPassed: boolean;
}

/**
 * The next occasion within `windowDays` days, or null. Events are checked in
 * date order, so overlapping windows resolve to the nearest event.
 */
export function nextOccasion(windowDays = 75, now = new Date()): UpcomingOccasion | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const ev of [...OCCASION_EVENTS].sort((a, b) => a.date.localeCompare(b.date))) {
    const date = new Date(`${ev.date}T00:00:00+05:30`);
    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
    if (daysUntil < 0 || daysUntil > windowDays) continue;
    const orderByDate = new Date(date);
    orderByDate.setDate(orderByDate.getDate() - ORDER_BUFFER_DAYS);
    return { ...ev, daysUntil, orderByDate, orderByPassed: orderByDate < today };
  }
  return null;
}
