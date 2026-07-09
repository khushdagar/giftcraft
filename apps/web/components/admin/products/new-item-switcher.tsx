'use client';

import { useState } from 'react';
import { ProductForm } from './product-form';

// The "New" screen for the Products admin. A single page with a Type select at
// the top that swaps the form between a normal Product and a Curated Pack. Both
// use the SAME full product form — a pack just adds the "Pack Contents" section
// (member products + collection) and derives its price from those products.
export function NewItemSwitcher({
  initialType = 'product',
}: {
  initialType?: 'product' | 'pack';
}) {
  const [type, setType] = useState<'product' | 'pack'>(initialType);

  const tab = (label: string, value: 'product' | 'pack') => (
    <button
      type="button"
      onClick={() => setType(value)}
      className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
        type === value ? 'bg-white text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm text-ink-2">Type</span>
        <div className="inline-flex gap-1 rounded-2xl bg-elevated p-1 border border-bdr">
          {tab('Product', 'product')}
          {tab('Curated Pack', 'pack')}
        </div>
      </div>

      {/* Same form for both; isPack toggles the pack-specific fields. */}
      <ProductForm key={type} mode="create" isPack={type === 'pack'} />
    </div>
  );
}
