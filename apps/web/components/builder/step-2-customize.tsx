'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { Upload, X, FileIcon, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  packagingSizeForCount,
  packagingId,
  priceForSize,
} from '@/lib/packaging-designs';

interface Packaging {
  id: string;
  name: string;
  price: number;
  sizePrices?: Record<string, number> | null;
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
  description?: string | null;
  imageUrl?: string | null;
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

/** Every section on this step is a clean white card. */
const SECTION = 'rounded-2xl bg-white p-5 md:p-6 shadow-sm';

// Sentinel id for the zero-cost "No Box" packaging choice. Not a real
// packaging product — the pack simply ships without a gift box.
const NO_BOX_ID = 'no-box';

export function Step2Customize({ packagingOptions, addonOptions }: StepProps) {
  const {
    logo,
    setLogo,
    packaging,
    setPackaging,
    addons,
    addAddon,
    removeAddon,
    cardMessage,
    setCardMessage,
    brandingNotes,
    setBrandingNotes,
    products: selectedProducts,
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

  // The thank-you card message is only meaningful if the card add-on is in the
  // pack — there's nothing to print it on otherwise.
  const cardAddon = addonOptions.find((a) => /thank/i.test(a.name) && /card/i.test(a.name));
  const cardAddonSelected = !!cardAddon && addons.some((a) => a.id === cardAddon.id);

  const toggleAddon = (addon: Addon) => {
    if (addons.some((a) => a.id === addon.id)) {
      removeAddon(addon.id);
      // Dropping the card add-on drops the message that would have gone on it.
      if (cardAddon && addon.id === cardAddon.id) setCardMessage('');
    } else {
      addAddon({
        id: addon.id,
        name: addon.name,
        price: addon.price,
        imageUrl: addon.imageUrl ?? null,
      });
    }
  };

  // The customer only picks a box DESIGN. The size (Small/Medium/Large) is
  // decided automatically from how many products are in the pack, and locked.
  const autoSize = packagingSizeForCount(selectedProducts.length);
  // Which design (packaging product) the current selection belongs to.
  const selectedDesign = packaging
    ? packagingOptions.find((d) => packaging.id.startsWith(d.id + "-"))
    : undefined;
  const noBoxSelected = packaging?.id === NO_BOX_ID;

  // Keep the selected packaging in sync with the auto size: if the pack grows or
  // shrinks into a new size band, re-price the chosen design to the new size.
  // Also clear any stale packaging (e.g. an old box no longer offered) so the
  // customer picks one of the current designs.
  useEffect(() => {
    if (!packaging) return;
    // "No Box" is a fixed zero-cost choice — it has no design or size to sync.
    if (packaging.id === NO_BOX_ID) return;
    const design = packagingOptions.find((d) => packaging.id.startsWith(d.id + "-"));
    if (!design) {
      setPackaging(null);
      return;
    }
    const id = packagingId(design.id, autoSize);
    if (packaging.id !== id) {
      setPackaging({
        id,
        name: design.name,
        price: priceForSize(design, autoSize),
        size: autoSize,
        imageUrl: design.imageUrl ?? null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSize, packaging?.id, packagingOptions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="overline text-ink-3">STEP 02</p>
        <h2 className="text-3xl font-black mt-1">Customize Your Pack</h2>
      </div>

      {/* Logo — upload on the left, the saved-logo library beside it on the right */}
      <div className={SECTION}>
        <div className={`grid gap-6 ${savedLogos.length > 0 ? 'md:grid-cols-2' : ''}`}>
        <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Your Logo</p>

        {logo ? (
          /* Uploaded — the dropzone is replaced by the logo itself. */
          <div className="flex items-start gap-4">
            <div className="relative h-28 w-28 flex-shrink-0 rounded-md border-2 border-bdr bg-gray-50 flex items-center justify-center overflow-hidden">
              {isImageName(logo.name) ? (
                <img src={logo.url} alt="Logo preview" className="max-h-full max-w-full object-contain p-2" />
              ) : (
                <FileIcon className="h-9 w-9 text-gray-400" />
              )}
              <button
                onClick={clearLogo}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white text-ink-3 shadow-sm border border-bdr flex items-center justify-center transition hover:text-red-600 hover:border-red-300"
                title="Remove logo"
                aria-label="Remove logo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink line-clamp-1">{logo.name || 'Logo uploaded'}</p>
              <p className="text-xs font-semibold text-em mt-0.5">✓ Ready to print</p>

              <label
                className={`mt-3 inline-flex items-center gap-1.5 rounded-md-p border-2 border-bdr px-3 py-1.5 text-xs font-semibold text-ink transition ${
                  uploading ? 'cursor-wait opacity-70' : 'cursor-pointer hover:border-em'
                }`}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {uploading ? 'Uploading…' : 'Upload again'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.svg,.ai,.eps,.pdf"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ) : (
          <label
            className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed border-bdr bg-elevated p-5 transition ${
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
        )}

        {logoError && (
          <div>
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
          <div className="space-y-2 border-t border-bdr pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
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
        </div>
      </div>

      {/* Branding Notes */}
      <div className={`${SECTION} space-y-3`}>
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
      <div className={`${SECTION} space-y-4`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Select Your Packaging <span className="text-red-500">*</span>
          </p>
        
          <div className="flex items-center gap-3">
         
            {!noBoxSelected && (
              <span
                title={`Box size ${autoSize}, set automatically from your pack`}
                className="flex-shrink-0 rounded-full bg-sky-600 text-white text-[10px] font-black px-2.5 py-1 tracking-wide"
              >
                {autoSize.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {packagingOptions.length === 0 ? (
          <p className="text-sm text-ink-3">No packaging designs available yet.</p>
        ) : (
          <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
            <div className="flex w-max gap-3">
              {/* "No Box" — explicit zero-cost choice for buyers who don't
                  want a gift box. Counts as a selection so the step validates. */}
              <motion.button
                onClick={() =>
                  setPackaging({
                    id: NO_BOX_ID,
                    name: 'No Box',
                    price: 0,
                    // No size — there's no box, so summaries/PDFs skip the size line.
                    imageUrl: null,
                  })
                }
                className={`group flex-shrink-0 w-40 rounded-md border-2 overflow-hidden transition-all hover:shadow-lg ${
                  noBoxSelected
                    ? 'border-em bg-em-50 shadow-md'
                    : 'border-bdr bg-white hover:border-em-300'
                }`}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                  <div className="text-center">
                    <div className="text-5xl mb-2">🚫</div>
                    <p className="text-xs text-gray-500 font-semibold">No Box</p>
                  </div>
                  {noBoxSelected && (
                    <div className="absolute inset-0 bg-em/10 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-em text-white flex items-center justify-center text-lg font-bold">
                        ✓
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <p className="font-bold text-sm text-ink">No Box</p>
                   
                    <p className="hidden lg:block text-xs text-ink-3 mt-1 line-clamp-2">
                      Ship the products without a gift box
                    </p>
                  </div>
                  <div>
                    {/* <p className="hidden lg:block text-xs text-ink-3">Add cost</p> */}
                    <p className="text-sm font-black text-em">+{formatRupees(0)}</p>
                  </div>
                </div>
              </motion.button>

              {packagingOptions.map((design) => {
                const isSelected = selectedDesign?.id === design.id;
                const price = priceForSize(design, autoSize);

                return (
                  <motion.button
                    key={design.id}
                    onClick={() =>
                      setPackaging({
                        id: packagingId(design.id, autoSize),
                        name: design.name,
                        price,
                        size: autoSize,
                        imageUrl: design.imageUrl ?? null,
                      })
                    }
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
                      {design.imageUrl ? (
                        <img
                          src={design.imageUrl}
                          alt={design.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="text-center">
                          <div className="text-5xl mb-2">📦</div>
                          <p className="text-xs text-gray-500 font-semibold">{design.name}</p>
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
                    </div>

                    {/* Content Section */}
                    <div className="p-3 space-y-2">
                      <div>
                        <p className="font-bold text-sm text-ink line-clamp-2">{design.name}</p>
                        {/* {design.description && (
                          <p className="hidden lg:block text-xs text-ink-3 mt-1 line-clamp-2">{design.description}</p>
                        )} */}
                      </div>

                      {/* Price */}
                      <div>
                        {/* <p className="hidden lg:block text-xs text-ink-3">Add cost</p> */}
                        <p className="text-sm font-black text-em">+{formatRupees(price)}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add-ons Selection — same card treatment as packaging */}
      <div className={`${SECTION} space-y-4`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Add-Ons</p>

        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="flex w-max gap-3">
            {addonOptions.map((addon) => {
              const isSelected = addons.some((a) => a.id === addon.id);
              const isFree = addon.price === 0;

              return (
                <motion.button
                  key={addon.id}
                  onClick={() => toggleAddon(addon)}
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
                    {addon.imageUrl ? (
                      <img
                        src={addon.imageUrl}
                        alt={addon.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-5xl mb-2">🎀</div>
                        <p className="text-xs text-gray-500 font-semibold">{addon.name}</p>
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

                    {/* Free Badge */}
                    {isFree && (
                      <div className="absolute top-2 right-2 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-1">
                        Free
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-3 space-y-2">
                    <div>
                      <p className="font-bold text-sm text-ink line-clamp-2">{addon.name}</p>
                      {/* {addon.description && (
                        <p className="hidden lg:block text-xs text-ink-3 mt-1 line-clamp-2">{addon.description}</p>
                      )} */}
                    </div>

                    {/* Price */}
                    {addon.price > 0 ? (
                      <div>
                        {/* <p className="hidden lg:block text-xs text-ink-3">Add cost</p> */}
                        <p className="text-sm font-black text-em">+{formatRupees(addon.price)}</p>
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
      </div>

      {/* Thank-You Card Message — appears only once the card add-on is in the pack */}
      {cardAddonSelected && (
        <div className={`${SECTION} space-y-3`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              Thank-You Card Message
            </p>
            <p className="text-xs text-ink-3">{cardMessage.length}/160</p>
          </div>
          <Textarea
            placeholder="Add a personalized message for your recipients..."
            value={cardMessage}
            onChange={(e) => setCardMessage(e.target.value.slice(0, 160))}
            className="rounded-md border-2 min-h-20"
          />
        </div>
      )}
      {/* The packaging + add-ons summary now lives in the "Your Gift Pack" panel
          on the right (GiftPackSummary), so it's not repeated on the page here. */}
    </div>
  );
}
