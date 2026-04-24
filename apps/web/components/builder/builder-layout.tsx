'use client';

import { useBuilderStore } from '@/store/builder';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

const STEPS = [
  { id: 1, label: 'Choose Products' },
  { id: 2, label: 'Customize' },
  { id: 3, label: 'Delivery' },
  { id: 4, label: 'Review & Order' },
];

export function BuilderLayout({ children }: { children: ReactNode }) {
  const { currentStep, setCurrentStep, products } = useBuilderStore();

  const canGoBack = currentStep > 1;
  const canGoForward = currentStep < 4 && products.length > 0;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Step Indicator */}
      <div className="border-b border-bdr bg-white sticky top-0 z-40">
        <div className="container-gc-w py-6">
          {/* Step Progress - Horizontal with lines */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-4">
                {/* Step Circle */}
                <button
                  onClick={() => setCurrentStep(step.id as 1 | 2 | 3 | 4)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm transition cursor-pointer ${
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

                {/* Step Label */}
                <div className="min-w-max">
                  <p className={`text-xs font-semibold transition ${
                    currentStep >= step.id ? 'text-emerald-700' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                </div>

                {/* Connecting Line - only if not last step */}
                {idx < STEPS.length - 1 && (
                  <div className={`w-12 h-1 transition ${
                    currentStep > step.id ? 'bg-emerald-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
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
            onClick={() => setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4)}
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
            onClick={() => setCurrentStep((currentStep + 1) as 1 | 2 | 3 | 4)}
            disabled={!canGoForward}
            variant="em"
            className="gap-2 rounded-md"
          >
            {currentStep === 4 ? 'Place Order' : 'Continue'}
            {currentStep !== 4 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </footer>

    </div>
  );
}
