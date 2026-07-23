'use client';

import { useState, useEffect } from 'react';

interface Testimonial {
  text: string;
  name: string;
  role: string;
}

// Shown only if the database has no active testimonials (or the fetch fails),
// so the section never renders empty.
const FALLBACK: Testimonial[] = [
  { text: 'GiftCraft simplified our entire Diwali gifting process. What used to take weeks now takes minutes.', name: 'Priya Sharma', role: 'Head of HR, TechCorp India' },
  { text: 'The transparent pricing was a game-changer. No hidden costs, no surprises. Perfect!', name: 'Rajesh Menon', role: 'Procurement Manager, Acme' },
  { text: 'We onboarded 200 new employees with GiftCraft welcome kits. Everyone felt valued from day one.', name: 'Ananya Desai', role: 'People Operations' },
];

export function Testimonials() {
  const [slide, setSlide] = useState(0);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(FALLBACK);

  useEffect(() => {
    let active = true;
    fetch('/api/testimonials')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.testimonials?.length) return;
        setTestimonials(
          data.testimonials.map((t: any) => ({
            text: t.quote,
            name: t.authorName,
            role: [t.authorRole, t.companyName].filter(Boolean).join(', '),
          }))
        );
        setSlide(0);
      })
      .catch(() => {/* keep fallback */});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  return (
    <section className="bg-[#F5F5F0] py-20">
      <div className="container">
        <h2 className="text-5xl md:text-6xl font-serif font-normal text-center">
          Loved by teams <span className="italic text-[#1A6B4F]">across India.</span>
        </h2>

        <div className="max-w-2xl mx-auto mt-16">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`transition-opacity duration-700 ${
                slide === i ? 'opacity-100' : 'opacity-0 absolute'
              }`}
            >
              <p className="text-6xl text-center text-[#fac85c] leading-none">❝</p>
              <p className="text-2xl font-serif italic text-center mb-8">{t.text}</p>
              <p className="text-center font-semibold">{t.name}</p>
              <p className="text-center text-sm text-[#9B9B93]">{t.role}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-center mt-12">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`transition-all ${
                slide === i ? 'w-6 h-2 bg-[#1A6B4F]' : 'w-2 h-2 bg-[#D4D4CF]'
              } rounded-full`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
