'use client';

import { useState, useRef } from 'react';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { Upload, X, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

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
  const {
    logo,
    setLogo,
    packaging,
    setPackaging,
    sleeve,
    setSleeve,
    addons,
    addAddon,
    removeAddon,
    cardMessage,
    setCardMessage,
    brandingNotes,
    setBrandingNotes,
    products: selectedProducts,
    packQuantity,
  } = useBuilderStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (JPG, PNG, SVG, AI, EPS, PDF)
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.svg', '.ai', '.eps', '.pdf'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!hasValidExtension) {
      setLogoError('Only JPG, PNG, SVG, AI, EPS, and PDF files are allowed');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setLogoError('File size must be less than 10MB');
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
        <div className="max-w-xs">
          {!logo ? (
            <label className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-bdr bg-elevated p-4 cursor-pointer hover:border-em transition">
              <Upload className="h-6 w-6 text-ink-3 mb-2" />
              <p className="text-xs font-semibold text-ink-2">Upload your logo</p>
              <p className="text-[10px] text-ink-3 mt-1 text-center">JPG, PNG, SVG, AI, EPS, PDF • Max 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.svg,.ai,.eps,.pdf"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md bg-green-50 border-2 border-green-200 p-3 flex items-center gap-2">
                <div className="text-green-600 text-lg">✓</div>
                <div>
                  <p className="text-xs font-semibold text-green-700">Logo uploaded successfully!</p>
                  <p className="text-[10px] text-green-600 mt-0.5">{logo.file?.name || 'Ready to print'}</p>
                </div>
              </div>

              <div className="relative rounded-md border-2 border-bdr bg-white overflow-hidden">
                {logo.preview && logo.preview.includes('data:image') ? (
                  <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-4">
                    <img
                      src={logo.preview}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
                    <div className="text-center">
                      <FileIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 font-semibold">{logo.file?.name || 'File uploaded'}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{logo.file?.size ? `${(logo.file.size / 1024).toFixed(1)} KB` : ''}</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={clearLogo}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shadow-md"
                  title="Remove logo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          {logoError && <p className="text-xs text-red-600 mt-2">{logoError}</p>}
        </div>
      </div>

      {/* Printing Info */}
      {printingTechniques.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Printing Details</p>
          <div className="flex flex-wrap gap-2">
            {printingTechniques.map((technique) => (
              <div
                key={technique}
                className="rounded-md-p bg-indigo-100 text-indigo-700 px-3 py-1.5 text-xs font-semibold"
              >
                {PRINTING_TECHNIQUES[technique] || technique}
              </div>
            ))}
          </div>
          <div className="rounded-md bg-amber-50/50 border border-amber-200 p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">Note</p>
            <p className="text-xs text-amber-600 leading-relaxed">
              Printing cost is included in your pack price. Our team will reach out to confirm your design and placement preferences.
            </p>
          </div>
        </div>
      )}

      {/* Branding Notes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Branding Notes</p>
          <p className="text-xs text-ink-3">{brandingNotes.length}/500</p>
        </div>
        <Textarea
          placeholder="Any special instructions for our design team (e.g. color preferences, placement details)..."
          value={brandingNotes}
          onChange={(e) => setBrandingNotes(e.target.value.slice(0, 500))}
          className="rounded-md border-2 min-h-24"
        />
      </div>

      {/* Packaging Selection */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">Packaging</p>
          <Select
            value={packaging?.id || ''}
            onChange={(e) => {
              const selected = packagingOptions.find((p) => p.id === e.target.value);
              setPackaging(selected || null);
            }}
          >
            <option value="">Select a packaging option</option>
            {packagingOptions.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} {pkg.price > 0 ? `(+${formatRupees(pkg.price)})` : '(Included)'}
              </option>
            ))}
          </Select>
        </div>

        {/* Optional: Show cards view as alternative */}
        {packagingOptions.length > 0 && (
          <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
            <p className="text-xs font-semibold text-ink-3 mb-2">Or choose from cards:</p>
            <div className="grid grid-cols-2 gap-2">
              {packagingOptions.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setPackaging(packaging?.id === pkg.id ? null : pkg)}
                  className={`rounded-md border-2 p-3 text-left transition text-sm ${
                    packaging?.id === pkg.id
                      ? 'border-em bg-em-50'
                      : 'border-gray-300 hover:border-em-300 bg-white'
                  }`}
                  title={`${pkg.name} - ${pkg.price > 0 ? '+' + formatRupees(pkg.price) : 'Included'}`}
                >
                  <p className="font-semibold text-xs text-ink">{pkg.name}</p>
                  {pkg.price > 0 && (
                    <p className="text-[10px] text-ink-2 mt-1">+{formatRupees(pkg.price)}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Branded Sleeve Toggle */}
      <div className="flex items-center justify-between rounded-md border-2 border-gray-200 p-4 bg-white">
        <div>
          <p className="font-semibold text-sm text-ink">Branded Sleeve</p>
          <p className="text-xs text-ink-3 mt-1">Add a custom printed sleeve (+₹60/pack)</p>
        </div>
        <Switch checked={sleeve} onCheckedChange={setSleeve} />
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
                className={`rounded-md-p px-4 py-2 text-xs font-semibold transition ${
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

      {/* Thank-You Card Message */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Thank-You Card Message
          </p>
          <p className="text-xs text-ink-3">{cardMessage.length}/160</p>
        </div>
        <Textarea
          placeholder="Optional: Add a personalized message for your recipients..."
          value={cardMessage}
          onChange={(e) => setCardMessage(e.target.value.slice(0, 160))}
          className="rounded-md border-2 min-h-20"
        />
      </div>

      {/* Customization Summary */}
      <div className="rounded-md bg-em-50 border border-em-300 p-4">
        <div className="space-y-3">
          {packaging && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-2">Packaging:</span>
              <span className="font-semibold text-ink">{packaging.name}</span>
            </div>
          )}
          {sleeve && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-2">Branded Sleeve:</span>
              <span className="font-semibold text-ink">+{formatRupees(60 * packQuantity)}</span>
            </div>
          )}
          {addons.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-2">Add-ons ({addons.length}):</span>
                <span className="font-semibold text-ink">{formatRupees(addonsTotal * packQuantity)}</span>
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
      <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
        <p className="text-xs font-semibold text-blue-900 mb-1">💡 What's Next?</p>
        <p className="text-xs text-blue-800 leading-relaxed">
          In the next steps, you'll confirm your delivery location, review the final pricing, and place your order.
        </p>
      </div>
    </div>
  );
}
