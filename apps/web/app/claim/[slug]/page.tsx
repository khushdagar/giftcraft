'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ClaimOptionCard } from '@/components/goc/claim-option-card';
import { ClaimAddressForm } from '@/components/goc/claim-address-form';
import { ClaimSuccess } from '@/components/goc/claim-success';
import { AlertCircle, Loader2 } from 'lucide-react';
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-navy-800 animate-spin mx-auto mb-4" />
          <p className="text-ink-2">Loading campaign...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-md border-2 border-rose-300 p-8 max-w-md w-full text-center"
        >
          <AlertCircle className="w-16 h-16 text-rose-600 mx-auto mb-4" />
          <h1 className="text-2xl font-normal text-ink mb-2">Oops!</h1>
          <p className="text-ink-2 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-2 rounded-2xl bg-navy-800 text-white font-normal hover:bg-navy-900 transition"
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

  // Success state
  if (currentStep === 'success') {
    return <ClaimSuccess claimerName={successData.name} claimerEmail={successData.email} />;
  }

  // Main page
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full h-64 sm:h-80 overflow-hidden bg-navy-800"
      >
        {campaign.heroImage && (
          <Image
            src={campaign.heroImage}
            alt={campaign.name}
            fill
            className="object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/60 to-navy-800/40 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="text-4xl sm:text-5xl font-normal mb-2">{campaign.name}</h1>
            {campaign.description && (
              <p className="text-sm sm:text-base text-sky-100">{campaign.description}</p>
            )}
          </div>
        </div>
      </motion.div>

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
              <p className="text-xs font-normal uppercase tracking-wider text-ink-3">
                STEP 01
              </p>
              <h2 className="text-3xl sm:text-4xl font-normal mt-2 text-ink">
                Choose Your Gift
              </h2>
              <p className="text-base text-ink-2 mt-3">
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
                className="px-8 py-4 bg-navy-800 hover:bg-navy-900 text-white font-normal rounded-2xl transition transform hover:-translate-y-1"
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
              <p className="text-xs font-normal uppercase tracking-wider text-ink-3">
                STEP 02
              </p>
              <h2 className="text-3xl sm:text-4xl font-normal mt-2 text-ink">
                Delivery Address
              </h2>
              <p className="text-base text-ink-2 mt-3">
                Tell us where to deliver your gift.
              </p>
            </div>

            {/* Selected Option Summary */}
            {selectedOptionId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-amber-50 rounded-md border-2 border-amber-200 p-4 flex gap-4"
              >
                <div className="relative w-20 h-20 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden">
                  <Image
                    src={
                      campaign.options.find((o) => o.id === selectedOptionId)?.product.image || ''
                    }
                    alt="Selected product"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs text-amber-700 uppercase font-normal mb-1">
                    Selected Gift
                  </p>
                  <p className="text-lg font-normal text-ink">
                    {campaign.options.find((o) => o.id === selectedOptionId)?.product.name}
                  </p>
                  <button
                    onClick={() => setCurrentStep('options')}
                    className="text-xs text-amber-700 underline hover:text-amber-900 mt-1"
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
