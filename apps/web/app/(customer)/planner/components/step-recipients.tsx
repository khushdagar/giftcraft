'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface StepRecipientsProps {
  selected: { count: number; mode: string };
  onSubmit: (count: number, mode: string) => void;
  onBack: () => void;
}

const PRESETS = [25, 50, 100, 250, 500, 1000];
const MIN = 1;
const MAX = 10000;

export function StepRecipients({ selected, onSubmit, onBack }: StepRecipientsProps) {
  const [count, setCount] = useState(selected.count);
  const [mode, setMode] = useState(selected.mode);

  const clamp = (n: number) => Math.min(MAX, Math.max(MIN, Math.round(n) || MIN));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-normal tracking-tight text-ink mb-2">
          How many gifts?
        </h2>
        <p className="text-ink-2">
          Choose the number of gift packs and delivery preference
        </p>
      </div>

      {/* Quantity Selection */}
      <div>
        <div className="flex items-end justify-between mb-4 gap-4">
          <label className="block text-sm font-normal text-ink">
            Number of Packs
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCount((c) => clamp(c - 1))}
              className="w-9 h-9 rounded-lg border-2 border-bdr text-ink hover:border-em transition text-lg leading-none"
              aria-label="Decrease packs"
            >
              −
            </button>
            <input
              type="number"
              min={MIN}
              max={MAX}
              value={count}
              onChange={(e) => setCount(clamp(parseInt(e.target.value)))}
              className="w-24 text-center text-lg font-normal text-em border-2 border-bdr rounded-lg py-1.5 focus:border-em focus:outline-none tabular-nums"
            />
            <button
              type="button"
              onClick={() => setCount((c) => clamp(c + 1))}
              className="w-9 h-9 rounded-lg border-2 border-bdr text-ink hover:border-em transition text-lg leading-none"
              aria-label="Increase packs"
            >
              +
            </button>
          </div>
        </div>

        <input
          type="range"
          min={MIN}
          max={MAX}
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value))}
          className="w-full h-2 bg-recessed rounded-lg appearance-none cursor-pointer accent-em"
        />
        <div className="flex justify-between text-xs text-ink-2 mt-2">
          <span>{MIN}</span>
          <span>2,500</span>
          <span>5,000</span>
          <span>{MAX.toLocaleString()}</span>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2 mt-4">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setCount(p)}
              className={`px-4 py-1.5 rounded-full border-2 text-sm font-normal transition ${
                count === p
                  ? 'border-em bg-em-50 text-em-700'
                  : 'border-bdr text-ink-2 hover:border-em'
              }`}
            >
              {p.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery Mode */}
      <div>
        <label className="block text-sm font-normal text-ink mb-4">
          Delivery Mode
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode('individual')}
            className={`p-4 rounded-lg border-2 transition font-normal text-left ${
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
            className={`p-4 rounded-lg border-2 transition font-normal text-left ${
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
          onClick={() => onSubmit(clamp(count), mode)}
          className="flex-1 rounded-2xl bg-em px-6 py-3 font-normal hover:bg-em-600"
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
