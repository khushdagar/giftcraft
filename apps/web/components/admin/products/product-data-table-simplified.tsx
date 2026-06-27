'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  slug: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  images: Array<{ url: string; isPrimary: boolean }>;
  priceTiers: Array<{ sellPrice: number }>;
  categories: Array<{ category: { name: string } }>;
}

interface Props {
  products: Product[];
  total: number;
}

export function ProductDataTableSimplified({ products, total }: Props) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700';
      case 'draft':
        return 'bg-amber-100 text-amber-700';
      case 'archived':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="text-sm text-ink-2">
        Showing <strong>{products.length}</strong> of <strong>{total}</strong> products
      </div>

      {/* Product Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="border-2 border-bdr rounded-md p-4 hover:shadow-lg transition-shadow bg-white"
          >
            {/* Product Image */}
            <div className="mb-4 rounded-md overflow-hidden bg-gray-50 h-32 flex items-center justify-center border border-bdr">
              {product.images[0]?.url ? (
                <img
                  src={product.images[0].url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-ink-3">No image</span>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-3">
              {/* Name & SKU */}
              <div>
                <h3 className="font-normal text-ink text-sm">{product.name}</h3>
                <p className="text-xs text-ink-3">SKU: {product.sku}</p>
              </div>

              {/* Category & Price */}
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs">
                  {product.categories[0]?.category && (
                    <Badge variant="grey" className="text-xs">
                      {product.categories[0].category.name}
                    </Badge>
                  )}
                </div>
                <div className="font-normal text-emerald-600 text-sm">
                  ₹{product.priceTiers[0]?.sellPrice || 0}
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <Badge className={`text-xs font-normal ${getStatusColor(product.status)}`}>
                  {product.status}
                </Badge>
              </div>

              {/* Timestamps */}
              <div className="text-xs text-ink-3 space-y-1 border-t border-bdr pt-3">
                <p>Added: {formatDistanceToNow(new Date(product.createdAt), { addSuffix: true })}</p>
                <p>Updated: {formatDistanceToNow(new Date(product.updatedAt), { addSuffix: true })}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-bdr">
                <Link href={`/admin/products/${product.id}/edit`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-bdr rounded-md">
          <p className="text-ink-2 mb-4">No products yet</p>
          <Link href="/admin/products/new">
            <Button className="rounded-2xl bg-emerald-600">+ Add First Product</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
