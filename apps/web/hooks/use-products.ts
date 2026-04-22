'use client';

import { useQuery } from '@tanstack/react-query';
import { CatalogFilters } from './use-catalog-filters';

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  sku: string;
  status: string;
  priceTiers?: Array<{
    tier: number;
    sellPrice: number;
    minQty: number;
  }>;
  images?: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
  isEcoCertified?: boolean;
  printingTechnique?: string;
}

export function useProducts(filters: Partial<CatalogFilters> = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      if (filters.occasionId) params.set('occasionId', filters.occasionId);
      if (filters.brand) params.set('brand', filters.brand);
      if (filters.eco) params.set('eco', 'true');
      if (filters.hasBranding) params.set('hasBranding', 'true');
      if (filters.priceMin) params.set('priceMin', String(filters.priceMin));
      if (filters.priceMax) params.set('priceMax', String(filters.priceMax));
      if (filters.page) params.set('page', String(filters.page));
      if (filters.sort && filters.sort !== 'featured') params.set('sort', filters.sort);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/${slug}`);
      if (!res.ok) throw new Error('Product not found');
      return res.json();
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export interface CatalogFiltersData {
  categories: any[];
  occasions: any[];
  brands: string[];
  minPrice: number;
  maxPrice: number;
}

export function useCatalogFiltersData() {
  return useQuery({
    queryKey: ['catalog-filters'],
    queryFn: async () => {
      const res = await fetch('/api/catalog/filters');
      if (!res.ok) throw new Error('Failed to fetch filters');
      return res.json() as Promise<CatalogFiltersData>;
    },
    staleTime: 5 * 60_000,
  });
}

export function useHsnCodes() {
  return useQuery({
    queryKey: ['hsn-codes'],
    queryFn: async () => {
      const res = await fetch('/api/hsn');
      if (!res.ok) throw new Error('Failed to fetch HSN codes');
      return res.json();
    },
    staleTime: 10 * 60_000,
  });
}

export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await fetch('/api/vendors');
      if (!res.ok) throw new Error('Failed to fetch vendors');
      return res.json();
    },
    staleTime: 10 * 60_000,
  });
}

export function useShippingEstimate(pincode: string) {
  return useQuery({
    queryKey: ['shipping-estimate', pincode],
    queryFn: async () => {
      const res = await fetch(`/api/shipping/estimate?pincode=${pincode}`);
      if (!res.ok) throw new Error('Shipping not available');
      return res.json();
    },
    enabled: !!pincode && /^\d{6}$/.test(pincode),
    staleTime: 60_000,
  });
}
