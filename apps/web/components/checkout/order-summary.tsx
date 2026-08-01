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
  // Packaging + add-ons are shown as their own line items (like products),
  // each with a per-unit price. `price` is per pack; packQuantity multiplies it.
  packaging?: { name: string; price: number } | null;
  addons?: { name: string; price: number }[];
  deliveryMode: string;
  onEdit: () => void;
  logo?: string;
}

export function OrderSummary({
  products,
  packQuantity,
  packaging,
  addons = [],
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
          className="text-xs font-medium text-[#800020] hover:underline"
        >
          Edit Order ←
        </button>
      </div>

      <div className="space-y-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 py-2.5 pb-3 border-b border-[#E5DFD4] last:border-0"
          >
            <div className="w-12 h-12 bg-[#FAFAFA] rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
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
              <p className="text-xs text-[#8F8A82]">
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

        {/* Small heading to separate packaging & add-ons from the products
            above, while keeping everything inside the same summary box. */}
        {(packaging || addons.length > 0) && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8F8A82] pt-1">
            Packaging &amp; Add-ons
          </p>
        )}

        {/* Packaging — shown as its own line item, matching the product rows. */}
        {packaging && (
          <div className="flex items-center gap-3 py-2.5 pb-3 border-b border-[#E5DFD4] last:border-0">
            <div className="w-12 h-12 bg-[#FAFAFA] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🎁</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{packaging.name}</p>
              <p className="text-xs text-[#8F8A82]">Packaging</p>
            </div>
            <p className="text-sm font-semibold text-right flex-shrink-0 tabular-nums">
              {formatRupees(packaging.price)} ×{packQuantity}
            </p>
          </div>
        )}

        {/* Add-ons — one line item each, priced per pack. */}
        {addons.map((addon, i) => (
          <div
            key={`addon-${i}`}
            className="flex items-center gap-3 py-2.5 pb-3 border-b border-[#E5DFD4] last:border-0"
          >
            <div className="w-12 h-12 bg-[#FAFAFA] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-lg">✨</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{addon.name}</p>
              <p className="text-xs text-[#8F8A82]">Add-on</p>
            </div>
            <p className="text-sm font-semibold text-right flex-shrink-0 tabular-nums">
              {formatRupees(addon.price)} ×{packQuantity}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-[#E5DFD4] pt-3 mt-3 flex justify-between items-center text-xs text-[#5C5852]">
        <span>{deliveryMode === 'individual' ? 'Individual delivery' : 'Bulk delivery'}</span>
        <span className="font-semibold text-[#222222]">{packQuantity} packs</span>
      </div>

      {logo && (
        <div className="text-xs text-[#8F8A82] mt-2">🎨 Logo uploaded</div>
      )}
    </div>
  );
}
