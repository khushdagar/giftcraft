'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-canvas py-12 px-4 flex items-center justify-center">
      <div className="container-gc-w max-w-lg text-center">
        {/* Error Icon */}
        <div className="rounded-gc-l border-2 border-err/20 bg-err/5 p-12 mb-8">
          <p className="text-5xl">⚠️</p>
        </div>

        {/* Heading */}
        <h1 className="t-title text-ink mb-3">Something went wrong</h1>
        <p className="text-ink-2 mb-6">
          We encountered an unexpected error. Don't worry, our team has been notified.
        </p>

        {/* Error Details (Dev Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-dark text-inv rounded-gc p-4 mb-6 text-left text-xs font-mono overflow-auto max-h-32">
            <p className="text-err mb-2">{error.name}</p>
            <p>{error.message}</p>
            {error.digest && <p className="text-ink-3 mt-2">Digest: {error.digest}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={reset} variant="em" size="lg" className="w-full rounded-gc-l">
            Try Again
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full rounded-gc-l">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
