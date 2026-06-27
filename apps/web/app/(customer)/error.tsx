'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Customer page error:', error);
  }, [error]);

  const handleGoBack = () => {
    reset();
    router.back();
  };

  return (
    <div className="min-h-[calc(100vh-200px)] bg-canvas py-12 px-4 flex items-center justify-center">
      <div className="max-w-lg text-center">
        {/* Error Icon */}
        <div className="rounded-md border-2 border-red-200 bg-red-50 p-12 mb-8">
          <p className="text-5xl">⚠️</p>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-normal text-gray-900 mb-2">Oops! Something went wrong</h1>
        <p className="text-gray-600 mb-8">
          We encountered an error while loading this page. Don't worry, you can try again or go back.
        </p>

        {/* Error Details (Dev Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-900 text-gray-100 rounded-2xl p-4 mb-8 text-left text-xs font-mono overflow-auto max-h-40 border border-gray-700">
            <p className="text-red-400 mb-2 font-normal">{error.name}</p>
            <p className="text-gray-300">{error.message}</p>
            {error.digest && <p className="text-gray-500 mt-2 text-xs">Digest: {error.digest}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={reset}
            variant="em"
            size="lg"
            className="w-full rounded-2xl font-normal"
          >
            Try Again
          </Button>
          <Button
            onClick={handleGoBack}
            variant="outline"
            size="lg"
            className="w-full rounded-2xl font-normal"
          >
            Go Back
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full rounded-2xl font-normal"
          >
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
