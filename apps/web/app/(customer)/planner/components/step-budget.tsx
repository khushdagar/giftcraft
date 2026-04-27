'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatRupees } from '@/lib/utils';

interface StepBudgetProps {
  selected: number;
  recipientCount: number;
  onSubmit: (budget: number) => void;
  onBack: () => void;
}

export function StepBudget({ selected, recipientCount, onSubmit, onBack }: StepBudgetProps) {
  const [budget, setBudget] = useState(selected);

  const perUnit = budget / recipientCount;
  const gst = budget * 0.18;
  const fee = budget * 0.02;
  const total = budget + gst + fee;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-ink mb-2">
          What's your budget?
        </h2>
        <p className="text-ink-2">
          Set your total budget for {recipientCount} {recipientCount === 1 ? 'gift' : 'gifts'}
        </p>
      </div>

      {/* Budget Display */}
      <div className="text-center bg-em-50 rounded-lg p-6 border-2 border-em-200">
        <p className="text-ink-2 text-sm mb-1">Total Budget</p>
        <p className="text-5xl font-black text-em">{formatRupees(budget)}</p>
        <p className="text-ink-2 text-sm mt-2">
          {formatRupees(perUnit)} per {recipientCount === 1 ? 'gift' : 'gift'}
        </p>
      </div>

      {/* Budget Slider */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-4">
          Adjust Budget
        </label>
        <input
          type="range"
          min="5000"
          max="500000"
          step="1000"
          value={budget}
          onChange={(e) => setBudget(parseInt(e.target.value))}
          className="w-full h-2 bg-recessed rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-ink-2 mt-2">
          <span>₹5,000</span>
          <span>₹100,000</span>
          <span>₹500,000</span>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-elevated rounded-lg p-6 space-y-2">
        <h3 className="font-semibold text-ink mb-4">Cost Breakdown</h3>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">Base Cost</span>
          <span className="font-semibold text-ink">{formatRupees(budget)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">GST (18%)</span>
          <span className="font-semibold text-ink">+{formatRupees(gst)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">Payment Fee (2%)</span>
          <span className="font-semibold text-ink">+{formatRupees(fee)}</span>
        </div>
        <div className="border-t border-bdr pt-2 mt-2 flex justify-between">
          <span className="font-bold text-ink">Total</span>
          <span className="font-black text-em text-lg">{formatRupees(total)}</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-6">
        <Button
          onClick={() => onSubmit(budget)}
          className="flex-1 rounded-2xl bg-em px-6 py-3 font-bold hover:bg-em-600"
        >
          See Recommendations
        </Button>
        <Button
          onClick={onBack}
          variant="outline"
          className="rounded-2xl"
        >
          Back
        </Button>
      </div>
    </div>
  );
}
