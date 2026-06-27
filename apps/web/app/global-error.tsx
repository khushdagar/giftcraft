'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
          <div className="max-w-md text-center">
            {/* Logo */}
            <h1 className="text-4xl font-normal text-gray-900 mb-6">GiftCraft</h1>

            {/* Error Icon */}
            <div className="text-6xl mb-6">⚠️</div>

            {/* Error Message */}
            <p className="text-xl font-normal text-gray-900 mb-2">Critical Error</p>
            <p className="text-gray-600 mb-8">
              Something went seriously wrong. Our team has been notified. Please try refreshing or contact support.
            </p>

            {/* Dev Error Details */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-8 text-left text-xs font-mono overflow-auto max-h-40 border border-gray-700">
                <p className="text-red-400 mb-2 font-normal">{error.name}</p>
                <p className="text-gray-300">{error.message}</p>
                {error.digest && <p className="text-gray-500 mt-2 text-xs">Digest: {error.digest}</p>}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full bg-blue-700 text-white px-6 py-3 rounded-xl font-normal hover:bg-blue-800 transition"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-200 text-gray-900 px-6 py-3 rounded-xl font-normal hover:bg-gray-300 transition"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
