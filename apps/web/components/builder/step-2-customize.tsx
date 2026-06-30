'use client';

import { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { Upload, X, FileIcon, Lightbulb, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { recommendPackaging } from '@/lib/packaging-calculator';

interface Packaging {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  imageUrl?: string | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
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
  const [needsLogin, setNeedsLogin] = useState(false);
  const [uploading, setUploading] = useState(false);

  // "Your Saved Logos" — previously uploaded logos from the brand asset library.
  const { data: savedLogos = [], refetch: refetchSavedLogos } = useQuery({
    queryKey: ['brand-assets'],
    queryFn: async () => {
      const res = await fetch('/api/brand-assets');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.assets || []) as Array<{ id: string; name: string; url: string }>;
    },
  });

  const isImageName = (name: string) => /\.(png|jpe?g|svg)$/i.test(name);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Upload to Digital Ocean Spaces + save to the brand asset library.
    setLogoError(null);
    setNeedsLogin(false);
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/brand-assets', { method: 'POST', body });
      // Not signed in — surface a login link instead of a dead-end error.
      if (res.status === 401) {
        setNeedsLogin(true);
        setLogoError('Please sign in to upload your logo.');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      setLogo({ url: data.url, name: data.name });
      refetchSavedLogos();
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearLogo = () => {
    setLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get unique printing techniques from selected products
  const printingTechniques = Array.from(
    new Set(selectedProducts.map((p) => p.printingTechnique).filter(Boolean))
  ) as string[];

  // Calculate packaging recommendation from the products' real dimensions.
  const recommendation = useMemo(() => {
    if (selectedProducts.length === 0) return null;

    const productsForCalculation = selectedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      lengthCm: (p as any).dimensionL ?? (p as any).lengthCm,
      widthCm: (p as any).dimensionW ?? (p as any).widthCm,
      heightCm: (p as any).dimensionH ?? (p as any).heightCm,
      quantity: p.quantity || 1,
    }));

    return recommendPackaging(productsForCalculation, packagingOptions);
  }, [selectedProducts, packagingOptions]);

  const suggestedPackaging = recommendation?.box ?? null;
  const recommendationFits = recommendation?.fits ?? false;

  // Number(...) guards against Decimal-as-string values, which would make `+`
  // concatenate instead of add.
  const addonsTotal = addons.reduce((sum, a) => sum + Number(a.price), 0);
  const packagingTotal = Number(packaging?.price) || 0;

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
            <label
              className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed border-bdr bg-elevated p-4 transition ${
                uploading ? 'cursor-wait opacity-70' : 'cursor-pointer hover:border-em'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 text-em mb-2 animate-spin" />
                  <p className="text-xs font-semibold text-ink-2">Uploading…</p>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-ink-3 mb-2" />
                  <p className="text-xs font-semibold text-ink-2">Upload your logo</p>
                  <p className="text-[10px] text-ink-3 mt-1 text-center">JPG, PNG, SVG, AI, EPS, PDF • Max 10MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.svg,.ai,.eps,.pdf"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md bg-green-50 border-2 border-green-200 p-3 flex items-center gap-2">
                <div className="text-green-600 text-lg">✓</div>
                <div>
                  <p className="text-xs font-semibold text-green-700">Logo uploaded successfully!</p>
                  <p className="text-[10px] text-green-600 mt-0.5">{logo.name || 'Ready to print'}</p>
                </div>
              </div>

              <div className="relative rounded-md border-2 border-bdr bg-white overflow-hidden">
                {isImageName(logo.name) ? (
                  <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-4">
                    <img
                      src={logo.url}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
                    <div className="text-center">
                      <FileIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 font-semibold">{logo.name || 'File uploaded'}</p>
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
          {logoError && (
            <div className="mt-2">
              <p className="text-xs text-red-600">{logoError}</p>
              {needsLogin && (
                <Link
                  href="/login?from=/builder"
                  className="mt-2 inline-flex items-center gap-1 rounded-md-p bg-em px-3 py-1.5 text-xs font-semibold text-inv hover:opacity-90 transition"
                >
                  Sign in to continue →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Your Saved Logos — reuse a logo from the brand asset library (SOW §3.4.3) */}
        {savedLogos.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Your Saved Logos</p>
            <div className="flex flex-wrap gap-2">
              {savedLogos.map((asset) => {
                const isSelected = logo?.url === asset.url;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setLogo({ url: asset.url, name: asset.name })}
                    title={asset.name}
                    className={`h-16 w-16 rounded-md border-2 bg-gray-50 flex items-center justify-center overflow-hidden transition ${
                      isSelected ? 'border-em ring-2 ring-em-100' : 'border-bdr hover:border-em-300'
                    }`}
                  >
                    {isImageName(asset.name) ? (
                      <img src={asset.url} alt={asset.name} className="max-h-full max-w-full object-contain p-1" />
                    ) : (
                      <FileIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Branding application note (SOW §3.3.9) */}
        <p className="text-[11px] text-ink-3 leading-relaxed max-w-md">
          Your logo will be applied using the product&apos;s standard printing technique.
          Final placement is confirmed during the design approval stage after you place your order.
        </p>
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

      {/* Packaging Selection - Drag-to-Scroll Slider */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Select Your Packaging</p>
          <p className="text-xs text-ink-2">Swipe to browse • Choose the perfect box for your {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Packaging Suggestion — sized from the products' real dimensions */}
        {selectedProducts.length > 0 && suggestedPackaging && packaging?.id !== suggestedPackaging.id && (
          <div className="rounded-md bg-amber-50 border-2 border-amber-200 p-4 flex gap-3">
            <div className="flex-shrink-0 pt-0.5">
              <Lightbulb className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-amber-900">
                {recommendationFits ? 'Best-fit box for your items' : 'Closest box for your items'}
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Based on the size of your {selectedProducts.length} item{selectedProducts.length !== 1 ? 's' : ''}, we
                suggest the <span className="font-bold">{suggestedPackaging.name}</span>
                {suggestedPackaging.lengthCm && suggestedPackaging.widthCm && suggestedPackaging.heightCm
                  ? ` (${suggestedPackaging.lengthCm}×${suggestedPackaging.widthCm}×${suggestedPackaging.heightCm} cm)`
                  : ''}
                {recommendationFits
                  ? ' — the smallest box that fits.'
                  : ' — the largest box we stock. For bigger items our team will confirm a custom box.'}
              </p>
              <button
                onClick={() => setPackaging(suggestedPackaging as any)}
                className="mt-2 text-sm font-semibold text-amber-700 hover:text-amber-900 underline"
              >
                Select this packaging →
              </button>
            </div>
          </div>
        )}

        {/* No dimensioned box fits the pack — be honest rather than guess */}
        {selectedProducts.length > 0 && !suggestedPackaging && (
          <div className="rounded-md bg-sky-50 border-2 border-sky-200 p-4 flex gap-3">
            <div className="flex-shrink-0 pt-0.5">
              <Lightbulb className="h-5 w-5 text-sky-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-sky-900">We'll size a custom box</p>
              <p className="text-sm text-sky-800 mt-1">
                Your {selectedProducts.length} item{selectedProducts.length !== 1 ? 's' : ''} need a larger or custom
                box. Pick any option below and our team will confirm the perfect fit for your order.
              </p>
            </div>
          </div>
        )}

        {packagingOptions.length > 0 && (
          <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
            <div className="flex w-max gap-3">
              {packagingOptions.map((pkg) => {
                const isSelected = packaging?.id === pkg.id;
                const isIncluded = pkg.price === 0;

                return (
                  <motion.button
                    key={pkg.id}
                    onClick={() => setPackaging(isSelected ? null : pkg)}
                    className={`group flex-shrink-0 w-40 rounded-md border-2 overflow-hidden transition-all hover:shadow-lg ${
                      isSelected
                        ? 'border-em bg-em-50 shadow-md'
                        : 'border-bdr bg-white hover:border-em-300'
                    }`}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Image Section */}
                    <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                      {pkg.imageUrl ? (
                        <img
                          src={pkg.imageUrl}
                          alt={pkg.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="text-center">
                          <div className="text-5xl mb-2">📦</div>
                          <p className="text-xs text-gray-500 font-semibold">{pkg.name}</p>
                        </div>
                      )}

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-em/10 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-em text-white flex items-center justify-center text-lg font-bold">
                            ✓
                          </div>
                        </div>
                      )}

                      {/* Included Badge */}
                      {isIncluded && (
                        <div className="absolute top-2 right-2 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-1">
                          Included
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="p-3 space-y-2">
                      <div>
                        <p className="font-bold text-sm text-ink line-clamp-2">{pkg.name}</p>
                        {pkg.description && (
                          <p className="text-xs text-ink-3 mt-1 line-clamp-2">{pkg.description}</p>
                        )}
                      </div>

                      {/* Price */}
                      {pkg.price > 0 ? (
                        <div>
                          <p className="text-xs text-ink-3">Add cost</p>
                          <p className="text-sm font-black text-em">+{formatRupees(pkg.price)}</p>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-emerald-600">Free</p>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Packaging Tips */}
        {packaging && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex gap-2">
            <span className="text-lg">📦</span>
            <div className="text-xs">
              <p className="font-semibold text-amber-900">Perfect choice!</p>
              <p className="text-amber-800 mt-0.5">{packaging.name} will beautifully hold your {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}.</p>
            </div>
          </div>
        )}
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
