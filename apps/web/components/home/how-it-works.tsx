'use client';

import Image from "next/image";

export function HowItWorks() {
  const steps = [
    { icon: '/icons/browse.png', title: 'Browse', desc: 'Explore 500+ curated products' },
    { icon: '/icons/build.png', title: 'Build', desc: 'Add & customize your gift pack' },
    { icon: '/icons/brand.png', title: 'Brand', desc: 'Upload your logo' },
    { icon: '/icons/quote.png', title: 'Quote', desc: 'Get instant transparent pricing' },
    { icon: '/icons/order.png', title: 'Order', desc: 'Pay & track delivery' },
  ];

  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <h2 className="text-5xl md:text-6xl font-serif font-normal text-center mb-4">
          From browse to <span className="italic text-[#800020]">doorstep.</span>
        </h2>
        <p className="text-center text-[#5C5852] mb-16">Five simple steps to perfectly branded gifts.</p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {steps.map((step, i) => (
            <div key={i} className="bg-white border shadow-lg border-[#E5DFD4] rounded-2xl p-5 sm:p-8 text-center">
              <p className="text-xs font-bold text-[#800020] mb-4 tracking-widest">STEP {i + 1}</p>
              <Image src={step.icon} alt={step.title} width={72} height={72} className="text-4xl sm:text-5xl mb-4 m-auto" />
              <h3 className="font-serif text-xl mb-2">{step.title}</h3>
              <p className="text-sm text-[#5C5852]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
