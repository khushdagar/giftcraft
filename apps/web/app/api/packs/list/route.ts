import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  queryPacks,
  PACKS_PAGE_SIZE,
  type PackFilters,
  type PackScope,
} from '@/lib/pack-query';

/**
 * One page of curated packs for PacksBrowser.
 *
 * The listing pages server-render page 1 (so crawlers and first paint get real
 * pack links); every later page, and every filter or sort change, comes through
 * here. Only the matching slice crosses the wire — never the full catalogue.
 */

// Reads the request URL, so it must never be cached as a static response.
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  scope: z.enum(['all', 'budget', 'occasion']).default('all'),
  slug: z.string().trim().max(200).default(''),
  categories: z.string().default(''),
  brands: z.string().default(''),
  occasions: z.string().default(''),
  recipients: z.string().default(''),
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().nonnegative().optional(),
  search: z.string().trim().max(200).default(''),
  sort: z.enum(['featured', 'price-asc', 'price-desc']).default('featured'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

/** Multi-select facets travel as one comma-separated param to keep URLs short. */
function list(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      );
    }
    const q = parsed.data;

    // A budget or occasion scope without a slug would silently widen to the
    // whole catalogue, which is exactly the payload this endpoint exists to avoid.
    if (q.scope !== 'all' && !q.slug) {
      return NextResponse.json(
        { success: false, error: 'A slug is required for this scope' },
        { status: 400 }
      );
    }

    const scope: PackScope =
      q.scope === 'all' ? { kind: 'all' } : { kind: q.scope, slug: q.slug };

    const filters: PackFilters = {
      categories: list(q.categories),
      brands: list(q.brands),
      occasions: list(q.occasions),
      recipients: list(q.recipients),
      priceMin: q.priceMin ?? null,
      priceMax: q.priceMax ?? null,
      search: q.search,
      sort: q.sort,
    };

    const data = await queryPacks(scope, filters, q.page, PACKS_PAGE_SIZE);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/packs/list failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to load packs' }, { status: 500 });
  }
}
