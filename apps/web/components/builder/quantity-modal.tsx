'use client';

import { useState, useEffect } from 'react';
import { useBuilderStore } from '@/store/builder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const RECIPIENT_TYPES = [
  { id: 'corporate', label: 'Corporate Gift', moq: 25, color: 'bg-indigo-50', textColor: 'text-indigo-700' },
  { id: 'party', label: 'Party Favor', moq: 10, color: 'bg-orange-50', textColor: 'text-orange-700' },
];

export function QuantityModal() {
  const {
    quantityModalOpen,
    openQuantityModal,
    closeQuantityModal,
    recipientType,
    setRecipientType,
    packQuantity,
    setPackQuantity,
    setCurrentStep,
  } = useBuilderStore();

  const [localQty, setLocalQty] = useState(packQuantity);
  const [mounted, setMounted] = useState(false);

  // Open modal on first visit (when recipientType is not set)
  useEffect(() => {
    setMounted(true);
    if (!recipientType) {
      openQuantityModal();
    }
  }, [recipientType, openQuantityModal]);

  const moq = recipientType ? RECIPIENT_TYPES.find((t) => t.id === recipientType)?.moq || 25 : 25;

  // Prevent hydration mismatch
  if (!mounted) return null;
  if (!quantityModalOpen) return null;

  const handleContinue = () => {
    if (recipientType && localQty >= moq) {
      setPackQuantity(localQty);
      closeQuantityModal();
      setCurrentStep(1);
    }
  };

  const isValid = recipientType && localQty >= moq;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="rounded-gc-l bg-white p-8 shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <p className="text-center font-black text-3xl text-ink mb-8">
          How many gift packs?
        </p>

        {/* Recipient Type Selection */}
        <div className="space-y-3 mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">Type</p>
          {RECIPIENT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setRecipientType(type.id as 'corporate' | 'party');
                setLocalQty(type.moq);
              }}
              className={`w-full rounded-gc border-2 p-4 text-left transition ${
                recipientType === type.id
                  ? `${type.color} border-${type.id === 'corporate' ? 'indigo' : 'orange'}-500`
                  : 'border-bdr hover:border-gray-400 bg-white'
              }`}
            >
              <p className={`font-semibold ${recipientType === type.id ? type.textColor : 'text-ink'}`}>
                {type.label}
              </p>
              <p className={`text-xs mt-1 ${recipientType === type.id ? type.textColor : 'text-ink-3'}`}>
                Minimum: {type.moq} packs
              </p>
            </button>
          ))}
        </div>

        {/* Quantity Input */}
        {recipientType && (
          <div className="space-y-3 mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Quantity</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocalQty(Math.max(moq, localQty - 10))}
                className="h-10 w-10 rounded-full border border-bdr hover:border-em flex items-center justify-center text-lg font-semibold"
              >
                −
              </button>
              <Input
                type="number"
                min={moq}
                value={localQty}
                onChange={(e) => setLocalQty(Math.max(moq, parseInt(e.target.value) || moq))}
                className="flex-1 text-center font-black text-lg"
              />
              <button
                onClick={() => setLocalQty(localQty + 10)}
                className="h-10 w-10 rounded-full border border-bdr hover:border-em flex items-center justify-center text-lg font-semibold"
              >
                +
              </button>
            </div>
            {localQty < moq && (
              <p className="text-xs text-red-600">Minimum {moq} required</p>
            )}
          </div>
        )}

        {/* Cost Estimate */}
        {recipientType && (
          <div className="rounded-gc-l bg-amber-50 border border-amber-200 p-3 mb-8">
            <p className="text-xs text-amber-700 mb-1">Estimated total</p>
            <p className="text-lg font-black text-amber-700">₹{(localQty * 200).toLocaleString()}</p>
            <p className="text-xs text-amber-600 mt-1">Before customization</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={closeQuantityModal}
            variant="outline"
            className="flex-1 rounded-gc-l"
          >
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!isValid}
            variant="em"
            className="flex-1 rounded-gc-l"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
