'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StepOccasion } from './components/step-occasion';
import { StepRecipients } from './components/step-recipients';
import { StepBudget } from './components/step-budget';
import { StepResults } from './components/step-results';

export default function BudgetPlannerPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    occasion: '',
    recipientCount: 1,
    deliveryMode: 'individual',
    budget: 10000,
    recommendations: [] as any[],
  });

  const handleOccasionSelect = (occasion: string) => {
    setFormData((prev) => ({ ...prev, occasion }));
    setStep(2);
  };

  const handleRecipientsSubmit = (count: number, mode: string) => {
    setFormData((prev) => ({ ...prev, recipientCount: count, deliveryMode: mode }));
    setStep(3);
  };

  const handleBudgetSubmit = (budget: number) => {
    setFormData((prev) => ({ ...prev, budget }));
    setStep(4);
  };

  const handleBack = () => {
    setStep(Math.max(1, step - 1));
  };

  const steps = [
    { number: 1, label: 'Occasion' },
    { number: 2, label: 'Recipients' },
    { number: 3, label: 'Budget' },
    { number: 4, label: 'Results' },
  ];

  return (
    <div className="min-h-screen bg-canvas py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-ink mb-4">
            Budget Planner
          </h1>
          <p className="text-lg text-ink-2">
            Find the perfect corporate gift package for your budget
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-2 mb-12 justify-center">
          {steps.map((s) => (
            <div
              key={s.number}
              className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-sm transition ${
                s.number === step
                  ? 'bg-em text-white'
                  : s.number < step
                    ? 'bg-em-50 text-em-700'
                    : 'bg-recessed text-ink-2'
              }`}
            >
              {s.number}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg border-2 border-bdr p-8 md:p-12">
          {step === 1 && (
            <StepOccasion onSelect={handleOccasionSelect} />
          )}

          {step === 2 && (
            <StepRecipients
              selected={{ count: formData.recipientCount, mode: formData.deliveryMode }}
              onSubmit={handleRecipientsSubmit}
              onBack={handleBack}
            />
          )}

          {step === 3 && (
            <StepBudget
              selected={formData.budget}
              recipientCount={formData.recipientCount}
              onSubmit={handleBudgetSubmit}
              onBack={handleBack}
            />
          )}

          {step === 4 && (
            <StepResults
              formData={formData}
              onBack={handleBack}
            />
          )}
        </div>

        {/* Progress Text */}
        <div className="text-center mt-8 text-sm text-ink-2">
          Step {step} of 4
        </div>
      </div>
    </div>
  );
}
