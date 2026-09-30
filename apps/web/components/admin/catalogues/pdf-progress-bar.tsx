'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, FileDown } from 'lucide-react';
import type { CatalogueDownloadProgress } from '@/hooks/use-catalogue-download';

/** The catalogue download bar: slides in, fills with a moving sheen, slides out. */
export function PdfProgressBar({ progress }: { progress: CatalogueDownloadProgress | null }) {
  const reduced = useReducedMotion();
  const done = progress?.pct === 100;

  return (
    <AnimatePresence initial={false}>
      {progress && (
        <motion.div
          key="pdf-progress"
          initial={{ opacity: 0, height: 0, y: -8 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -8 }}
          transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
          className="overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-md border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${
                  done ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <motion.span
                    animate={reduced ? undefined : { y: [0, 3, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex"
                  >
                    <FileDown className="h-4 w-4" />
                  </motion.span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-gray-900">{progress.title}</p>
                  <span className="text-sm font-semibold tabular-nums text-gray-900">
                    {progress.pct}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">{progress.label}</p>
              </div>
            </div>

            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.pct}
            >
              <motion.div
                className={`relative h-full overflow-hidden rounded-full ${
                  done ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progress.pct}%` }}
                transition={
                  reduced ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 18 }
                }
              >
                {!reduced && !done && (
                  <motion.span
                    className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                    animate={{ left: ['-4rem', '100%'] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </motion.div>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Large catalogues can take a minute. Keep this tab open — the download starts by
              itself.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
