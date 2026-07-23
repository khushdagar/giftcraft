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

      <p className="text-sm text-[#6B6B63] mb-4">
        At GiftCraft, we create <strong>custom mockups</strong> of your branded products before
        production. Choose how you'd like to move forward:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {/* Mockup Path */}
        <button
          onClick={() => onSelectPath('mockup')}
          className={`text-left border-2 rounded-2xl p-4 md:p-6 cursor-pointer transition-all ${
            selectedPath === 'mockup'
              ? 'border-[#1A6B4F] bg-[#E8F5EF]'
              : 'border-[#E8E8E3] hover:border-[#D4D4CF] hover:shadow-sm'
          }`}
        >
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[#E8F5EF] text-[#0F4934] mb-3">
            Recommended
          </span>

          {selectedPath === 'mockup' && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-[#1A6B4F] text-white rounded-full flex items-center justify-center text-xs font-bold">
              ✓
            </div>
          )}

          <h4 className="text-sm font-semibold mb-2">Confirm Order & Get Mockups</h4>
          <p className="text-xs text-[#6B6B63] mb-3 leading-relaxed">
            We'll create branded mockups for your approval <strong>before you pay anything</strong>.
            No commitment until you approve.
          </p>
          <p className="text-lg font-semibold text-[#1A6B4F] mb-3">₹0 now</p>

          <div className="space-y-2 text-xs text-[#6B6B63] border-t border-[#D4D4CF] pt-3">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#1A6B4F] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                1
              </span>
              <span>Confirm order details & upload logo</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#1A6B4F] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                2
              </span>
              <span>We create mockups (1–2 business days)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#1A6B4F] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                3
              </span>
              <span>You approve or request changes</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#1A6B4F] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
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
              ? 'border-[#C4963C] bg-[#FBF5E9]'
              : 'border-[#E8E8E3] hover:border-[#D4D4CF] hover:shadow-sm'
          }`}
        >
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[#FBF5E9] text-[#886528] mb-3">
            Price Lock
          </span>

          {selectedPath === 'lock' && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-[#C4963C] text-white rounded-full flex items-center justify-center text-xs font-bold">
              ✓
            </div>
          )}

          <h4 className="text-sm font-semibold mb-2">Lock Prices with 10% Advance</h4>
          <p className="text-xs text-[#6B6B63] mb-3 leading-relaxed">
            Secure today's pricing with a <strong>10% advance payment</strong>. Especially useful
            during peak seasons when prices may increase.
          </p>
          <p className="text-lg font-semibold text-[#C4963C] mb-3">{formatRupees(advance10)} now</p>

          <div className="space-y-2 text-xs text-[#6B6B63] border-t border-[#D4D4CF] pt-3">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#C4963C] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                1
              </span>
              <span>Pay 10% advance ({formatRupees(advance10)})</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#C4963C] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                2
              </span>
              <span>We create mockups (1–2 business days)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#C4963C] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                3
              </span>
              <span>You approve or request changes</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-[#C4963C] text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
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
        className={`w-full h-13 rounded-full font-semibold flex items-center justify-center gap-2 transition-all ${
          selectedPath === 'mockup'
            ? 'bg-[#1A6B4F] text-white hover:bg-[#145A42]'
            : 'bg-[#C4963C] text-white hover:bg-[#886528]'
        }`}
      >
        {selectedPath === 'mockup'
          ? '✓ Confirm Order & Get Mockups'
          : `🔒 Pay ${formatRupees(advance10)} & Lock Prices`}
      </button>
      <p className="text-[11px] text-[#9B9B93] text-center mt-3 leading-relaxed">
        By confirming, you agree to our Terms of Service, Privacy Policy, and Refund Policy.
        GST-compliant invoice will be generated upon payment.
      </p>
    </div>
  );
}
