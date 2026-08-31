'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import type { PackFacets, PackFilters, PackPage, PackScope } from '@/lib/pack-query';

/**
 * Drives the curated-pack grid from the server, one page at a time.
 *
 * The listing pages server-render page 1 and hand it in as `initialPage`, so the
 * first paint needs no request and crawlers still see real pack links. Pressing
 * "Load more" fetches the next page; changing a filter, the search or the sort
 * starts a fresh query at page 1. The full catalogue never reaches the browser.
 *
 * `import type` above matters: lib/pack-query pulls in Prisma, and only the
 * types may cross into this client module.
 */

const EMPTY_FACETS: PackFacets = {
  categories: [],
  brands: [],
  occasions: [],
  recipients: [],
  priceBounds: { min: 0, max: 10000 },
};

function buildUrl(scope: PackScope, filters: PackFilters, page: number): string {
  const p = new URLSearchParams();
  p.set('scope', scope.kind);
  if (scope.kind !== 'all') p.set('slug', scope.slug);
  if (filters.categories.length) p.set('categories', filters.categories.join(','));
  if (filters.brands.length) p.set('brands', filters.brands.join(','));
  if (filters.occasions.length) p.set('occasions', filters.occasions.join(','));
  if (filters.recipients.length) p.set('recipients', filters.recipients.join(','));
  if (filters.priceMin != null) p.set('priceMin', String(filters.priceMin));
  if (filters.priceMax != null) p.set('priceMax', String(filters.priceMax));
  if (filters.search.trim()) p.set('search', filters.search.trim());
  if (filters.sort !== 'featured') p.set('sort', filters.sort);
  if (page > 1) p.set('page', String(page));
  return `/api/packs/list?${p.toString()}`;
}

/** Typing in the search box must not fire a request per keystroke. */
function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return settled;
}

function isUntouched(f: PackFilters): boolean {
  return (
    f.categories.length === 0 &&
    f.brands.length === 0 &&
    f.occasions.length === 0 &&
    f.recipients.length === 0 &&
    f.priceMin == null &&
    f.priceMax == null &&
    f.search.trim() === '' &&
    f.sort === 'featured'
  );
}

export function usePackListing({
  scope,
  filters,
  initialPage,
}: {
  scope: PackScope;
  filters: PackFilters;
  /** Page 1 for the unfiltered view, rendered on the server. */
  initialPage: PackPage;
}) {
  const search = useDebounced(filters.search);
  const effective = useMemo<PackFilters>(() => ({ ...filters, search }), [filters, search]);

  const untouched = isUntouched(effective);

  const query = useInfiniteQuery<PackPage>({
    // Every input that changes the result set is part of the key, so React Query
    // caches each filter combination separately and going back to one is instant.
    queryKey: ['packs', scope, effective],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(buildUrl(scope, effective, pageParam as number));
      if (!res.ok) throw new Error('Failed to load packs');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load packs');
      return json.data as PackPage;
    },
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    // The server already rendered the unfiltered first page — reuse it rather
    // than re-fetching the same rows on mount.
    initialData: untouched
      ? { pages: [initialPage], pageParams: [1] }
      : undefined,
    // Keeps the current grid on screen while the next filter combination loads,
    // instead of blanking out to a spinner on every tick.
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  const pages = query.data?.pages ?? [];
  const packs = useMemo(() => pages.flatMap((p) => p.packs), [pages]);
  const first = pages[0];

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  }, [query]);

  return {
    packs,
    total: first?.total ?? 0,
    facets: first?.facets ?? EMPTY_FACETS,
    hasMore: query.hasNextPage ?? false,
    loadMore,
    isLoadingMore: query.isFetchingNextPage,
    /** True only before any result exists — the grid has nothing to show yet. */
    isLoading: !first && query.isPending,
    /** True while a filter change is in flight and stale results are on screen. */
    isRefreshing: query.isFetching && !query.isFetchingNextPage,
    isError: query.isError,
    refetch: query.refetch,
  };
}
