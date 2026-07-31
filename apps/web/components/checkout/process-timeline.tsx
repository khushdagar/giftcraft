'use client';

import { formatRupees } from '@/lib/utils';

interface ProcessTimelineProps {
  selectedPath: 'mockup' | 'lock';
  advance10: number;
  balance90: number;
  grand: number;
}

export function ProcessTimeline({ selectedPath, advance10, balance90, grand }: ProcessTimelineProps) {
  const steps = [
    {
      number: '1',
      title: 'Order Confirmed',
      desc: "You'll receive an order confirmation via email with Order ID.",
    },
    {
      number: '2',
      title: 'Mockup Creation (1–2 business days)',
      desc: "Our design team creates branded mockups showing your logo on each product. You'll receive an approval link via email.",
    },
    {
      number: '3',
      title: 'Design Approval',
      desc: 'Review the mockups, request changes if needed, and approve when satisfied. Digital approval is recorded with timestamp.',
    },
    {
      number: '4',
      title:
        selectedPath === 'lock'
          ? `Balance Payment (${formatRupees(balance90)})`
          : `Full Payment (${formatRupees(grand)})`,
      desc:
        selectedPath === 'lock'
          ? "After mockup approval, pay the remaining 90% to begin production. Your 10% advance has already locked your prices."
          : "Once mockups are approved, complete the full payment to begin production.",
    },
    {
      number: '5',
      title: 'Production & QC',
      desc: "Products are produced, branded, and quality-checked. You'll receive QC photos for review.",
    },
    {
      number: '6',
      title: 'Packed & Shipped',
      desc: "Gift packs assembled, packed in your chosen packaging, and shipped. Tracking link shared via Email.",
    },
    {
      number: '7',
      title: 'Delivery & Invoice',
      desc: 'Gifts delivered. GST-compliant invoice with HSN codes emailed automatically.',
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-7 mb-4">
      <h3 className="text-base font-medium mb-4 flex items-center gap-2">
        📋 What Happens Next
      </h3>

      <div className="space-y-0">
        {steps.map((step, idx) => {
          // Nothing has happened yet at checkout, so step 1 is the "next" step
          // and everything after it is neutral "upcoming" — no step is shown as
          // done. Real progress is reflected later on the confirmation page.
          const isNext = idx === 0;
          return (
            <div key={idx} className="flex gap-4 pb-5 relative">
              {/* Connecting line */}
              {idx < steps.length - 1 && (
                <div
                  className="absolute left-3.5 top-8 bottom-0 w-0.5"
                  style={{ backgroundColor: '#E5DFD4' }}
                />
              )}

              {/* Dot */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 relative z-10 ${
                  isNext ? 'bg-[#800020] text-white' : 'bg-[#E5DFD4] text-[#8F8A82]'
                }`}
              >
                {step.number}
              </div>

              {/* Content */}
              <div className="flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="text-sm font-semibold text-[#222222] mb-1">{step.title}</h4>
                  <span
                    className={`text-[11px] font-semibold flex-shrink-0 ${
                      isNext ? 'text-[#800020]' : 'text-[#8F8A82]'
                    }`}
                  >
                    {isNext ? 'Next' : 'Upcoming'}
                  </span>
                </div>
                <p className="text-xs text-[#5C5852] leading-relaxed">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
