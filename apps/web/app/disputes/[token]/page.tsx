'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DisputeForm } from '@/components/disputes/dispute-form';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface PageProps {
  params: { token: string };
  searchParams: { orderId?: string };
}

export default function DisputeFilingPage({ params, searchParams }: PageProps) {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [referenceNumber, setReferenceNumber] = useState('');
  const orderId = searchParams.orderId || '';

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-lg bg-white shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-err mx-auto mb-4" />
          <h1 className="text-xl font-normal text-ink mb-2">Invalid Link</h1>
          <p className="text-sm text-ink-2 mb-4">
            This dispute link is not valid or has expired. Please check your email or contact support.
          </p>
          <a href="/" className="text-em font-normal hover:underline">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: any) => {
    try {
      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('subject', data.subject);
      formData.append('description', data.description);

      for (const photo of data.photos) {
        const photoUrl = await uploadPhoto(photo);
        formData.append('photoUrls', photoUrl);
      }

      const response = await fetch('/api/disputes', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          subject: data.subject,
          description: data.description,
          photoUrls: await Promise.all(
            data.photos.map((photo: File) => uploadPhoto(photo))
          ),
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to file dispute');
      }

      const result = await response.json();
      setReferenceNumber(result.data.referenceNumber);
      setStep('success');
    } catch (error) {
      throw error instanceof Error ? error : new Error('An error occurred');
    }
  };

  const uploadPhoto = async (photo: File): Promise<string> => {
    const body = new FormData();
    body.append('file', photo);
    const res = await fetch('/api/disputes/upload', { method: 'POST', body });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to upload photo');
    }
    const { url } = await res.json();
    return url;
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-lg bg-white shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-2xl font-normal text-ink mb-2">Dispute Filed</h1>
          <p className="text-sm text-ink-2 mb-4">
            Your dispute has been successfully submitted. Our team will review it within 24 hours.
          </p>

          <div className="bg-emerald-50 rounded-md p-4 mb-6">
            <p className="text-xs text-emerald-700 font-normal mb-1">REFERENCE NUMBER</p>
            <p className="text-xl font-normal text-emerald-700">{referenceNumber}</p>
            <p className="text-xs text-emerald-600 mt-2">
              Save this number for your records
            </p>
          </div>

          <p className="text-xs text-ink-3 mb-6">
            We will send you an email update when we resolve your dispute. You can track the progress in your account.
          </p>

          <div className="flex gap-3">
            <a
              href="/"
              className="flex-1 px-4 py-2 rounded-md border-2 border-bdr hover:bg-gray-50 font-normal text-sm transition"
            >
              Home
            </a>
            <a
              href="/dashboard/orders"
              className="flex-1 px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 font-normal text-sm transition"
            >
              View Orders
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-normal text-ink mb-2">File a Dispute</h1>
          <p className="text-lg text-ink-2">
            Let us know if there was an issue with your order. We're here to help.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-lg bg-white shadow-lg p-8">
          <DisputeForm orderId={orderId} orderNumber="Pending" onSubmit={handleSubmit} />
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-ink-3">
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:support@giftcraft.in" className="text-em font-normal hover:underline">
              support@giftcraft.in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
