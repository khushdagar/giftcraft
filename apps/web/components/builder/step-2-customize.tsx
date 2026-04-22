'use client';

import { useState, useRef } from 'react';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Packaging {
  id: string;
  name: string;
  price: number;
}

interface Addon {
  id: string;
  name: string;
  price: number;
}

interface Product {
  id: string;
  printingTechnique?: string;
  printingPosition?: string;
}

interface StepProps {
  packagingOptions: Packaging[];
  addonOptions: Addon[];
  products: Product[];
}

const PRINTING_TECHNIQUES: Record<string, string> = {
  screen_print: 'Screen Print',
  digital_print: 'Digital Print',
  embroidery: 'Embroidery',
  uv_print: 'UV Print',
  laser_engrave: 'Laser Engraving',
};

export function Step2Customize({ packagingOptions, addonOptions, products }: StepProps) {
  const { logo, setLogo, packaging, setPackaging, addons, addAddon, removeAddon, products: selectedProducts } = useBuilderStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setLogoError('Only JPG, PNG, and SVG files are allowed');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setLogoError('File size must be less than 5MB');
      return;
    }

    const preview = URL.createObjectURL(file);
    setLogo(file, preview);
    setLogoError(null);
  };

  const clearLogo = () => {
    setLogo(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get unique printing techniques from selected products
  const printingTechniques = Array.from(
    new Set(selectedProducts.map((p) => p.printingTechnique).filter(Boolean))
  ) as string[];

  const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
  const packagingTotal = packaging?.price || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="overline text-ink-3">STEP 02</p>
        <h2 className="text-3xl font-black mt-1">Customize Your Pack</h2>
      </div>

      {/* Logo Upload */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Your Logo</p>
        {!logo ? (
          <label className="flex flex-col items-center justify-center rounded-gc-l border-2 border-dashed border-bdr bg-elevated p-8 cursor-pointer hover:border-em transition">
            <Upload className="h-8 w-8 text-ink-3 mb-2" />
            <p className="text-sm font-semibold text-ink-2">Upload your logo</p>
            <p className="text-xs text-ink-3 mt-1">JPG, PNG, or SVG • Max 5MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.svg"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </label>
        ) : (
          <div className="relative rounded-gc-l border-2 border-bdr bg-white overflow-hidden">
            <div className="relative aspect-square bg-elevated flex items-center justify-center p-4">
              <img
                src={logo.preview || ''}
                alt="Logo preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Logo uploaded</p>
                <p className="text-xs text-ink-2 mt-1">Ready to be printed on your pack</p>
              </div>
              <button
                onClick={clearLogo}
                className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
              >
                <X className="h-4 w-4 text-ink-2" />
              </button>
            </div>
          </div>
        )}
        {logoError && <p className="text-xs text-red-600">{logoError}</p>}
      </div>

      {/* Printing Info */}
      {printingTechniques.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Printing Details</p>
          <div className="flex flex-wrap gap-2">
            {printingTechniques.map((technique) => (
              <div
                key={technique}
                className="rounded-gc-p bg-indigo-100 text-indigo-700 px-3 py-1.5 text-xs font-semibold"
              >
                {PRINTING_TECHNIQUES[technique] || technique}
              </div>
            ))}
          </div>
          <div className="rounded-gc bg-amber-50/50 border border-amber-200 p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">Note</p>
            <p className="text-xs text-amber-600 leading-relaxed">
              Printing cost is included in your pack price. Our team will reach out to confirm your design and placement preferences.
            </p>
          </div>
        </div>
      )}

      {/* Packaging Selection */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Packaging</p>
        <div className="grid grid-cols-2 gap-3">
          {packagingOptions.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setPackaging(packaging?.id === pkg.id ? null : pkg)}
              className={`rounded-gc border-2 p-4 text-left transition ${
                packaging?.id === pkg.id
                  ? 'border-em bg-em-50'
                  : 'border-bdr hover:border-em-300 bg-white'
              }`}
            >
              <p className="font-semibold text-sm text-ink">{pkg.name}</p>
              {pkg.price > 0 && (
                <p className="text-xs text-ink-2 mt-2">+{formatRupees(pkg.price)}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Add-ons Selection */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Add-Ons</p>
        <div className="flex flex-wrap gap-2">
          {addonOptions.map((addon) => {
            const isSelected = addons.some((a) => a.id === addon.id);
            return (
              <button
                key={addon.id}
                onClick={() => {
                  if (isSelected) {
                    removeAddon(addon.id);
                  } else {
                    addAddon(addon);
                  }
                }}
                className={`rounded-gc-p px-4 py-2 text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-em text-inv'
                    : 'border border-bdr text-ink hover:border-em'
                }`}
              >
                {addon.name} {addon.price > 0 ? `+${formatRupees(addon.price)}` : '(Free)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Customization Summary */}
      <div className="rounded-gc-l bg-em-50 border border-em-300 p-4">
        <div className="space-y-2">
          {packaging && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-2">Packaging:</span>
              <span className="font-semibold text-ink">{packaging.name}</span>
            </div>
          )}
          {addons.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-2">Add-ons ({addons.length}):</span>
                <span className="font-semibold text-ink">{formatRupees(addonsTotal)}</span>
              </div>
              <ul className="ml-2 space-y-1">
                {addons.map((a) => (
                  <li key={a.id} className="text-xs text-ink-2">
                    • {a.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Note */}
      <div className="rounded-gc bg-blue-50 border border-blue-200 p-4">
        <p className="text-xs font-semibold text-blue-900 mb-1">💡 What's Next?</p>
        <p className="text-xs text-blue-800 leading-relaxed">
          In the next steps, you'll confirm your delivery location, review the final pricing, and place your order.
        </p>
      </div>
    </div>
  );
}
