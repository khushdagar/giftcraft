import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Rows per page on admin list screens. */
export const ADMIN_PAGE_SIZE = 15;

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Resolve `?page=` into the numbers a Prisma query needs. Out-of-range or junk
 * values fall back to page 1.
 */
export function adminPaging(searchParams: SearchParams | undefined, pageSize: number = ADMIN_PAGE_SIZE) {
  const raw = Array.isArray(searchParams?.page) ? searchParams?.page[0] : searchParams?.page;
  const parsed = Number.parseInt(raw || '1', 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Page numbers to show: first, last, and a window around the current page. */
function pageWindow(page: number, pages: number): (number | 'gap')[] {
  const keep = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  list.forEach((n, i) => {
    if (i > 0 && n - list[i - 1]! > 1) out.push('gap');
    out.push(n);
  });
  return out;
}

const BTN =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors';
const IDLE = 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
const OFF = 'cursor-default border-gray-100 bg-gray-50 text-gray-300';
const ACTIVE = 'border-gray-900 bg-gray-900 text-white';

/**
 * Same footer for CLIENT-side tables (search / tabs / bulk-select held in
 * React state): buttons and a callback instead of links. The caller slices its
 * own rows — `rows.slice((page - 1) * pageSize, page * pageSize)` — and resets
 * `page` to 1 whenever its filters change.
 */
export function AdminPager({
  page,
  total,
  pageSize = ADMIN_PAGE_SIZE,
  onPageChange,
  noun = 'results',
}: {
  page: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const current = Math.min(Math.max(1, page), pages);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-gray-500"
    >
      <p className="tabular-nums">
        Showing {from}–{to} of {total} {noun}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          className={`${BTN} ${current <= 1 ? OFF : IDLE}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageWindow(current, pages).map((n, i) =>
          n === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              aria-current={n === current ? 'page' : undefined}
              onClick={() => onPageChange(n)}
              className={`${BTN} tabular-nums ${n === current ? ACTIVE : IDLE}`}
            >
              {n}
            </button>
          )
        )}
        <button
          type="button"
          aria-label="Next page"
          disabled={current >= pages}
          onClick={() => onPageChange(current + 1)}
          className={`${BTN} ${current >= pages ? OFF : IDLE}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

/**
 * Pagination footer for admin list pages (Shopify-calm, server-rendered).
 * Links keep every other query param (filters, search, tabs) and only swap
 * `page`. Renders nothing when everything fits on one page.
 */
export function AdminPagination({
  basePath,
  page,
  total,
  pageSize = ADMIN_PAGE_SIZE,
  searchParams,
  noun = 'results',
}: {
  basePath: string;
  page: number;
  total: number;
  pageSize?: number;
  searchParams?: SearchParams;
  /** Plural label for the count line, e.g. "proposals". */
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const current = Math.min(page, pages);
  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (key === 'page' || value == null) continue;
      for (const v of Array.isArray(value) ? value : [value]) if (v) params.append(key, v);
    }
    if (target > 1) params.set('page', String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  const btn =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors';
  const idle = 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
  const off = 'pointer-events-none border-gray-100 bg-gray-50 text-gray-300';

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-gray-500"
    >
      <p className="tabular-nums">
        Showing {from}–{to} of {total} {noun}
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={href(current - 1)}
          aria-label="Previous page"
          aria-disabled={current <= 1}
          tabIndex={current <= 1 ? -1 : undefined}
          className={`${btn} ${current <= 1 ? off : idle}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        {pageWindow(current, pages).map((n, i) =>
          n === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <Link
              key={n}
              href={href(n)}
              aria-current={n === current ? 'page' : undefined}
              className={`${btn} tabular-nums ${
                n === current ? 'border-gray-900 bg-gray-900 text-white' : idle
              }`}
            >
              {n}
            </Link>
          )
        )}
        <Link
          href={href(current + 1)}
          aria-label="Next page"
          aria-disabled={current >= pages}
          tabIndex={current >= pages ? -1 : undefined}
          className={`${btn} ${current >= pages ? off : idle}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </nav>
  );
}
