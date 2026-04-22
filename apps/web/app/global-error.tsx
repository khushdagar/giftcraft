'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-canvas py-12 px-4 flex items-center justify-center">
          <div className="max-w-lg text-center">
            <h1 className="text-4xl font-black text-ink mb-3">GiftCraft</h1>
            <p className="text-2xl font-black text-err mb-4">Critical Error</p>
            <p className="text-ink-2 mb-6">
              Something went seriously wrong. Please refresh the page or contact us.
            </p>
            <button
              onClick={reset}
              className="bg-em text-white px-6 py-3 rounded-lg font-semibold hover:bg-em-600 transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
