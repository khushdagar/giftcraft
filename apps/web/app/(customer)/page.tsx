"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowDown, Gift, Palette, Package, Truck, CheckCircle2 } from "lucide-react";
import { formatRupees } from "@/lib/utils";

/* ─────────────────────────── data (Sprint 1 stub — swap for API later) */
type Slide = {
  overline: string;
  titleA: string;
  titleB: string;
  subtitle: string;
  bg: string;
};

const SLIDES: Slide[] = [
  {
    overline: "Corporate Gifting · Reimagined",
    titleA: "Bulk gifting, ",
    titleB: "made beautiful.",
    subtitle:
      "Self-serve platform for branded corporate gifts. Transparent pricing, zero sales calls.",
    bg: "linear-gradient(135deg,#2a1f14,#1a1510 20%,#12100d 50%,#1a1510 80%,#2a1f14)",
  },
  {
    overline: "Diwali 2026 Collection",
    titleA: "Festive gifts, ",
    titleB: "refined taste.",
    subtitle: "Premium hampers and branded boxes — ready in 10 days.",
    bg: "linear-gradient(135deg,#5C2D0E,#8B4513,#D4872A,#E8A040)",
  },
  {
    overline: "Team Onboarding Kits",
    titleA: "Welcome, ",
    titleB: "beautifully.",
    subtitle: "Day-one kits your new hires will actually post about.",
    bg: "linear-gradient(135deg,#0A3726,#1A6B4F,#2A7EC4,#145A42)",
  },
];

type Occasion = {
  icon: string;
  name: string;
  desc: string;
  bg: string;
  slug: string;
};

type FeaturedProduct = {
  id: string;
  name: string;
  brand: string;
  icon: string;
  price: number;
  tech: string;
  eco?: boolean;
};

type Step = {
  num: string;
  icon: any;
  title: string;
  desc: string;
};

type Testimonial = {
  q: string;
  name: string;
  role: string;
};

const OCCASIONS: Occasion[] = [
  { icon: "🪔", name: "Diwali", desc: "Light up relationships", bg: "from-[#E8A040] via-[#B8651A] to-[#8B4513]", slug: "diwali" },
  { icon: "🎨", name: "Holi", desc: "Colorful moments", bg: "from-[#E040A0] via-[#F0C040] to-[#40B0E0]", slug: "holi" },
  { icon: "🎄", name: "Christmas", desc: "Season of giving", bg: "from-[#8B1A1A] via-[#2D5016] to-[#1a3a10]", slug: "christmas" },
  { icon: "🎆", name: "New Year", desc: "Fresh beginnings", bg: "from-[#1A1A50] via-[#C4963C] to-[#6B2E6B]", slug: "new-year" },
  { icon: "💝", name: "Women's Day", desc: "Celebrate her", bg: "from-[#C86494] via-[#E8A0C0] to-[#9B4D78]", slug: "womens-day" },
  { icon: "👋", name: "Onboarding", desc: "Welcome gifts", bg: "from-[#1A6B4F] via-[#2A7EC4] to-[#145A42]", slug: "onboarding" },
  { icon: "💼", name: "Client Gifting", desc: "VIP relationships", bg: "from-[#2A2A28] via-[#4A4540] to-[#3A3530]", slug: "client-gifting" },
  { icon: "🎂", name: "Birthday", desc: "Make their day", bg: "from-[#7B2D8B] via-[#C4402A] to-[#D4872A]", slug: "birthday" },
];

const FEATURED: FeaturedProduct[] = [
  { id: "flask-500", name: "Stainless Steel Flask 500ml", brand: "Borosil", icon: "🧴", price: 285, tech: "UV Print", eco: true },
  { id: "notebook-a5", name: "A5 Hardbound Notebook", brand: "Classmate", icon: "📓", price: 125, tech: "Emboss" },
  { id: "pen-set", name: "Premium Roller Pen Set", brand: "Parker", icon: "🖋️", price: 450, tech: "Engrave" },
  { id: "backpack", name: "20L Commuter Backpack", brand: "Wildcraft", icon: "🎒", price: 1450, tech: "Embroidery" },
  { id: "speaker", name: "Portable Bluetooth Speaker", brand: "JBL", icon: "🔊", price: 1890, tech: "Screen Print" },
  { id: "mug", name: "Ceramic Travel Mug", brand: "Starbucks", icon: "☕", price: 345, tech: "Screen Print" },
  { id: "tshirt", name: "Premium Cotton T-Shirt", brand: "Bewakoof", icon: "👕", price: 385, tech: "Embroidery" },
  { id: "chocolates", name: "Artisan Chocolate Box", brand: "Smoor", icon: "🍫", price: 580, tech: "Sticker", eco: true },
];

const STEPS: Step[] = [
  { num: "01", icon: Gift, title: "Browse products", desc: "500+ curated SKUs." },
  { num: "02", icon: Palette, title: "Build your pack", desc: "Mix & match. Add your logo." },
  { num: "03", icon: CheckCircle2, title: "Approve mockups", desc: "Zero surprises, ever." },
  { num: "04", icon: Package, title: "Production", desc: "7–14 day turnaround." },
  { num: "05", icon: Truck, title: "Delivery", desc: "Door-to-door, 50+ cities." },
];

const TESTIMONIALS: Testimonial[] = [
  { q: "GiftCraft made our Diwali gifting effortless. 200 branded hampers in 9 days.", name: "Priya Sharma", role: "HR Lead, TechCorp" },
  { q: "The mockup approval flow saved us from three disasters. Price lock is genius.", name: "Rohan Mehta", role: "Ops Manager, FlipStart" },
  { q: "Finally a platform that treats corporate gifting like a real product, not a sales call.", name: "Anjali Kapoor", role: "Marketing, Nykaa" },
  { q: "Transparent pricing is rare in this space. GiftCraft nails it.", name: "Vikram Singh", role: "Admin, Razorpay" },
];

export default function HomePage() {
  const reduce = useReducedMotion();
  const [slide, setSlide] = useState(0);
  const [testi, setTesti] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES!.length), 6000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setTesti((s) => (s + 1) % TESTIMONIALS!.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-[100dvh] items-end justify-center overflow-hidden pb-20 sm:pb-28">
        {SLIDES.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ background: s.bg, opacity: slide === i ? 1 : 0 }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
          </div>
        ))}

        {/* CSS gift box on slide 0 */}
        {slide === 0 && (
          <div className="absolute left-1/2 top-[44%] z-[1] h-[clamp(200px,28vw,340px)] w-[clamp(200px,28vw,340px)] -translate-x-1/2 -translate-y-1/2 animate-fade-up">
            <div className="relative h-full w-full">
              <div className="absolute bottom-0 left-[10%] h-[65%] w-[80%] rounded-lg bg-gradient-to-br from-[#2a2320] to-[#1e1a17] shadow-[0_20px_60px_rgba(0,0,0,.4)] ring-1 ring-gold/10" />
              <div className="absolute top-[15%] left-[5%] h-[35%] w-[90%] -translate-y-2 -rotate-[12deg] rounded-t-lg bg-gradient-to-br from-[#352e28] to-[#252019] ring-1 ring-gold/15 animate-float-b" />
              <div className="absolute top-0 left-1/2 h-full w-[11%] -translate-x-1/2 bg-gradient-to-b from-em-700 via-em to-em-700 opacity-65" />
            </div>
          </div>
        )}

        <motion.div
          key={slide}
          initial={reduce ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-[2] max-w-[720px] px-5 text-center"
        >
          <p className="overline mb-3 block text-gold-200">{SLIDES[slide]!.overline}</p>
          <h1 className="t-hero mb-4 text-white">
            {SLIDES[slide]!.titleA}
            <span className="italic text-gold">{SLIDES[slide]!.titleB}</span>
          </h1>
          <p className="mx-auto mb-8 max-w-[460px] text-base leading-relaxed text-white/60 sm:text-lg">
            {SLIDES[slide]!.subtitle}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/builder" className="btn-hero-white">Build a Gift</Link>
            <Link href="/catalog" className="btn-hero-outline">Browse Products</Link>
          </div>
        </motion.div>

        <div className="absolute bottom-7 left-1/2 z-[3] flex -translate-x-1/2 gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-2 rounded-full transition-all ${
                slide === i ? "w-6 bg-white" : "w-2 bg-white/30"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <div className="absolute bottom-16 left-1/2 z-[3] -translate-x-1/2 animate-float-b opacity-40">
          <ArrowDown className="h-6 w-6 text-white" />
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section className="border-b border-bdr bg-white py-8">
        <div className="container-gc">
          <div className="mb-5 flex flex-wrap justify-center gap-6 sm:gap-14">
            {[
              ["500+", "Products"],
              ["100+", "Orders Delivered"],
              ["50+", "Cities Served"],
              ["50+", "Companies"],
            ].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="font-display text-2xl font-semibold text-ink sm:text-[36px]">{v}</div>
                <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink-3">{l}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-[13px] italic text-ink-3">
            India&apos;s first self-serve bulk gifting platform with transparent pricing
          </p>
        </div>
        <div className="mt-5 flex gap-12 overflow-hidden">
          <div className="flex shrink-0 animate-marquee gap-12">
            {["TECHCORP", "WIPRO", "INFOSYS", "ZOMATO", "RAZORPAY", "FLIPKART", "NYKAA", "SWIGGY", "PAYTM", "BYJU'S"].concat(
              ["TECHCORP", "WIPRO", "INFOSYS", "ZOMATO", "RAZORPAY", "FLIPKART", "NYKAA", "SWIGGY"]
            ).map((n, i) => (
              <span key={i} className="shrink-0 whitespace-nowrap text-base font-bold tracking-wider opacity-[0.14]">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ OCCASIONS BENTO ═══ */}
      <section className="py-14 sm:py-24">
        <div className="container-gc-w">
          <motion.div
            initial={reduce ? {} : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-10 text-center"
          >
            <h2 className="t-display">
              Shop by <span className="italic-em">occasion.</span>
            </h2>
            <p className="mx-auto mt-2 max-w-[480px] text-lg text-ink-2">
              Find the perfect gift for every moment that matters.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
            {OCCASIONS.map((o, i) => (
              <motion.div
                key={o.slug}
                initial={reduce ? {} : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
              >
                <Link
                  href={`/catalog?occasion=${o.slug}`}
                  className="group relative block min-h-[clamp(160px,20vw,220px)] overflow-hidden rounded-md transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${o.bg} transition-transform duration-700 group-hover:scale-105`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 z-[1] p-4 sm:p-6">
                    <span className="mb-1 block text-2xl">{o.icon}</span>
                    <h3 className="font-display text-lg text-white sm:text-[22px]">{o.name}</h3>
                    <p className="mt-0.5 text-xs text-white/55">{o.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED PRODUCTS ═══ */}
      <section className="bg-white py-14 sm:py-24">
        <div className="container-gc-w">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="t-title">
              Trending <span className="italic">now.</span>
            </h2>
            <Link href="/catalog" className="text-sm font-semibold text-em hover:opacity-70">
              See All →
            </Link>
          </div>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2 [scroll-snap-type:x_mandatory]">
            {FEATURED.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="group w-[clamp(200px,20vw,260px)] shrink-0 overflow-hidden rounded-md bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-hover"
              >
                <div className="relative m-2.5 flex aspect-square items-center justify-center overflow-hidden rounded-md-s bg-elevated">
                  <span className="text-5xl opacity-70 transition-transform duration-500 group-hover:scale-[1.08]">{p.icon}</span>
                  <span className="absolute left-2 top-2 rounded-md-p bg-gold-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-gold-700">MOQ 25</span>
                  {p.eco && (
                    <span className="absolute right-2 top-2 rounded-md-p bg-em-50 px-2 py-1 text-[9px] font-semibold text-em-700">ECO</span>
                  )}
                </div>
                <div className="px-4 pb-4 pt-1">
                  <p className="text-xs text-ink-3">{p.brand}</p>
                  <h3 className="mt-0.5 line-clamp-2 min-h-[38px] text-sm font-medium leading-tight text-ink">{p.name}</h3>
                  <p className="mt-1.5 text-base font-semibold tabnum">
                    {formatRupees(p.price)} <span className="text-xs font-normal text-ink-3">from</span>
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-3">{p.tech}</p>
                </div>
                <div className="mx-4 mb-3.5 h-9 translate-y-2 overflow-hidden rounded-md-p bg-em text-[13px] font-semibold leading-9 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <span className="block text-center">Add to Pack</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-14 sm:py-24">
        <div className="container-gc">
          <div className="mb-10 text-center">
            <h2 className="t-display">
              From browse to <span className="italic-em">doorstep.</span>
            </h2>
            <p className="mx-auto mt-2 max-w-[480px] text-lg text-ink-2">
              Five simple steps to perfectly branded gifts.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative max-w-full flex-1 rounded-md bg-white px-4 py-6 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-hover sm:py-8 md:max-w-[200px]">
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gold">Step {s.num}</p>
                <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-em-50 text-em">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-1.5 font-display text-lg font-medium">{s.title}</h3>
                <p className="text-[13px] leading-relaxed text-ink-2">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <span className="absolute -right-3.5 top-1/2 hidden -translate-y-1/2 text-base text-bdr-2 md:block">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COLLECTIONS ═══ */}
      <section className="pb-14 sm:pb-24">
        <div className="container-gc-w">
          <div className="mb-10 text-center">
            <h2 className="t-display">
              Curated <span className="italic-em">collections.</span>
            </h2>
            <p className="mx-auto mt-2 max-w-[480px] text-lg text-ink-2">
              Hand-picked assortments for every budget and style.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <CollectionCard href="/catalog?collection=budget" title={<>Budget-Friendly<br />Under ₹500</>} desc="Thoughtful gifts that won't break the bank." gradient="from-[#E8D5A3] via-[#C4963C] to-[#886528]" />
            <CollectionCard href="/catalog?collection=premium" title={<>Premium Executive<br />Collection</>} desc="Luxury gifts for your most valued relationships." gradient="from-[#1A1A18] via-[#3A3530] to-[#2A2520]" />
            <CollectionCard href="/catalog?collection=eco" title="Eco-Friendly Gifts" desc="Sustainable choices for conscious companies. 🍃" gradient="from-[#1A6B4F] via-[#2DA366] to-[#95D1AE]" full />
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="bg-elevated py-14 sm:py-24">
        <div className="container-gc">
          <div className="mb-10 text-center">
            <h2 className="t-display">
              Loved by teams <span className="italic-em">across India.</span>
            </h2>
          </div>
          <div className="relative overflow-hidden">
            <div className="flex transition-transform duration-700 ease-gc" style={{ transform: `translateX(-${testi * 100}%)` }}>
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="min-w-full px-5 text-center">
                  <div className="mb-5 font-display text-7xl leading-[0.5] text-gold-200">&ldquo;</div>
                  <p className="mx-auto mb-6 max-w-[600px] font-display text-xl italic leading-relaxed text-ink sm:text-[21px]">{t.q}</p>
                  <p className="text-[15px] font-semibold">{t.name}</p>
                  <p className="text-[13px] text-ink-3">{t.role}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-7 flex justify-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setTesti(i)}
                className={`h-2 rounded-full transition-all ${testi === i ? "w-6 bg-em" : "w-2 bg-bdr-2"}`}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA BLOCK ═══ */}
      <section className="bg-dark py-20 text-center sm:py-32">
        <div className="container-gc">
          <h2 className="t-display mb-3.5 text-inv">
            Ready to gift <span className="italic text-gold">beautifully</span>?
          </h2>
          <p className="mx-auto mb-8 max-w-[420px] text-base leading-relaxed text-inv/45 sm:text-[19px]">
            Build your first pack in under 5 minutes. Zero sales calls, ever.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/builder" className="btn-hero-white">Build a Gift Pack</Link>
            <Link href="/catalog" className="btn-hero-outline">Browse Catalog</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function CollectionCard({
  href, title, desc, gradient, full,
}: { href: string; title: React.ReactNode; desc: string; gradient: string; full?: boolean }) {
  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden rounded-md transition-transform duration-300 hover:-translate-y-1 ${full ? "md:col-span-2 aspect-[21/9]" : "aspect-[16/10]"}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-transform duration-700 group-hover:scale-[1.03]`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-[1] p-5 sm:p-9">
        <h3 className="font-display text-xl text-white sm:text-[28px]">{title}</h3>
        <p className="mt-1 text-[13px] text-white/50">{desc}</p>
        <span className="mt-2 inline-block text-sm font-medium text-white">Browse Collection →</span>
      </div>
    </Link>
  );
}
