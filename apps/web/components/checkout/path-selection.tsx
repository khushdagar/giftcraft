'use client';

import { formatRupees } from '@/lib/utils';

interface PathSelectionProps {
  selectedPath: 'mockup' | 'lock';
  onSelectPath: (path: 'mockup' | 'lock') => void;
  advance10: number;
  balance90: number;
  onContinue: () => void;
}

export function PathSelection({
  selectedPath,
  onSelectPath,
  advance10,
  balance90,
  onContinue,
}: PathSelectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-7 mb-4">
      <h3 className="text-base font-medium mb-4 flex items-center gap-2">
        🛤️ How would you like to proceed?
      </h3>

      <p className="text-sm text-[#5C5852] mb-4">
        At GIVOO, we create <strong>custom mockups</strong> of your branded products before
        production. Choose how you'd like to move forward:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {/* Mockup Path */}
        <button
          onClick={() => onSelectPath('mockup')}
          className={`text-left border-2 rounded-2xl p-4 md:p-6 cursor-pointer transition-all ${
            selectedPath === 'mockup'
              ? 'border-[#800020] bg-[#FBF4F5]'
              : 'border-[#E5DFD4] hover:border-[#D3CBBC] hover:shadow-sm'
          }`}
        >
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[#FBF4F5] text-[#560015] mb-3">
            Recommended
          </span>

          {selectedPath === 'mockup' && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-[#800020] text-white rounded-full flex items-center justify-center text-xs font-bold">
              ✓
            </div>
          )}

          <h4 className="text-sm font-semibold mb-2">Confirm Order & Get Mockups</h4>
          <p className="text-xs text-[#5C5852] mb-3 leading-relaxed">
            We'll create branded mockups for your approval <strong>before you pay anything</strong>.
            No commitment until you approve.
          </p>
          <p className="text-lg font-semibold text-[#800020] mb-3">₹0 now</p>

          <div className="space-y-2 text-xs text-[#5C5852] border-t border-[#D3CBBC] pt-3">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#800020] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                1
              </span>
              <span>Confirm order details & upload logo</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#800020] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                2
              </span>
              <span>We create mockups (1–2 business days)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#800020] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                3
              </span>
              <span>You approve or request changes</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#800020] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                4
              </span>
              <span>Pay full amount & we begin production</span>
            </div>
          </div>
        </button>

        {/* Lock Path */}
        <button
          onClick={() => onSelectPath('lock')}
          className={`text-left border-2 rounded-2xl p-4 md:p-6 cursor-pointer transition-all relative ${
            selectedPath === 'lock'
              ? 'border-[#3A3A3A] bg-[#F5F1EB]'
              : 'border-[#E5DFD4] hover:border-[#D3CBBC] hover:shadow-sm'
          }`}
        >
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[#F5F1EB] text-[#222222] mb-3">
            Price Lock
          </span>

          {selectedPath === 'lock' && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-[#3A3A3A] text-white rounded-full flex items-center justify-center text-xs font-bold">
              ✓
            </div>
          )}

          <h4 className="text-sm font-semibold mb-2">Lock Prices with 10% Advance</h4>
          <p className="text-xs text-[#5C5852] mb-3 leading-relaxed">
            Secure today's pricing with a <strong>10% advance payment</strong>. Especially useful
            during peak seasons when prices may increase.
          </p>
          <p className="text-lg font-semibold text-[#3A3A3A] mb-3">{formatRupees(advance10)} now</p>

          <div className="space-y-2 text-xs text-[#5C5852] border-t border-[#D3CBBC] pt-3">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#3A3A3A] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                1
              </span>
              <span>Pay 10% advance ({formatRupees(advance10)})</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#3A3A3A] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                2
              </span>
              <span>We create mockups (1–2 business days)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#3A3A3A] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                3
              </span>
              <span>You approve or request changes</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#3A3A3A] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                4
              </span>
              <span>Pay remaining {formatRupees(balance90)} & production begins</span>
            </div>
          </div>
        </button>
      </div>

      {/* Primary CTA mirrored from the pricing panel, so buyers can act right
          after choosing a path without scrolling to the panel on the right. The
          button label + legal note match the panel exactly. */}
      <button
        onClick={onContinue}
        className={`w-full h-[38px] rounded-full font-semibold flex items-center justify-center gap-2 transition-all ${
          selectedPath === 'mockup'
            ? 'bg-[#800020] text-white hover:bg-[#6B001B]'
            : 'bg-[#3A3A3A] text-white hover:bg-[#222222]'
        }`}
      >
        {selectedPath === 'mockup'
          ? '✓ Confirm Order & Get Mockups'
          : `🔒 Pay ${formatRupees(advance10)} & Lock Prices`}
      </button>
      <p className="text-[11px] text-[#8F8A82] text-center mt-3 leading-relaxed">
        By confirming, you agree to our Terms of Service, Privacy Policy, and Refund Policy.
        GST-compliant invoice will be generated upon payment.
      </p>
    </div>
  );
}
