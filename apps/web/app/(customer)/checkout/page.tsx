'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { CheckoutNav } from '@/components/checkout/checkout-nav';
import { OrderSummary } from '@/components/checkout/order-summary';
import { BillingForm, type BillingFormData } from '@/components/checkout/billing-form';
import { ContactForm, type ContactFormData } from '@/components/checkout/contact-form';
import { PathSelection } from '@/components/checkout/path-selection';
import { PricingPanel } from '@/components/checkout/pricing-panel';
import { ProcessTimeline } from '@/components/checkout/process-timeline';
import type { PricingBreakdown } from '@giftcraft/types';
import { computePricing } from '@giftcraft/pricing';
import { computeOrderShipping } from '@/lib/shipping';
import { SELLER_STATE_CODE } from '@/lib/constants';
import { resolveBuyerStateCode } from '@/lib/pincode-to-state';

// Humanise the printing-technique slug stored on each product.
const PRINTING_TECHNIQUES: Record<string, string> = {
  screen_print: 'Screen Print',
  digital_print: 'Digital Print',
  embroidery: 'Embroidery',
  uv_print: 'UV Print',
  laser_engrave: 'Laser Engraving',
};
const humanizeTechnique = (t?: string) =>
  t ? PRINTING_TECHNIQUES[t] || t : undefined;

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface QuoteProduct {
  id: string;
  name: string;
  brand?: string;
  sellPrice: number | string;
  quantity?: number;
  hsnCode?: string;
  gstRate?: number;
  weightG?: number | null;
  dimensionL?: number | null;
  dimensionW?: number | null;
  dimensionH?: number | null;
  printingTechnique?: string;
  images?: { url: string }[];
}

interface QuotePayload {
  products: QuoteProduct[];
  packQuantity: number;
  packaging?: { id: string; name: string; price: number } | null;
  addons?: { id: string; name: string; price: number | string }[];
  sleeve?: boolean;
  pricing: PricingBreakdown;
  deliveryMode?: string;
  discount?: number;
  pincode?: string | null;
  logoUrl?: string | null;
  shippingZone?: {
    zoneName?: string;
    ratePerKg?: number;
    minCharge?: number;
    freeShippingThreshold?: number | null;
    individualSurchargePct?: number;
    flatRate?: number;
    shippingCost?: number | null;
    perPackCost?: number | null;
    courierName?: string | null;
  } | null;
  address?: {
    name?: string;
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
  } | null;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');

  // Signed-in user — used to pre-fill the contact email so the buyer doesn't
  // re-type the address they logged in with.
  const { data: session } = useSession();

  const [selectedPath, setSelectedPath] = useState<'mockup' | 'lock'>('mockup');

  const [billingData, setBillingData] = useState<BillingFormData>({
    companyName: '',
    gstin: '',
    pan: '',
    poNumber: '',
    address1: '',
    address2: '',
    city: '',
    state: 'Delhi',
    pincode: '',
  });

  const [contactData, setContactData] = useState<ContactFormData>({
    name: '',
    designation: '',
    email: '',
    phone: '',
  });

  const {
    data: quote,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['quote', quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${quoteId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Quote not found');
      }
      return res.json();
    },
  });

  const payload: QuotePayload | null = quote?.payload ?? null;

  // Saved company details (signed-in users) — pre-fill billing GST/PAN/name so
  // corporate buyers don't re-key them. Silently empty for guests.
  const { data: companyResp } = useQuery({
    queryKey: ['checkout-company'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/company');
      if (!res.ok) return null;
      return res.json() as Promise<{ success: boolean; data: any }>;
    },
  });

  useEffect(() => {
    const c = companyResp?.data;
    if (!c) return;
    setBillingData((prev) => ({
      ...prev,
      companyName: prev.companyName || c.name || '',
      gstin: prev.gstin || c.gstin || '',
      pan: prev.pan || c.pan || '',
      address1: prev.address1 || c.addressLine || '',
      city: prev.city || c.city || '',
      state: prev.state && prev.state !== 'Delhi' ? prev.state : c.state || prev.state,
      pincode: prev.pincode || c.pincode || '',
    }));
  }, [companyResp]);

  // Pre-fill the CONTACT PERSON from the delivery details captured in the
  // builder. Billing details are the COMPANY's (name, GSTIN, PAN, company
  // address) and come from the saved company profile above — we deliberately do
  // NOT copy the shipping/delivery address into the billing form.
  useEffect(() => {
    if (!payload?.address) return;
    const a = payload.address;
    setContactData((prev) => ({
      ...prev,
      name: a.name || prev.name,
      phone: a.phone || prev.phone,
    }));
  }, [payload?.address]);

  // Pre-fill the contact email from the signed-in user's account so they don't
  // enter it again. Only fills a blank field — never overwrites something the
  // buyer has already typed.
  useEffect(() => {
    const email = session?.user?.email;
    if (!email) return;
    setContactData((prev) => (prev.email ? prev : { ...prev, email }));
  }, [session?.user?.email]);

  const packQuantity = payload?.packQuantity || 0;
  const sleeve = !!payload?.sleeve;

  // Order-summary product rows (image, brand, technique, unit price). Each
  // product is one unit per pack — packQuantity is the multiplier — so we force
  // quantityPerPack to 1 here. This also self-heals older quotes that stored
  // `quantity = packQuantity` (which double-counted the pack quantity).
  const summaryProducts = useMemo(
    () =>
      (payload?.products || []).map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        image: p.images?.[0]?.url,
        technique: humanizeTechnique(p.printingTechnique),
        unitPrice: Number(p.sellPrice),
        quantityPerPack: 1,
      })),
    [payload?.products]
  );

  // Price-breakdown product lines (unit price × number of packs)
  const pricingProducts = useMemo(
    () =>
      (payload?.products || []).map((p) => ({
        name: p.name,
        technique: humanizeTechnique(p.printingTechnique),
        lineTotal: Number(p.sellPrice) * packQuantity,
      })),
    [payload?.products, packQuantity]
  );

  // Add-on lines (itemised, including the branded sleeve)
  const addonLines = useMemo(() => {
    const lines = (payload?.addons || []).map((a) => ({
      name: a.name,
      total: Number(a.price) * packQuantity,
    }));
    if (sleeve) lines.push({ name: 'Branded Sleeve', total: 60 * packQuantity });
    return lines;
  }, [payload?.addons, sleeve, packQuantity]);

  // Per-unit add-on lines for the Order Summary, where packaging and add-ons are
  // shown as line items alongside products (price × packs). The branded sleeve is
  // a ₹60/pack add-on, so it's included here too.
  const summaryAddons = useMemo(() => {
    const lines = (payload?.addons || []).map((a) => ({
      name: a.name,
      price: Number(a.price),
    }));
    if (sleeve) lines.push({ name: 'Branded Sleeve', price: 60 });
    return lines;
  }, [payload?.addons, sleeve]);

  // Recompute the price breakdown fresh from the products rather than trusting
  // the value baked into the quote. Older quotes stored `quantity = packQuantity`
  // which inflated every total by the pack count; recomputing with one unit per
  // pack (quantity = 1) keeps both display and order correct for any quote.
  const pricing = useMemo<PricingBreakdown | undefined>(() => {
    if (!payload) return undefined;
    const items = payload.products || [];
    if (items.length === 0) return payload.pricing;

    // Use the exact shipping cost quoted in the builder (Shiprocket real-time
    // rate, stored on shippingZone.shippingCost) so checkout matches the builder
    // and the server-side order total. Fall back to zone pricing for legacy quotes.
    const quotedShipping = Number(payload.shippingZone?.shippingCost);
    const shippingFlat = Number.isFinite(quotedShipping)
      ? quotedShipping
      : computeOrderShipping({
          products: items.map((p) => ({
            weightG: p.weightG,
            quantity: 1,
            sellPrice: Number(p.sellPrice),
            dimensionL: p.dimensionL,
            dimensionW: p.dimensionW,
            dimensionH: p.dimensionH,
          })),
          zone: payload.shippingZone,
          packQuantity: payload.packQuantity || 0,
          deliveryMode: payload.deliveryMode === 'individual' ? 'individual' : 'single',
        }).shippingCost;
    const addonsPerUnit =
      (payload.addons || []).reduce((sum, a) => sum + Number(a.price), 0) +
      (payload.sleeve ? 60 : 0);
    // Resolve the buyer state exactly like the server does when it persists the
    // order (api/orders/route.ts): the builder's shipping state wins, but fall
    // back to the billing-form state the customer fills in on this page — without
    // it, a missing shipping state would default to the seller's DL and wrongly
    // show CGST+SGST instead of IGST for out-of-state buyers.
    const buyerStateCode =
      resolveBuyerStateCode(
        payload.address?.state || billingData.state,
        payload.address?.pincode || payload.pincode || undefined
      ) || SELLER_STATE_CODE;

    return computePricing({
      products: items.map((p) => ({
        sellPrice: Number(p.sellPrice),
        quantity: 1, // one unit per pack; packQuantity is the multiplier
        hsnCode: p.hsnCode ?? '4820',
        gstRate: p.gstRate ?? 18,
      })),
      packagingPerUnit: Number(payload.packaging?.price) || 0,
      addonsPerUnit,
      packQuantity: payload.packQuantity || 0,
      shippingFlat,
      discount: payload.discount || 0,
      sellerStateCode: SELLER_STATE_CODE,
      buyerStateCode,
      // 2% payment-processing fee + the 18% GST Razorpay charges on it (≈2.36%
      // effective), passed through to the customer per CLAUDE.md Rule 2.
      razorpayFeePct: 2,
      razorpayFeeGstPct: 18,
    });
  }, [payload, billingData.state]);

  const advance10 = pricing ? Math.round(pricing.grandTotal * 0.1) : 0;
  const balance90 = pricing ? pricing.grandTotal - advance10 : 0;

  const [submitting, setSubmitting] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load the Razorpay checkout script once (needed only for the price-lock path).
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => console.error('Failed to load Razorpay checkout script');
    document.body.appendChild(script);
    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  const validateForms = () => {
    if (!billingData.companyName.trim()) return alert('Please enter company name'), false;
    if (!contactData.name.trim()) return alert('Please enter contact name'), false;
    if (!contactData.email.trim()) return alert('Please enter email'), false;
    if (!contactData.phone.trim()) return alert('Please enter phone'), false;
    return true;
  };

  // Billing payload shared by both checkout paths.
  const buildBillingJson = () => ({
    companyName: billingData.companyName,
    gstin: billingData.gstin,
    pan: billingData.pan,
    poNumber: billingData.poNumber,
    address1: billingData.address1,
    address2: billingData.address2,
    city: billingData.city,
    state: billingData.state,
    pincode: billingData.pincode,
    name: contactData.name,
    designation: contactData.designation,
    email: contactData.email,
    phone: contactData.phone,
  });

  // Single entrypoint from the pricing panel; branches on the selected path.
  const handleContinue = async () => {
    if (submitting) return;
    if (!validateForms()) return;
    if (selectedPath === 'lock') return handlePayAndLock();
    return handleMockupConfirm();
  };

  // Mockup path: confirm the order now, no payment taken yet (SOW §3.5).
  const handleMockupConfirm = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId,
          deliveryMode: payload?.deliveryMode,
          billingJson: buildBillingJson(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to confirm order');
      }
      const order = await res.json();
      router.push(`/checkout/confirmation?orderId=${order.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to confirm order. Please try again.');
      setSubmitting(false);
    }
  };

  // Price-lock path: collect a 10% advance via Razorpay, then create the order
  // with the verified payment so it's saved as paid.
  const handlePayAndLock = async () => {
    if (!razorpayLoaded || !window.Razorpay) {
      alert('Payment gateway is still loading. Please try again in a moment.');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create a Razorpay order server-side (amount computed from the quote).
      const orderRes = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, paymentType: 'advance', billingState: billingData.state }),
      });
      if (!orderRes.ok) {
        const body = await orderRes.json().catch(() => ({}));
        throw new Error(body.error || 'Could not start payment');
      }
      const rzp = await orderRes.json();

      // 2. Open the Razorpay checkout popup.
      const options = {
        key: rzp.keyId,
        amount: rzp.amount,
        currency: rzp.currency,
        order_id: rzp.razorpayOrderId,
        name: 'GIVOO',
        description: `10% advance — ${billingData.companyName}`,
        prefill: {
          name: contactData.name,
          email: contactData.email,
          contact: contactData.phone,
        },
        theme: { color: '#1A6B4F' },
        handler: async (response: any) => {
          // 3. Payment succeeded — create the order with the verified payment.
          try {
            const res = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                quoteId,
                deliveryMode: payload?.deliveryMode,
                billingJson: buildBillingJson(),
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                paymentType: 'advance',
              }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.error || 'Order creation failed after payment');
            }
            const order = await res.json();
            router.push(`/checkout/confirmation?orderId=${order.id}`);
          } catch (err) {
            alert(
              err instanceof Error
                ? err.message
                : 'Payment succeeded but saving the order failed. Please contact support with your payment ID.'
            );
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      };

      const instance = new window.Razorpay(options);
      instance.on('payment.failed', (resp: any) => {
        alert(`Payment failed: ${resp?.error?.description || 'Please try again.'}`);
        setSubmitting(false);
      });
      instance.open();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start payment. Please try again.');
      setSubmitting(false);
    }
  };

  // ── No quote in the URL ───────────────────────────────────────────────
  if (!quoteId) {
    return (
      <EmptyState
        title="No order to check out"
        message="Build a gift pack first, then head to checkout."
      />
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        {/* <CheckoutNav /> */}
        <main className="bg-[#FAFAF7] min-h-screen">
          <section className="py-8 md:py-12 pb-20">
            <div className="cw">
              <div className="h-10 w-48 bg-[#ECECE6] rounded-lg animate-pulse mb-6" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div className="h-40 bg-white rounded-2xl shadow-sm animate-pulse" />
                  <div className="h-64 bg-white rounded-2xl shadow-sm animate-pulse" />
                </div>
                <div className="h-96 bg-white rounded-2xl shadow-sm animate-pulse" />
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  // ── Error (not found / expired) ───────────────────────────────────────
  if (isError || !payload || !pricing) {
    return (
      <EmptyState
        title="Quote unavailable"
        message={
          (error as Error)?.message ||
          'This quote could not be loaded. It may have expired (quotes are valid for 30 days).'
        }
      />
    );
  }

  return (
    <>
      {/* <CheckoutNav /> */}

      <main className="bg-[#FAFAF7] min-h-screen">
        <section className="py-8 md:py-12 pb-20">
          <div className="cw">
            <h1 className="text-4xl md:text-5xl font-serif font-normal mb-2">Checkout.</h1>
            <p className="text-base text-[#000000] mb-8 md:mb-12">
              Review your order, provide billing details, and choose how you'd like to proceed.
            </p>

            {/* The right column stretches to the row height (grid default) so the
                sticky pricing panel inside it has room to travel — with items-start
                the column would shrink to the panel's height and sticky wouldn't hold. */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Left column - Forms */}
              <div className="lg:col-span-2 min-w-0">
                <OrderSummary
                  products={summaryProducts}
                  packQuantity={packQuantity}
                  packaging={
                    payload.packaging
                      ? { name: payload.packaging.name, price: Number(payload.packaging.price) }
                      : null
                  }
                  addons={summaryAddons}
                  deliveryMode={payload.deliveryMode || 'single'}
                  logo={payload.logoUrl || undefined}
                  onEdit={() => router.push('/builder')}
                />

                <BillingForm data={billingData} onChange={setBillingData} />

                <ContactForm data={contactData} onChange={setContactData} />

                <PathSelection
                  selectedPath={selectedPath}
                  onSelectPath={setSelectedPath}
                  advance10={advance10}
                  balance90={balance90}
                  onContinue={handleContinue}
                />

                <ProcessTimeline
                  selectedPath={selectedPath}
                  advance10={advance10}
                  balance90={balance90}
                  grand={pricing.grandTotal}
                />
              </div>

              {/* Right column - Pricing */}
              <div className="lg:col-span-1 min-w-0">
                <PricingPanel
                  products={pricingProducts}
                  packagingName={payload.packaging?.name}
                  addons={addonLines}
                  pricing={pricing}
                  advance10={advance10}
                  balance90={balance90}
                  selectedPath={selectedPath}
                  onContinue={handleContinue}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#1A1A18] text-[#FAFAF7] py-8 mt-12">
        <div className="cw">
          <p className="text-sm mb-2 font-serif italic text-opacity-40">GIVOO</p>
          <div className="flex justify-between text-xs text-[#6B6B63]">
            <span>© 2026 GIVOO. All Rights Reserved.</span>
            <span>Made with ♥ in Delhi</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <>
      {/* <CheckoutNav /> */}
      <main className="bg-[#FAFAF7] min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center max-w-md mx-4">
          <p className="text-2xl font-serif mb-2">{title}</p>
          <p className="text-sm text-[#6B6B63] mb-6">{message}</p>
          <Link
            href="/builder"
            className="inline-flex items-center justify-center rounded-full bg-[#1A6B4F] text-white px-6 py-3 font-semibold hover:bg-[#145A42] transition"
          >
            Build a Gift
          </Link>
        </div>
      </main>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="bg-[#FAFAF7] min-h-screen" />}>
      <CheckoutContent />
    </Suspense>
  );
}
