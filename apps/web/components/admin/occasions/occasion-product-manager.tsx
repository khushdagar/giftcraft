'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { X, Search, Plus } from 'lucide-react';
import Image from 'next/image';

interface LinkedProduct {
  product: {
    id: string;
    name: string;
    slug: string;
    brand?: string | null;
    images: Array<{ url: string; isPrimary: boolean }>;
  };
}

interface OccasionProductManagerProps {
  occasionId: string;
  occasionName: string;
  linkedProducts: LinkedProduct[];
}

export function OccasionProductManager({
  occasionId,
  occasionName,
  linkedProducts,
}: OccasionProductManagerProps) {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [products, setProducts] = useState(linkedProducts);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearch(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`);
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      const allProducts = data.products || [];

      // Filter out already linked products
      const filtered = allProducts.filter(
        (p: any) => !products.some((lp) => lp.product.id === p.id)
      );

      setSearchResults(filtered);
    } catch (error) {
      toast.error('Failed to search products');
    } finally {
      setSearching(false);
    }
  };

  const addProduct = async (productId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/occasions/${occasionId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add product');
      }

      // Find the product and add it to the list
      const product = searchResults.find((p) => p.id === productId);
      if (product) {
        setProducts((prev) => [
          ...prev,
          {
            product: {
              id: product.id,
              name: product.name,
              slug: product.slug,
              brand: product.brand,
              images: product.images || [],
            },
          },
        ]);

        // Remove from search results
        setSearchResults((prev) => prev.filter((p) => p.id !== productId));
        toast.success(`${product.name} added to ${occasionName}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const removeProduct = async (productId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/occasions/${occasionId}/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove product');
      }

      const productName = products.find((p) => p.product.id === productId)?.product.name;
      setProducts((prev) => prev.filter((p) => p.product.id !== productId));
      toast.success(`${productName} removed from ${occasionName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-6">
      <div>
        <h2 className="text-lg font-normal text-ink mb-2">Linked Products</h2>
        <p className="text-sm text-ink-2">Manage products for this occasion</p>
      </div>

      {/* Search Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-normal text-ink mb-2">
            Add Products to "{occasionName}"
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-ink-3" />
            <Input
              type="text"
              placeholder="Search products by name, brand..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 rounded-lg"
            />
          </div>
        </div>

        {/* Search Results */}
        {search && searchResults.length > 0 && (
          <div className="bg-canvas rounded-lg border border-bdr p-4 max-h-64 overflow-y-auto">
            <p className="text-xs font-normal text-ink-2 mb-3 uppercase">
              Found {searchResults.length} products
            </p>
            <div className="space-y-2">
              {searchResults.map((product) => {
                const imageUrl = product.images?.[0]?.url;
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-bdr hover:border-em transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {imageUrl && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          <Image
                            src={imageUrl}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{product.name}</p>
                        {product.brand && (
                          <p className="text-xs text-ink-2 truncate">{product.brand}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addProduct(product.id)}
                      disabled={loading}
                      className="ml-2 flex-shrink-0 p-2 rounded-lg bg-em hover:bg-em-600 text-white transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {search && searching && (
          <div className="text-center py-4">
            <p className="text-sm text-ink-2">Searching...</p>
          </div>
        )}

        {search && searchResults.length === 0 && !searching && (
          <div className="text-center py-4 bg-canvas rounded-lg">
            <p className="text-sm text-ink-2">No products found</p>
          </div>
        )}
      </div>

      {/* Linked Products */}
      <div className="border-t border-bdr pt-6">
        <div className="mb-4">
          <h3 className="font-normal text-ink">
            Products in this occasion ({products.length})
          </h3>
          <p className="text-xs text-ink-2 mt-1">
            These products will be shown when customers browse by this occasion
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-8 bg-canvas rounded-lg border-2 border-dashed border-bdr">
            <p className="text-ink-2">No products linked yet</p>
            <p className="text-xs text-ink-3 mt-1">Search and add products above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {products.map(({ product }) => {
              const imageUrl = product.images?.[0]?.url;
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-canvas border border-bdr hover:border-em transition-colors group"
                >
                  {imageUrl && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{product.name}</p>
                    {product.brand && (
                      <p className="text-xs text-ink-2 truncate">{product.brand}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProduct(product.id)}
                    disabled={loading}
                    className="flex-shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100 bg-red-50 hover:bg-red-100 text-red-600 transition-all disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
