import Link from 'next/link';
import type { ReactNode } from 'react';
import { BadgeIndianRupee, CalendarCheck, Eye, Gift } from 'lucide-react';
import { JsonLd } from '@/components/seo/json-ld';
import { faqPageSchema } from '@/lib/schema';

/**
 * Editorial copy for the homepage — what GIVOO offers, why companies choose
 * it, and the FAQ block. Server component, so all of it (and every internal
 * link) is in the initial HTML. `a` is the plain-text answer used for the
 * FAQPage JSON-LD; `jsx` an optional richer render of the SAME text with links.
 */

const linkClass = 'font-semibold text-[#800020] underline underline-offset-2';

const BROWSE_LINKS: Array<[string, string]> = [
  ['/curated-packs', 'Curated Packs'],
  ['/curated-packs/occasions', 'By Occasion'],
  ['/curated-packs/budget', 'By Budget'],
  ['/box', 'Gift Builder'],
];

const REASONS = [
  {
    icon: BadgeIndianRupee,
    title: '₹0 today.',
    desc: 'Place your order with zero payment and settle only once you’ve approved the branded mockup — per-box rates, GST, and any fees are line items you see before you pay, so finance can approve the same day.',
  },
  {
    icon: CalendarCheck,
    title: 'Delivered in 10–15 days.',
    desc: 'Timelines are confirmed before payment, so annual days and festival deadlines aren’t a gamble.',
  },
  {
    icon: Eye,
    title: 'Branding you can see first.',
    desc: 'Your logo is rendered on every product in a mockup you sign off before any money moves — so nothing about placement or print quality is a surprise when the boxes arrive.',
  },
  {
    icon: Gift,
    title: 'Custom Gift Pack.',
    desc: 'Create a custom gift pack within the budget you set. We’ll help you maximize every rupee!',
  },
];

const FAQS: Array<{ q: string; a: string; jsx?: ReactNode }> = [
  {
    q: 'What is the minimum order quantity for corporate gifts?',
    a: 'Most products on GIVOO start at a minimum of 10 units, and curated gift packs are commonly ordered from 25 upward. You set the exact quantity yourself and the per-box price updates live, so bulk employee and client gifting stays transparent whether you need 25 gifts or 2,500.',
  },
  {
    q: 'How does pricing work, and is GST included?',
    a: 'Pricing is shown per box with GST and any fees as clear line items before you order — no hidden markup. You also pay ₹0 upfront and settle only after approving your branded mockup, which is why finance teams can approve the PO the same day. Compare rates across budget bands on Shop by Budget.',
    jsx: (
      <>
        Pricing is shown per box with GST and any fees as clear line items before you order — no
        hidden markup. You also pay ₹0 upfront and settle only after approving your branded mockup,
        which is why finance teams can approve the PO the same day. Compare rates across budget
        bands on{' '}
        <Link href="/curated-packs/budget" className={linkClass}>
          Shop by Budget
        </Link>
        .
      </>
    ),
  },
  {
    q: 'How do I add my company logo to the gifts?',
    a: 'Upload your logo once in the Gift Builder and preview it rendered on every product — drinkware, diaries, apparel, or tech — before you pay. You approve a branded mockup first, so there are no surprises on placement or print quality, including on luxury corporate gifts with your logo.',
    jsx: (
      <>
        Upload your logo once in the{' '}
        <Link href="/box" className={linkClass}>
          Gift Builder
        </Link>{' '}
        and preview it rendered on every product — drinkware, diaries, apparel, or tech — before you
        pay. You approve a branded mockup first, so there are no surprises on placement or print
        quality, including on luxury corporate gifts with your logo.
      </>
    ),
  },
  {
    q: 'Can I send corporate gifts to remote or work-from-home employees?',
    a: 'Orders currently ship as one consolidated delivery to a single address, so teams with distributed staff usually send the full batch to an office or a nominated coordinator and forward from there. Per-recipient delivery is in the works.',
  },
  {
    q: 'How quickly can I get bulk corporate gifts delivered?',
    a: 'Branded corporate gift orders are delivered in 10–15 days, with the timeline confirmed before you pay — so festival deadlines, annual days, and onboarding batches aren’t a gamble. For seasonal sends like Diwali or winter gifting, ordering early leaves room for logo proofing and dispatch.',
  },
];

const h2Class = 'text-4xl md:text-5xl font-serif font-normal text-center';

export function HomeSeoContent({
  categories,
}: {
  categories: Array<{ name: string; slug: string }>;
}) {
  return (
    <>
      <JsonLd data={faqPageSchema(FAQS.map((f) => ({ question: f.q, answer: f.a })))} />

      {/* ── What GIVOO offers ── */}
      <section className="py-16 md:py-24">
        <div className="container">
          <h2 className={h2Class}>
            Corporate Gifting, Perfectly Crafted{' '}
            <span className="italic text-[#800020]">in Bulk</span>
          </h2>
          <div className="mx-auto mt-6 max-w-3xl space-y-4 text-center text-base leading-relaxed text-[#5C5852]">
            <p>
              GIVOO is India’s first self-serve bulk corporate gifting platform, built so you can
              browse products, build a branded gift pack, and see a clear per-box price before you
              commit to anything.
            </p>
            <p>
              Whether you’re sending welcome kits to new joiners, thanking clients at year-end, or
              kitting out a 300-person conference, you handle it in one place. Pick from 500+
              curated products, add your logo to each product, the box and the greeting card, and
              get an instant, GST-inclusive quote. No minimum-order phone call to sit through, no
              “final pricing to follow” — what you see is what your finance team pays. It’s
              corporate gifting that works the way online ordering should.
            </p>
            <p>
              Start with ready-made corporate gift packs in{' '}
              <Link href="/curated-packs" className={linkClass}>
                Curated Packs
              </Link>
              , find employee gifts and client gifts{' '}
              <Link href="/curated-packs/occasions" className={linkClass}>
                By Occasion
              </Link>
              , plan bulk gifting{' '}
              <Link href="/curated-packs/budget" className={linkClass}>
                By Budget
              </Link>
              , or put together customized gift packs of branded gifts in the{' '}
              <Link href="/box" className={linkClass}>
                Gift Builder
              </Link>
              .
            </p>
          </div>

          <div className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2.5">
            {BROWSE_LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full bg-[#800020] px-5 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#66001A]"
              >
                {label}
              </Link>
            ))}
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="rounded-full border-2 border-bdr bg-white px-5 py-2 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-[#800020] hover:text-[#800020]"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why GIVOO ── */}
      <section className="bg-white py-16 md:py-24">
        <div className="container">
          <h2 className={h2Class}>
            Why Companies Choose GIVOO for{' '}
            <span className="italic text-[#800020]">Corporate Gifting?</span>
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-md border-2 border-bdr bg-[#F5F1EB] p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#800020]/10 text-[#800020]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5C5852]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQs ── */}
      <section className="py-16 md:py-24">
        <div className="container">
          <h2 className={h2Class}>
            Frequently Asked <span className="italic text-[#800020]">Questions</span>
          </h2>
          <div className="mx-auto mt-10 max-w-3xl divide-y divide-bdr border-y border-bdr">
            {FAQS.map((faq) => (
              // Shared `name` = exclusive accordion: opening one closes the others.
              <details key={faq.q} name="home-faq" className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink">
                  {faq.q}
                  <span className="shrink-0 text-xl text-ink-3 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#5C5852]">{faq.jsx ?? faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
