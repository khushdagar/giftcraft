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
          <div className="flex items-center justify-between">
            <div>
              <p className="overline text-ink-3">Building Your Pack</p>
              <h1 className="text-2xl font-black mt-1">STEP {String(currentStep).padStart(2, '0')}</h1>
            </div>
            <div className="hidden md:flex gap-2">
              {STEPS.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id as 1 | 2 | 3 | 4)}
                  className={`rounded-gc-p px-3 py-1.5 text-xs font-semibold transition ${
                    currentStep === step.id
                      ? 'bg-dark text-inv'
                      : currentStep > step.id
                      ? 'bg-em text-inv'
                      : 'border border-bdr text-ink'
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container-gc-w py-8">
        <div className="max-w-4xl">
          {children}
        </div>
      </main>

      {/* Navigation Footer */}
      <footer className="border-t border-bdr bg-white sticky bottom-0 z-40">
        <div className="container-gc-w py-4 flex items-center justify-between">
          <Button
            onClick={() => setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4)}
            disabled={!canGoBack}
            variant="outline"
            className="gap-2 rounded-gc-l"
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
            className="gap-2 rounded-gc-l"
          >
            {currentStep === 4 ? 'Place Order' : 'Continue'}
            {currentStep !== 4 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </footer>

    </div>
  );
}
