'use client';

import { formatRupees } from '@/lib/utils';

export interface CheckoutProduct {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  technique?: string;
  unitPrice: number;
  quantityPerPack: number;
}

interface OrderSummaryProps {
  products: CheckoutProduct[];
  packQuantity: number;
  packagingName?: string;
  sleeve: boolean;
  addonCount: number;
  deliveryMode: string;
  onEdit: () => void;
  logo?: string;
}

export function OrderSummary({
  products,
  packQuantity,
  packagingName,
  sleeve,
  addonCount,
  deliveryMode,
  onEdit,
  logo,
}: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-7 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium flex items-center gap-2">
          📦 Order Summary
        </h3>
        <button
          onClick={onEdit}
          className="text-xs font-medium text-[#1A6B4F] hover:underline"
        >
          Edit Order ←
        </button>
      </div>

      <div className="space-y-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 py-2.5 pb-3 border-b border-[#E8E8E3] last:border-0"
          >
            <div className="w-12 h-12 bg-[#F5F5F0] rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg">📦</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{product.name}</p>
              <p className="text-xs text-[#9B9B93]">
                {product.brand ? `${product.brand} · ` : ''}
                {product.technique && product.technique !== 'None'
                  ? product.technique
                  : 'No branding'}
                {product.quantityPerPack > 1 ? ` · ${product.quantityPerPack}/pack` : ''}
              </p>
            </div>
            <p className="text-sm font-semibold text-right flex-shrink-0 tabular-nums">
              {formatRupees(product.unitPrice)} ×{packQuantity}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-[#E8E8E3] pt-3 mt-3 flex justify-between items-center text-xs text-[#6B6B63]">
        <span>
          📦 {packagingName || 'Standard packaging'}
          {sleeve ? ' + Sleeve' : ''} · {addonCount} add-on{addonCount === 1 ? '' : 's'} ·{' '}
          {deliveryMode === 'individual' ? 'Individual delivery' : 'Bulk delivery'}
        </span>
        <span className="font-semibold text-[#1A1A18]">{packQuantity} packs</span>
      </div>

      {logo && (
        <div className="text-xs text-[#9B9B93] mt-2">🎨 Logo uploaded</div>
      )}
    </div>
  );
}
