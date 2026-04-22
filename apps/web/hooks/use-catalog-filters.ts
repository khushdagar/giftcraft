'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export interface CatalogFilters {
  search: string;
  categoryId: string;
  occasionId: string;
  brand: string;
  eco: boolean;
  hasBranding: boolean;
  priceMin?: number;
  priceMax?: number;
  sort: string;
  page: number;
}

export function useCatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<CatalogFilters>(() => {
    return {
      search: searchParams.get('search') ?? '',
      categoryId: searchParams.get('categoryId') ?? '',
      occasionId: searchParams.get('occasionId') ?? '',
      brand: searchParams.get('brand') ?? '',
      eco: searchParams.get('eco') === '1',
      hasBranding: searchParams.get('hasBranding') === '1',
      priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined,
      priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined,
      sort: searchParams.get('sort') ?? 'featured',
      page: Number(searchParams.get('page') ?? '1'),
    };
  }, [searchParams]);

  const setFilter = useCallback(
    (key: string, value: string | number | boolean | null | undefined) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else if (typeof value === 'boolean') {
        params.set(key, value ? '1' : '0');
      } else {
        params.set(key, String(value));
      }

      // Reset to page 1 when filter changes
      params.delete('page');

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  const getActiveFilters = useCallback(() => {
    const active: Record<string, any> = {};
    if (filters.search) active.search = filters.search;
    if (filters.categoryId) active.categoryId = filters.categoryId;
    if (filters.occasionId) active.occasionId = filters.occasionId;
    if (filters.brand) active.brand = filters.brand;
    if (filters.eco) active.eco = true;
    if (filters.hasBranding) active.hasBranding = true;
    if (filters.priceMin) active.priceMin = filters.priceMin;
    if (filters.priceMax) active.priceMax = filters.priceMax;
    if (filters.sort !== 'featured') active.sort = filters.sort;
    return active;
  }, [filters]);

  return { filters, setFilter, clearAll, getActiveFilters };
}
