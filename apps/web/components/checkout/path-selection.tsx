'use client';

import { FillProgressButton } from '@/components/ui/fill-progress-button';

interface PathSelectionProps {
  onContinue: () => void;
  /** True while the order is being placed — fills the CTA. */
  submitting?: boolean;
}

// Mockup-first is the only way to order: confirm now, pay after approval.
export function PathSelection({ onContinue, submitting }: PathSelectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-7 mb-4">
      <h3 className="text-base font-medium mb-4 flex items-center gap-2">
        How it works
      </h3>

      <p className="text-sm text-[#5C5852] mb-4">
        At GIVOO, we create <strong>custom mockups</strong> of your branded products before
        production — you pay only after you approve them.
      </p>

      <div className="grid grid-cols-1 gap-3 mb-6">
        <div className="text-left border-2 rounded-2xl p-4 md:p-6 relative border-[#800020] bg-[#FBF4F5]">
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[#F5F1EB] text-[#222222] mb-3">
            Mockup First
          </span>

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
        </div>
      </div>

      {/* Primary CTA mirrored from the pricing panel, so buyers can act without
          scrolling to the panel on the right. The button label + legal note
          match the panel exactly. */}
      <FillProgressButton
        onClick={onContinue}
        active={!!submitting}
        className="w-full h-[38px] rounded-full font-semibold flex items-center justify-center gap-2 transition-all disabled:cursor-default bg-[#800020] text-white hover:bg-[#6B001B]"
        // A lighter wash of the button's own colour, so the fill reads as
        // progress without the label losing contrast.
        fillClassName="bg-white/25 text-white"
        label="✓ Confirm Order & Get Mockups"
        activeLabel="Placing your order…"
      />
      <p className="text-[11px] text-[#8F8A82] text-center mt-3 leading-relaxed">
        By confirming, you agree to our Terms of Service, Privacy Policy, and Refund Policy.
        GST-compliant invoice will be generated upon payment.
      </p>
    </div>
  );
}
