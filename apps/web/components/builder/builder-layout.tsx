'use client';

import { useBuilderStore } from '@/store/builder';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

// Delivery is the last step — the old Step 4 only echoed details already
// entered here, so it was removed. Continuing from Step 3 creates the quote and
// goes straight to checkout, which is the real review screen.
const STEPS = [
  { id: 1, label: 'Choose Products' },
  { id: 2, label: 'Customize' },
  { id: 3, label: 'Delivery' },
];

const FINAL_STEP = 3;

export function BuilderLayout({ children }: { children: ReactNode }) {
  const {
    currentStep,
    setCurrentStep,
    products,
    packaging,
    deliveryMode,
    address,
    csvRecipientCount,
    reviewOrder,
    reviewLoading,
    reviewReady,
  } = useBuilderStore();

  // Step 2 (Customize) — a pack has to ship in *something*, so packaging is required.
  const step2Valid = !!packaging;
  const blockedAtStep2 = currentStep === 2 && !step2Valid;

  // Step 3 (Delivery) must be complete before leaving it:
  //  · single delivery  → a fully valid address (incl. 6-digit pincode)
  //  · individual       → at least one recipient uploaded
  const step3Valid =
    deliveryMode === 'individual'
      ? csvRecipientCount > 0
      : !!(
          address?.name?.trim() &&
          address?.address1?.trim() &&
          address?.city?.trim() &&
          address?.state &&
          /^\d{6}$/.test(address?.pincode || '') &&
          address?.phone?.trim()
        );

  // Block moving forward out of Step 3 until it's valid.
  const blockedAtStep3 = currentStep === 3 && !step3Valid;

  const canGoBack = currentStep > 1;
  const canGoForward =
    currentStep < FINAL_STEP && products.length > 0 && !blockedAtStep2 && !blockedAtStep3;
  const isFinalStep = currentStep === FINAL_STEP;

  return (
    <div className="min-h-screen overflow-x-clip bg-canvas">
      {/* Step Indicator */}
      <div className="border-b border-bdr bg-white sticky top-0 z-40">
        <div className="container-gc-w py-4 sm:py-6">
          {/* Step Progress - Horizontal with lines. Compact on mobile so it
              never overflows the viewport (labels move below the row). */}
          <div className="hidden sm:flex items-center justify-center gap-2 sm:gap-4 sm:mb-8">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-2 sm:gap-4">
                {/* Step Circle */}
                <button
                  onClick={() => {
                    // Allow going back/to current freely, but don't let users
                    // jump forward past an incomplete Customize or Delivery step.
                    if (step.id > currentStep && (blockedAtStep2 || blockedAtStep3)) return;
                    setCurrentStep(step.id as 1 | 2 | 3);
                  }}
                  className={`flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full font-black text-sm transition cursor-pointer ${
                    currentStep === step.id
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : currentStep > step.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentStep > step.id ? (
                    <span className="text-lg">✓</span>
                  ) : (
                    step.id
                  )}
                </button>

                {/* Step Label — hidden on mobile (shown as a single line below) */}
                <div className="hidden sm:block min-w-max">
                  <p className={`text-xs font-semibold transition ${
                    currentStep >= step.id ? 'text-emerald-700' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                </div>

                {/* Connecting Line - only if not last step */}
                {idx < STEPS.length - 1 && (
                  <div className={`h-1 w-6 sm:w-12 transition ${
                    currentStep > step.id ? 'bg-emerald-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Mobile: the numbered circles are dropped entirely — a label plus a
              thin progress bar says the same thing in a fraction of the height. */}
          <div className="sm:hidden">
            <p className="text-center text-sm font-semibold text-emerald-700">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.label}
            </p>
            <div className="mt-2 flex gap-1">
              {STEPS.map((step) => (
                <span
                  key={step.id}
                  className={`h-1 flex-1 rounded-full transition ${
                    currentStep >= step.id ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container-gc-w py-8 pb-32">
        {children}
      </main>

      {/* Navigation Footer */}
      <footer className="border-t border-bdr bg-white sticky bottom-0 z-40">
        <div className="container-gc-w py-4 flex items-center justify-between">
          <Button
            onClick={() => setCurrentStep((currentStep - 1) as 1 | 2 | 3)}
            disabled={!canGoBack}
            variant="outline"
            className="gap-2 rounded-md"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex gap-2">
            {STEPS.map((step, idx) => (
              <div
                key={step.id}
                className={`h-2 rounded-full transition ${
                  currentStep >= step.id ? 'bg-em w-6' : 'bg-gray-200 w-4'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={() => {
              // On the final step the forward button creates the quote and goes
              // to checkout — published to the store by Step3Delivery. On
              // earlier steps it simply advances.
              if (isFinalStep) reviewOrder?.();
              else setCurrentStep((currentStep + 1) as 1 | 2 | 3);
            }}
            disabled={
              isFinalStep
                ? !step3Valid || !reviewReady || reviewLoading || !reviewOrder
                : !canGoForward
            }
            variant="em"
            className="gap-2 rounded-md"
            title={
              isFinalStep
                ? !reviewReady
                  ? deliveryMode === 'individual'
                    ? 'Upload your recipients list to continue'
                    : 'Complete your delivery details to continue'
                  : undefined
                : blockedAtStep2
                ? 'Select a packaging option to continue'
                : undefined
            }
          >
            {isFinalStep ? (reviewLoading ? 'Processing…' : 'Review Order') : 'Continue'}
            {(!isFinalStep || !reviewLoading) && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </footer>

    </div>
  );
}
