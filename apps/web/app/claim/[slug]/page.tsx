'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ClaimOptionCard } from '@/components/goc/claim-option-card';
import { ClaimAddressForm } from '@/components/goc/claim-address-form';
import { ClaimSuccess } from '@/components/goc/claim-success';
import { AlertCircle, Package } from 'lucide-react';
import { useTopLoading } from '@/components/ui/top-loading-bar';
import { toast } from 'sonner';

interface GocCampaign {
  id: string;
  name: string;
  slug: string;
  description: string;
  heroImage: string;
  status: string;
  expiresAt: string;
  claimLimit: number;
  options: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      slug: string;
      image: string;
      basePrice: number;
    };
  }>;
}

type FormData = {
  optionId: string;
  claimerName: string;
  claimerEmail: string;
  claimerPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
};

interface PageProps {
  params: { slug: string };
}

export default function GocClaimPage({ params }: PageProps) {
  const { slug } = params;
  const router = useRouter();

  const [campaign, setCampaign] = useState<GocCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState({ name: '', email: '' });
  const [currentStep, setCurrentStep] = useState<'options' | 'address' | 'success'>(
    'options'
  );

  // Fetch campaign data
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await fetch(`/api/goc/${slug}`);

        if (res.status === 404) {
          setError('Campaign not found');
          setLoading(false);
          return;
        }

        if (res.status === 410) {
          const data = await res.json();
          setError(data.error || 'This campaign has expired or is no longer active');
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to load campaign');
          setLoading(false);
          return;
        }

        const data = await res.json();
        setCampaign(data.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load campaign');
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [slug]);

  const handleSubmitClaim = async (formData: any) => {
    if (!selectedOptionId) {
      setError('Please select a product option');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/goc/${slug}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optionId: selectedOptionId,
          claimerName: formData.claimerName,
          claimerEmail: formData.claimerEmail,
          claimerPhone: formData.claimerPhone,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === 'You have already claimed a gift from this campaign') {
          setError(
            'You have already claimed a gift from this campaign. Check your email for details.'
          );
        } else {
          setError(data.error || 'Failed to submit claim');
        }
        setSubmitting(false);
        return;
      }

      toast.success('Claim submitted successfully!');
      setSuccessData({
        name: formData.claimerName,
        email: formData.claimerEmail,
      });
      setCurrentStep('success');
      setSubmitting(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit claim');
      setSubmitting(false);
    }
  };

  // Loading state — global top loading bar is the only indicator.
  useTopLoading(loading);
  if (loading) return null;

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-md border border-bdr p-8 max-w-md w-full text-center shadow-card"
        >
          <AlertCircle className="w-14 h-14 text-err mx-auto mb-4" />
          <h1 className="font-display text-3xl text-ink mb-2">Oops!</h1>
          <p className="text-ink-2 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 rounded-2xl bg-em text-white font-medium transition hover:bg-em-600"
          >
            Back to Home
          </a>
        </motion.div>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const selectedProduct = campaign.options.find((o) => o.id === selectedOptionId)?.product;

  // Success state
  if (currentStep === 'success') {
    return <ClaimSuccess claimerName={successData.name} claimerEmail={successData.email} />;
  }

  // Main page
  return (
    <div className="min-h-screen bg-canvas">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full overflow-hidden border-b border-bdr"
        style={
          campaign.heroImage
            ? undefined
            : { background: 'linear-gradient(135deg, #F5F1EB 0%, #FBF4F5 50%, #F5F1EB 100%)' }
        }
      >
        {campaign.heroImage && (
          <>
            <Image src={campaign.heroImage} alt={campaign.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/75 to-ink/50" />
          </>
        )}
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <p className={`overline ${campaign.heroImage ? 'text-white/80' : 'text-em-700'}`}>
            You&apos;ve received a gift
          </p>
          <h1
            className={`mt-3 font-display text-4xl leading-tight sm:text-6xl ${
              campaign.heroImage ? 'text-white' : 'text-ink'
            }`}
          >
            {campaign.name}
          </h1>
          {campaign.description && (
            <p
              className={`mx-auto mt-4 max-w-xl text-base ${
                campaign.heroImage ? 'text-white/85' : 'text-ink-2'
              }`}
            >
              {campaign.description}
            </p>
          )}
        </div>
      </motion.section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {currentStep === 'options' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div>
              <p className="overline text-em-700">Step 01</p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl text-ink">
                Choose Your Gift
              </h2>
              <p className="mt-3 text-base text-ink-2">
                Select one of the available gift options below.
              </p>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaign.options.map((option) => (
                <ClaimOptionCard
                  key={option.id}
                  option={option}
                  isSelected={selectedOptionId === option.id}
                  onSelect={() => setSelectedOptionId(option.id)}
                />
              ))}
            </div>

            {/* Next Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center"
            >
              <button
                onClick={() => {
                  if (!selectedOptionId) {
                    toast.error('Please select a gift option first');
                    return;
                  }
                  setCurrentStep('address');
                }}
                className="rounded-2xl bg-em px-8 py-4 font-medium text-white transition hover:-translate-y-0.5 hover:bg-em-600"
              >
                Continue to Address
              </button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-8"
          >
            {/* Header */}
            <div>
              <p className="overline text-em-700">Step 02</p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl text-ink">
                Delivery Address
              </h2>
              <p className="mt-3 text-base text-ink-2">
                Tell us where to deliver your gift.
              </p>
            </div>

            {/* Selected Option Summary */}
            {selectedProduct && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4 rounded-md border border-bdr bg-em-50 p-4"
              >
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-white">
                  {selectedProduct.image ? (
                    <Image
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-ink-3">
                      <Package className="h-7 w-7" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="overline mb-1 text-em-700">Selected Gift</p>
                  <p className="font-display text-lg text-ink">{selectedProduct.name}</p>
                  <button
                    onClick={() => setCurrentStep('options')}
                    className="mt-1 text-xs text-em underline underline-offset-2 hover:text-em-600"
                  >
                    Change selection
                  </button>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <ClaimAddressForm
              onSubmit={handleSubmitClaim}
              isSubmitting={submitting}
            />

            {/* Back Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setCurrentStep('options')}
                className="text-ink-2 hover:text-ink font-normal underline"
              >
                ← Back to Gift Selection
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
