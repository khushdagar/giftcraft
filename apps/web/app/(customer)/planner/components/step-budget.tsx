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

const PRESETS = [25000, 50000, 100000, 250000, 500000];
const MIN = 5000;
const MAX = 1000000;
const STEP = 1000;

export function StepBudget({ selected, recipientCount, onSubmit, onBack }: StepBudgetProps) {
  const [budget, setBudget] = useState(selected);

  const clamp = (n: number) =>
    Math.min(MAX, Math.max(MIN, Math.round((n || MIN) / STEP) * STEP));

  const perUnit = budget / Math.max(1, recipientCount);
  const gst = budget * 0.18;
  const fee = budget * 0.02;
  const total = budget + gst + fee;

  // Friendly read on whether the per-gift budget is workable.
  const tier =
    perUnit < 150
      ? { label: 'Tight — expect small tokens', color: 'text-gold-700' }
      : perUnit < 500
        ? { label: 'Good range for quality gifts', color: 'text-em' }
        : { label: 'Premium picks unlocked', color: 'text-em' };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-normal tracking-tight text-ink mb-2">
          What's your budget?
        </h2>
        <p className="text-ink-2">
          Set your total budget for {recipientCount} {recipientCount === 1 ? 'gift' : 'gifts'}
        </p>
      </div>

      {/* Budget Display */}
      <div className="text-center bg-em-50 rounded-lg p-6 border-2 border-em-200">
        <p className="text-ink-2 text-sm mb-1">Total Budget</p>
        <p className="text-5xl font-normal text-em tabular-nums">{formatRupees(budget)}</p>
        <p className="text-ink-2 text-sm mt-2">
          {formatRupees(perUnit)} per gift · <span className={tier.color}>{tier.label}</span>
        </p>
      </div>

      {/* Typed input */}
      <div>
        <label className="block text-sm font-normal text-ink mb-2">
          Enter exact budget
        </label>
        <div className="flex items-center border-2 border-bdr rounded-lg px-4 focus-within:border-em transition">
          <span className="text-ink-2 text-lg">₹</span>
          <input
            type="number"
            min={MIN}
            max={MAX}
            step={STEP}
            value={budget}
            onChange={(e) => setBudget(clamp(parseInt(e.target.value)))}
            className="w-full py-2.5 px-2 text-lg font-normal text-ink focus:outline-none tabular-nums"
          />
        </div>
      </div>

      {/* Budget Slider */}
      <div>
        <label className="block text-sm font-normal text-ink mb-4">
          Or drag to adjust
        </label>
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={budget}
          onChange={(e) => setBudget(parseInt(e.target.value))}
          className="slider-em w-full"
        />
        <div className="flex justify-between text-xs text-ink-2 mt-2">
          <span>₹5,000</span>
          <span>₹5,00,000</span>
          <span>₹10,00,000</span>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2 mt-4">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setBudget(p)}
              className={`px-4 py-1.5 rounded-full border-2 text-sm font-normal transition ${
                budget === p
                  ? 'border-em bg-em-50 text-em-700'
                  : 'border-bdr text-ink-2 hover:border-em'
              }`}
            >
              {formatRupees(p)}
            </button>
          ))}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-elevated rounded-lg p-6 space-y-2">
        <h3 className="font-normal text-ink mb-4">Cost Breakdown</h3>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">Base Cost</span>
          <span className="font-normal text-ink tabular-nums">{formatRupees(budget)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">GST (18%)</span>
          <span className="font-normal text-ink tabular-nums">+{formatRupees(gst)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">Payment Fee (2%)</span>
          <span className="font-normal text-ink tabular-nums">+{formatRupees(fee)}</span>
        </div>
        <div className="border-t border-bdr pt-2 mt-2 flex justify-between">
          <span className="font-normal text-ink">Total</span>
          <span className="font-normal text-em text-lg tabular-nums">{formatRupees(total)}</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-6">
        <Button
          onClick={() => onSubmit(clamp(budget))}
          className="flex-1 rounded-2xl bg-em px-6 py-3 font-normal hover:bg-em-600"
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
