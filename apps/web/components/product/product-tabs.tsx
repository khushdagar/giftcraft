'use client';

import { useState } from 'react';

interface ProductTabsProps {
  description?: string;
  specifications?: string;
  designArtwork?: string;
  shippingDelivery?: string;
  samples?: string;
  packagingAddons?: string;
}

const TABS = [
  { id: 'description', label: 'Product Description' },
  { id: 'specifications', label: 'Specifications' },
  { id: 'design', label: 'Design & Artwork' },
  { id: 'shipping', label: 'Shipping & Delivery' },
  { id: 'samples', label: 'Samples' },
  { id: 'packaging', label: 'Packaging & Add-ons' },
];

export function ProductTabs({
  description = '',
  specifications = '',
  designArtwork = '',
  shippingDelivery = '',
  samples = '',
  packagingAddons = '',
}: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState('description');

  const content = {
    description,
    specifications,
    design: designArtwork,
    shipping: shippingDelivery,
    samples,
    packaging: packagingAddons,
  };

  return (
    <div className="mt-6 border-t border-bdr pt-8 pb-16">
      {/* Tab navigation */}
      <div className="flex gap-6 border-b border-bdr overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap text-sm font-medium pb-3 transition ${
              activeTab === tab.id
                ? 'border-b-2 border-em text-em'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-8 mb-8">
        {activeTab === 'description' && description && (
          <div className="prose prose-sm max-w-none text-ink">
            <p>{description}</p>
          </div>
        )}
        {activeTab === 'specifications' && specifications && (
          <div className="prose prose-sm max-w-none text-ink">
            <p>{specifications}</p>
          </div>
        )}
        {activeTab === 'design' && designArtwork && (
          <div className="prose prose-sm max-w-none text-ink">
            <p>{designArtwork}</p>
          </div>
        )}
        {activeTab === 'shipping' && shippingDelivery && (
          <div className="prose prose-sm max-w-none text-ink">
            <p>{shippingDelivery}</p>
          </div>
        )}
        {activeTab === 'samples' && samples && (
          <div className="prose prose-sm max-w-none text-ink">
            <p>{samples}</p>
          </div>
        )}
        {activeTab === 'packaging' && packagingAddons && (
          <div className="prose prose-sm max-w-none text-ink">
            <p>{packagingAddons}</p>
          </div>
        )}

        {/* Empty state */}
        {!content[activeTab as keyof typeof content] && (
          <p className="text-sm text-ink-3">No information available for this section.</p>
        )}
      </div>
    </div>
  );
}
