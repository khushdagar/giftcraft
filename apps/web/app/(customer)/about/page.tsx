import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ClipboardCheck,
  Coffee,
  Eye,
  FileText,
  Gift,
  Headphones,
  HeartHandshake,
  Mail,
  MapPin,
  NotebookPen,
  Package,
  Palette,
  PenLine,
  Phone,
  Receipt,
  Rocket,
  Shirt,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { JsonLd } from '@/components/seo/json-ld';
import { organizationSchema, breadcrumbSchema } from '@/lib/schema';
import { withPageSeo } from '@/lib/page-seo';
import { SITE_URL } from '@/lib/site';
import { CONTACT_FALLBACK, SUPPORT_PHONE } from '@/lib/constants';
import { Reveal } from './reveal';

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/about', baseMetadata);
}

const baseMetadata: Metadata = {
  // Title is used as-is (no brand suffix is appended)
  title: 'About GIVOO — Self-Serve Bulk Corporate Gifting Platform',
  description:
    'GIVOO is a self-serve bulk corporate gifting platform by Arts Shala, New Delhi. Build your own branded gift pack, see transparent per-unit pricing with branding included, and pay only after you approve the mockup.',
  alternates: { canonical: '/about' },
};


// Values must mirror the visible copy below (see lib/schema.ts).
function aboutPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${SITE_URL}/about#webpage`,
    url: `${SITE_URL}/about`,
    name: 'About GIVOO',
    description: baseMetadata.description,
    inLanguage: 'en-IN',
    mainEntity: {
      ...organizationSchema(),
      legalName: 'Arts Shala',
      slogan: 'Build your pack. See your price. Approve your mockup.',
      areaServed: { '@type': 'Country', name: 'India' },
      knowsAbout: [
        'Corporate gifting',
        'Bulk gift packs',
        'Branded merchandise',
        'Employee onboarding kits',
        'Festive corporate gifts',
        'Logo printing and product customisation',
      ],
    },
  };
}

const STATS = [
  { value: '25+', label: 'units per corporate pack order', tile: 'bg-amber-50 border-amber-200' },
  { value: '10+', label: 'units for party packs', tile: 'bg-rose-50 border-rose-200' },
  { value: '₹0', label: 'extra for standard logo branding', tile: 'bg-emerald-50 border-emerald-200' },
  { value: 'All India', label: 'delivery, confirmed by pincode', tile: 'bg-sky-50 border-sky-200' },
];

const OLD_WAY = [
  'Fill an enquiry form and wait for a call',
  'PDF catalogues with no prices',
  'Days of back-and-forth for one quote',
  'Branding and setup charges added later',
];

const GIVOO_WAY = [
  'Browse the catalog and start building right away',
  'Per-unit price shown for your exact quantity',
  'Live, itemised total as you add products',
  'Standard logo branding included in the price',
];

const AUDIENCES = [
  {
    icon: Users,
    title: 'HR & People Ops',
    desc: 'Onboarding kits, work anniversaries, rewards and recognition, and festive gifting such as Diwali and New Year.',
    tile: 'bg-violet-50 border-violet-200',
    iconTile: 'bg-violet-100 text-violet-600',
  },
  {
    icon: ClipboardCheck,
    title: 'Procurement & Admin',
    desc: 'Clear per-unit pricing, GST-compliant invoices with HSN codes, and a documented approval step before production.',
    tile: 'bg-sky-50 border-sky-200',
    iconTile: 'bg-sky-100 text-sky-600',
  },
  {
    icon: Building2,
    title: 'Corporate Buyers & Founders',
    desc: 'Client gifts, event and conference kits, and branded merchandise for marketing teams.',
    tile: 'bg-amber-50 border-amber-200',
    iconTile: 'bg-amber-100 text-amber-600',
  },
];

const STEPS = [
  {
    icon: SlidersHorizontal,
    title: 'Set your quantity',
    desc: 'The price tier for every product follows from it.',
    tile: 'bg-amber-50 border-amber-200',
    num: 'text-amber-500',
  },
  {
    icon: ShoppingBag,
    title: 'Choose products',
    desc: 'Pick what goes into the pack from the catalog.',
    tile: 'bg-indigo-50 border-indigo-200',
    num: 'text-indigo-500',
  },
  {
    icon: Palette,
    title: 'Add your logo',
    desc: 'Upload it and choose how each item is branded.',
    tile: 'bg-rose-50 border-rose-200',
    num: 'text-rose-500',
  },
  {
    icon: Package,
    title: 'Pick packaging',
    desc: 'Boxes sized to your pack, plus any add-ons.',
    tile: 'bg-emerald-50 border-emerald-200',
    num: 'text-emerald-500',
  },
  {
    icon: FileText,
    title: 'Review & order',
    desc: 'See the full breakdown, download a quote, or place the order.',
    tile: 'bg-sky-50 border-sky-200',
    num: 'text-sky-500',
  },
];

const PRICE_LINES: Array<{ label: string; note: string; highlight?: boolean }> = [
  { label: 'Products', note: 'per-unit, by quantity tier' },
  { label: 'Logo branding', note: 'included', highlight: true },
  { label: 'Packaging', note: 'sized to your pack' },
  { label: 'GST', note: 'per product HSN code' },
  { label: 'Shipping', note: 'quoted from your pincode' },
  { label: 'Payment gateway fee', note: 'shown as its own line' },
];

const MOCKUP_FLOW = [
  { icon: Receipt, title: 'Place your order', desc: 'Build your pack and confirm the order online.' },
  { icon: Eye, title: 'We send a mockup', desc: 'Your logo on your products, with an approval link.' },
  { icon: PenLine, title: 'Approve or revise', desc: 'Request revisions until it looks right.' },
  { icon: BadgeCheck, title: 'Then you pay', desc: 'Payment is due only after you approve. Production starts after approval.' },
];

const VALUES = [
  {
    icon: Eye,
    title: 'Transparency',
    desc: 'Every price, tax, and fee is shown as its own line before you pay.',
    iconTile: 'bg-amber-100 text-amber-600',
  },
  {
    icon: SlidersHorizontal,
    title: 'Buyer control',
    desc: 'You build the pack, you approve the mockup, you decide when production starts.',
    iconTile: 'bg-violet-100 text-violet-600',
  },
  {
    icon: BadgeCheck,
    title: 'Quality',
    desc: 'Every order is checked before it is dispatched.',
    iconTile: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Receipt,
    title: 'Compliance',
    desc: 'GST-compliant invoicing with per-product HSN codes, ready for input tax credit.',
    iconTile: 'bg-sky-100 text-sky-600',
  },
];

const PACK_ICONS = [
  { icon: Coffee, tile: 'bg-amber-100 text-amber-600' },
  { icon: NotebookPen, tile: 'bg-indigo-100 text-indigo-600' },
  { icon: Shirt, tile: 'bg-rose-100 text-rose-600' },
  { icon: Headphones, tile: 'bg-emerald-100 text-emerald-600' },
  { icon: PenLine, tile: 'bg-sky-100 text-sky-600' },
  { icon: Gift, tile: 'bg-violet-100 text-violet-600' },
];

const linkClass = 'font-semibold text-em underline';

function SectionHeading({ label, title, intro }: { label: string; title: string; intro?: ReactNode }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-3">{label}</p>
      <h2 className="mt-2 font-display text-3xl font-normal tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-3 text-base leading-relaxed text-ink-2">{intro}</p>}
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <JsonLd data={aboutPageSchema()} />
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'About Us' }])} />

      <div className="min-h-screen bg-canvas">
        <div className="container-gc-w space-y-16 py-10 md:space-y-24 md:py-14">
          {/* ── Hero ── */}
          <section>
            <p className="mb-4 text-xs text-ink-3">
              <Link href="/" className="text-em">
                Home
              </Link>{' '}
              / <span>About Us</span>
            </p>

            <div className="relative overflow-hidden rounded-md bg-em text-white">
              {/* decorative rings */}
              <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[40px] border-white/5" />
              <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full border-[32px] border-white/5" />

              <div className="relative grid items-center gap-10 p-7 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-14">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                    <Sparkles className="h-3.5 w-3.5" /> About GIVOO
                  </p>
                  <h1 className="mt-5 font-display text-4xl font-normal leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                    Corporate gifting, without the sales call.
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85">
                    GIVOO is a self-serve bulk corporate gifting platform. Companies browse products,
                    build their own branded gift pack, see the exact per-unit price instantly, and
                    place the order online — without waiting on a sales rep or a quote.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href="/box"
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 font-bold text-em transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      Build your pack <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/catalog"
                      className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/40 px-7 py-3.5 font-bold text-white transition hover:-translate-y-1 hover:bg-white/10"
                    >
                      Browse catalog
                    </Link>
                  </div>
                </div>

                {/* Pack creative */}
                <div aria-hidden className="relative mx-auto w-full max-w-sm">
                  <div className="rotate-2 rounded-md border-2 border-white/20 bg-canvas p-5 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-3">
                        Your pack
                      </p>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Logo included
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {PACK_ICONS.map(({ icon: Icon, tile }, i) => (
                        <div
                          key={i}
                          className={`flex aspect-square items-center justify-center rounded-md ${tile}`}
                        >
                          <Icon className="h-7 w-7" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-md bg-ink px-4 py-3 text-white">
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                        Per unit
                      </span>
                      <span className="text-sm font-black">Live price</span>
                    </div>
                  </div>
                  <div className="absolute -bottom-4 -left-3 -rotate-6 rounded-2xl bg-white px-4 py-2 text-xs font-bold text-ink shadow-xl">
                    <Check className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />
                    Mockup before production
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {STATS.map((s, i) => (
                <Reveal key={s.label} delay={i * 0.06}>
                  <div className={`h-full rounded-md border-2 p-5 ${s.tile}`}>
                    <p className="text-2xl font-black tabular-nums tracking-tight text-ink sm:text-3xl">
                      {s.value}
                    </p>
                    <p className="mt-1 text-sm text-ink-2">{s.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── What GIVOO is ── */}
          <section>
            <Reveal>
              <SectionHeading
                label="Who we are"
                title="What GIVOO is"
                intro={
                  <>
                    GIVOO is an online platform for ordering branded corporate gifts in bulk. It is
                    built and operated by <span className="font-semibold text-ink">Arts Shala</span>,
                    a gifting and merchandise business based in New Delhi, India.
                  </>
                }
              />
            </Reveal>

            <div className="grid gap-4 md:grid-cols-2">
              <Reveal>
                <div className="h-full rounded-md border-2 border-bdr bg-white p-6 md:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-3">
                    The old way
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-ink">
                    Traditional corporate gifting
                  </h3>
                  <ul className="mt-5 space-y-3">
                    {OLD_WAY.map((t) => (
                      <li key={t} className="flex items-start gap-3 text-sm text-ink-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                          <X className="h-3 w-3" />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="h-full rounded-md border-2 border-emerald-200 bg-emerald-50 p-6 md:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    The GIVOO way
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-ink">
                    Self-serve, in one sitting
                  </h3>
                  <ul className="mt-5 space-y-3">
                    {GIVOO_WAY.map((t) => (
                      <li key={t} className="flex items-start gap-3 text-sm text-ink">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </section>

          {/* ── Who we serve ── */}
          <section>
            <Reveal>
              <SectionHeading
                label="Who we serve"
                title="Built for the people who run gifting"
                intro="GIVOO is designed for the teams inside a company who actually plan, approve, and pay for gifts. Smaller group orders are covered too, through party packs with a lower minimum quantity."
              />
            </Reveal>
            <div className="grid gap-4 md:grid-cols-3">
              {AUDIENCES.map(({ icon: Icon, title, desc, tile, iconTile }, i) => (
                <Reveal key={title} delay={i * 0.08} lift className="rounded-md">
                  <div className={`h-full rounded-md border-2 p-6 md:p-8 ${tile}`}>
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconTile}`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold tracking-tight text-ink">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-2">{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── Build Your Pack ── */}
          <section>
            <Reveal>
              <SectionHeading
                label="The differentiator"
                title="Build Your Pack"
                intro={
                  <>
                    Most gifting vendors sell fixed hampers. GIVOO&apos;s core is the{' '}
                    <Link href="/box" className={linkClass}>
                      Gift Builder
                    </Link>
                    , where you assemble your own pack and watch the per-unit and total price update
                    live — so you design to a budget instead of guessing at one.
                  </>
                }
              />
            </Reveal>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map(({ icon: Icon, title, desc, tile, num }, i) => (
                <li key={title}>
                  <Reveal delay={i * 0.06} lift className="h-full rounded-md">
                    <div className={`h-full rounded-md border-2 p-5 ${tile}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-3xl font-black tabular-nums tracking-tighter ${num}`}>
                          0{i + 1}
                        </span>
                        <Icon className="h-6 w-6 text-ink" />
                      </div>
                      <h3 className="mt-4 text-base font-bold tracking-tight text-ink">{title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{desc}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm text-ink-2">
              Prefer to start from something ready-made? Our{' '}
              <Link href="/curated-packs" className={linkClass}>
                curated packs
              </Link>{' '}
              are organised by occasion and budget and can be customised the same way.
            </p>
          </section>

          {/* ── Pricing + Mockup ── */}
          <section className="grid gap-4 lg:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-md border-2 border-amber-200 bg-amber-50 p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Pricing
                </p>
                <h2 className="mt-2 font-display text-3xl font-normal tracking-tight text-ink">
                  Transparent per-unit pricing, branding included
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">
                  Every product shows its per-unit price by quantity tier — the more units you order,
                  the lower the price per unit. Standard logo branding is already in that price;
                  there is no separate branding or setup charge added later.
                </p>

                {/* Breakdown creative */}
                <div className="mt-6 rounded-md border-2 border-amber-200 bg-white p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-3">
                    What your breakdown shows
                  </p>
                  <ul className="mt-3 divide-y divide-bdr">
                    {PRICE_LINES.map((l) => (
                      <li key={l.label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                        <span className="font-semibold text-ink">{l.label}</span>
                        {l.highlight ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {l.note}
                          </span>
                        ) : (
                          <span className="text-right text-xs text-ink-3">{l.note}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-4 text-sm text-ink-2">
                  The number you see in the builder is the number on your invoice. See{' '}
                  <Link href="/gst" className={linkClass}>
                    GST information
                  </Link>
                  .
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="h-full rounded-md bg-ink p-6 text-white md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Payment policy
                </p>
                <h2 className="mt-2 font-display text-3xl font-normal tracking-tight">
                  Pay after you approve the mockup
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  Nothing goes into production until you approve it — so you never pay in full for
                  something you have not seen.
                </p>

                <ol className="mt-7 space-y-5">
                  {MOCKUP_FLOW.map(({ icon: Icon, title, desc }, i) => (
                    <li key={title} className="relative flex gap-4">
                      {i < MOCKUP_FLOW.length - 1 && (
                        <span className="absolute left-5 top-11 h-[calc(100%-1.25rem)] w-0.5 bg-white/15" />
                      )}
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold tracking-tight">{title}</h3>
                        <p className="mt-0.5 text-sm text-white/70">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </section>

          {/* ── Delivery ── */}
          <section>
            <Reveal>
              <div className="grid gap-8 rounded-md border-2 border-sky-200 bg-sky-50 p-6 md:p-10 lg:grid-cols-[1fr_1fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                    Bulk & delivery
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-normal tracking-tight text-ink sm:text-4xl">
                    Bulk ordering, delivered across India
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink-2">
                    GIVOO is built for bulk. Corporate gift packs start at 25 units and party packs
                    at 10 units, and quantity-tier pricing scales up to large company-wide orders.
                    Products are sourced, branded, assembled, and quality-checked before dispatch.
                  </p>
                  <p className="mt-3 text-sm text-ink-2">
                    See{' '}
                    <Link href="/shipping" className={linkClass}>
                      shipping
                    </Link>{' '}
                    for how timelines are calculated.
                  </p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: MapPin, t: 'Anywhere in India', d: 'Serviceability confirmed from your pincode.' },
                    { icon: Truck, t: 'Courier quoted upfront', d: 'Exact charge shown before you pay.' },
                    { icon: Rocket, t: 'Delivery window shown', d: 'Estimated at the delivery step and on your order.' },
                    { icon: Package, t: 'One consolidated delivery', d: 'Orders currently ship to a single address.' },
                  ].map(({ icon: Icon, t, d }) => (
                    <li key={t} className="rounded-md border-2 border-sky-200 bg-white p-4">
                      <Icon className="h-5 w-5 text-sky-600" />
                      <p className="mt-2 text-sm font-bold text-ink">{t}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{d}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </section>

          {/* ── Mission, vision, values ── */}
          <section>
            <Reveal>
              <SectionHeading label="What drives us" title="Mission, vision, and values" />
            </Reveal>
            <div className="grid gap-4 md:grid-cols-2">
              <Reveal>
                <div className="h-full rounded-md border-2 border-em-200 bg-em-50 p-6 md:p-8">
                  <Rocket className="h-7 w-7 text-em" />
                  <h3 className="mt-4 text-xl font-bold tracking-tight text-ink">Our mission</h3>
                  <p className="mt-2 text-base leading-relaxed text-ink-2">
                    To make bulk corporate gifting as simple as ordering online — self-serve,
                    transparent, and fast — so teams spend their time choosing great gifts, not
                    chasing quotes.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="h-full rounded-md border-2 border-violet-200 bg-violet-50 p-6 md:p-8">
                  <HeartHandshake className="h-7 w-7 text-violet-600" />
                  <h3 className="mt-4 text-xl font-bold tracking-tight text-ink">Our vision</h3>
                  <p className="mt-2 text-base leading-relaxed text-ink-2">
                    To be the default platform Indian companies use to gift their employees,
                    clients, and partners.
                  </p>
                </div>
              </Reveal>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map(({ icon: Icon, title, desc, iconTile }, i) => (
                <Reveal key={title} delay={i * 0.06} lift className="rounded-md">
                  <div className="h-full rounded-md border-2 border-bdr bg-white p-6">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconTile}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-base font-bold tracking-tight text-ink">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── Company details + CTA ── */}
          <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Reveal>
              <div className="h-full rounded-md border-2 border-bdr bg-white p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-3">
                  Company
                </p>
                <h2 className="mt-2 font-display text-3xl font-normal tracking-tight text-ink">
                  Company and registration details
                </h2>
                <dl className="mt-6 divide-y divide-bdr text-sm">
                  {[
                    ['Brand', 'GIVOO'],
                    ['Operated by', 'Arts Shala'],
                    ['Location', 'New Delhi, Delhi, India'],
                    ['Area served', 'All of India'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-6 py-3">
                      <dt className="text-ink-3">{k}</dt>
                      <dd className="text-right font-semibold text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={`mailto:${CONTACT_FALLBACK.email}`}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-bdr px-4 py-2 text-sm font-semibold text-ink transition hover:border-em hover:text-em"
                  >
                    <Mail className="h-4 w-4" /> {CONTACT_FALLBACK.email}
                  </a>
                  <a
                    href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-bdr px-4 py-2 text-sm font-semibold text-ink transition hover:border-em hover:text-em"
                  >
                    <Phone className="h-4 w-4" /> {SUPPORT_PHONE}
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-md bg-em p-6 text-white md:p-10">
                <div className="pointer-events-none absolute -bottom-20 -right-16 h-64 w-64 rounded-full border-[32px] border-white/5" />
                <Gift className="h-9 w-9" />
                <h2 className="mt-4 font-display text-3xl font-normal tracking-tight sm:text-4xl">
                  Ready to build your pack?
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85">
                  See your price in minutes. Questions about an order or a large requirement? Talk
                  to us or read the{' '}
                  <Link href="/faq" className="font-semibold underline">
                    FAQ
                  </Link>
                  .
                </p>
                <div className="relative mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/box"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 font-bold text-em transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    Start building <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/40 px-7 py-3.5 font-bold text-white transition hover:-translate-y-1 hover:bg-white/10"
                  >
                    Contact us
                  </Link>
                </div>
              </div>
            </Reveal>
          </section>
        </div>
      </div>
    </>
  );
}
