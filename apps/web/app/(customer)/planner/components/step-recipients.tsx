'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface StepRecipientsProps {
  selected: { count: number; mode: string };
  onSubmit: (count: number, mode: string) => void;
  onBack: () => void;
}

export function StepRecipients({ selected, onSubmit, onBack }: StepRecipientsProps) {
  const [count, setCount] = useState(selected.count);
  const [mode, setMode] = useState(selected.mode);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-ink mb-2">
          How many gifts?
        </h2>
        <p className="text-ink-2">
          Choose the number of gift packs and delivery preference
        </p>
      </div>

      {/* Quantity Selection */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-4">
          Number of Packs: <span className="text-em font-black">{count}</span>
        </label>
        <input
          type="range"
          min="1"
          max="10000"
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value))}
          className="w-full h-2 bg-recessed rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-ink-2 mt-2">
          <span>1</span>
          <span>100</span>
          <span>1000</span>
          <span>10000</span>
        </div>
      </div>

      {/* Delivery Mode */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-4">
          Delivery Mode
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode('individual')}
            className={`p-4 rounded-lg border-2 transition font-semibold ${
              mode === 'individual'
                ? 'border-em bg-em-50 text-em-700'
                : 'border-bdr bg-white text-ink hover:border-em'
            }`}
          >
            📦 Individual Delivery
            <p className="text-xs mt-1 opacity-75">Each recipient gets their own gift</p>
          </button>
          <button
            onClick={() => setMode('single')}
            className={`p-4 rounded-lg border-2 transition font-semibold ${
              mode === 'single'
                ? 'border-em bg-em-50 text-em-700'
                : 'border-bdr bg-white text-ink hover:border-em'
            }`}
          >
            📬 Bulk Delivery
            <p className="text-xs mt-1 opacity-75">All gifts in one shipment</p>
          </button>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-6">
        <Button
          onClick={() => onSubmit(count, mode)}
          className="flex-1 rounded-2xl bg-em px-6 py-3 font-bold hover:bg-em-600"
        >
          Continue
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
