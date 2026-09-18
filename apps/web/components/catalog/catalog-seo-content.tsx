import Link from 'next/link';
import { JsonLd } from '@/components/seo/json-ld';
import { FaqSection } from '@/components/seo/faq-section';
import { faqPageSchema } from '@/lib/schema';
import { getCategorySummaries, type CategorySummary } from '@/lib/category-data';

/**
 * Long-form copy rendered BELOW the product grid on the unscoped /catalog page.
 * Server component — everything here is in the initial HTML. The FAQ array is
 * the single source for both the visible Q&As and the FAQPage JSON-LD.
 */

// `match` keywords tie each line of copy to the live Category rows (by name),
// which supply the circle image and the /category/[slug] link.
const CATEGORIES: Array<{ name: string; desc: string; match: string[] }> = [
  { name: 'Drinkware', desc: 'vacuum-insulated bottles, tumblers and coffee mugs that get used every day.', match: ['drinkware'] },
  { name: 'Bags & Travel', desc: 'laptop backpacks, sleeves and cabin trolleys for onboarding and travel kits.', match: ['bag'] },
  { name: 'Stationery & Desk', desc: 'PU leather diaries, notebooks, pens and desk organisers for meetings and events.', match: ['stationery'] },
  { name: 'Tech & Gadgets', desc: 'power banks, earbuds, speakers and wireless chargers for high-value recipients.', match: ['tech'] },
  { name: 'Gourmet & Hampers', desc: 'dry-fruit boxes, chocolate and festive hampers for Diwali and client gifting.', match: ['gourmet', 'hamper'] },
  {
    name: 'Leather & Accessories, Apparel, and Wellness',
    desc: 'for milestones, executive gifts and sustainability-led campaigns.',
    match: ['leather', 'apparel', 'wellness'],
  },
];

// Shown when a category has neither a cover nor any product image.
const PLACEHOLDER_IMAGE = '/placeholder-tile.svg';

/** One live category per keyword, in keyword order (so the combined line gets up to three circles). */
function matchCategories(match: string[], live: CategorySummary[]): CategorySummary[] {
  const found: CategorySummary[] = [];
  for (const keyword of match) {
    const hit = live.find((c) => c.name.toLowerCase().includes(keyword) && !found.includes(c));
    if (hit) found.push(hit);
  }
  return found;
}

const REASONS: Array<[string, string]> = [
  [
    'Branding is in the price',
    'The rate you see already covers your logo — no separate setup or customisation charge is added later.',
  ],
  [
    'Transparent per-unit pricing',
    'See the exact per-piece cost and a clear GST breakup before you commit, so finance can approve the PO quickly.',
  ],
  [
    'Pay after you approve',
    "It's ₹0 to place your order today; payment comes only after you sign off on the branded mockup.",
  ],
  [
    'Delivered in around 10 days',
    "With individual delivery to multiple addresses when you're gifting clients or remote employees across cities.",
  ],
];

const STEPS: Array<[string, string]> = [
  ['Browse', 'the catalogue or a curated pack.'],
  ['Build', 'your gift by adding products and quantities.'],
  ['Brand', 'it by uploading your logo.'],
  ['Quote', 'get instant, transparent per-unit pricing.'],
  ['Order', 'approve your mockup, pay, and track delivery.'],
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'What is the minimum order quantity for corporate gifts?',
    a: 'Most products in the catalogue start at a minimum of 25 units, and several start at 10. Each product page shows its own minimum, so you can plan quantities before building your pack.',
  },
  {
    q: 'Is logo branding included in the price?',
    a: "Yes. Every price in the GIVOO corporate gifting catalogue already includes logo branding — through laser engraving, UV printing or screen printing, depending on the product. There's no separate setup fee added at checkout.",
  },
  {
    q: 'Do I have to pay upfront to place a bulk gifting order?',
    a: "No. You pay ₹0 today. You place your order, approve a branded mockup of your gift, and only then make payment — so you see exactly what you're getting first.",
  },
  {
    q: 'How long does delivery take for bulk corporate gifts?',
    a: 'Branded orders are typically delivered in around 10 days after you approve your mockup. Timelines are confirmed before payment, and gifts can be delivered individually to multiple addresses.',
  },
  {
    q: 'Can I customise gifts with my company logo?',
    a: "Yes. Nearly every product can be branded with your company logo. Upload your logo in the builder, choose the product, and you'll get an instant quote and a mockup to approve before anything is produced.",
  },
];

const h2Class = 'text-3xl md:text-4xl font-serif font-light text-ink';
const bodyClass = 'text-base leading-relaxed text-ink-2';
const linkClass = 'font-semibold text-em underline';

export async function CatalogSeoContent() {
  // Top-level categories with their cover (or top-product) image.
  const liveCategories = await getCategorySummaries();

  return (
    <>
    <section className="bg-canvas pb-10">
      <JsonLd data={faqPageSchema(FAQS.map((f) => ({ question: f.q, answer: f.a })))} />

      <div className="mx-auto max-w-7xl space-y-6 px-4 md:px-10">
        {/* Categories */}
        <div className="py-4">
          <h2 className={h2Class}>Everything in one corporate gifting catalogue</h2>
          <p className={`mt-4 max-w-4xl ${bodyClass}`}>
            GIVOO is India&apos;s first self-serve platform for bulk corporate gifts, so you can
            browse, brand and order without waiting on a sales quote. The catalogue spans eight{' '}
            <Link href="/categories" className={linkClass}>
              categories
            </Link>{' '}
            built for real corporate use:
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map(({ name, desc, match }) => {
              const hits = matchCategories(match, liveCategories);
              return (
                <li
                  key={name}
                  className="flex items-start gap-4 rounded-md border-2 border-bdr bg-white p-5"
                >
                  {hits.length > 0 && (
                    <div className="flex shrink-0 -space-x-3">
                      {hits.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/category/${c.slug}`}
                          title={c.name}
                          className="block h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-gray-50 transition hover:z-10 hover:scale-110"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.imageUrl || c.previewImages[0] || PLACEHOLDER_IMAGE}
                            alt={c.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </Link>
                      ))}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed text-ink-2">
                    {hits.length === 1 && hits[0] ? (
                      <Link href={`/category/${hits[0].slug}`} className="font-semibold text-ink hover:text-em">
                        {name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink">{name}</span>
                    )}{' '}
                    — {desc}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className={`mt-6 ${bodyClass}`}>
            Every product lists its minimum order quantity and starting price, so there are no
            surprises before you build your pack.
          </p>
        </div>

        {/* Occasions + Reasons */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border-2 border-bdr bg-white p-6 md:p-10">
            <h2 className={h2Class}>Corporate Gifts for Every Occasion</h2>
            <p className={`mt-4 ${bodyClass}`}>
              The catalogue is organised around the moments when companies actually give gifts.
              Send onboarding kits to new joiners, Diwali and festive hampers to clients and staff,
              recognition and reward gifts to top performers, client and executive gifts to key
              accounts, and work-from-home or travel kits to distributed teams. Filter by{' '}
              <Link href="/occasions" className={linkClass}>
                occasion
              </Link>{' '}
              to see products already suited to that use — a farewell gift and a trade show giveaway
              rarely need the same thing.
            </p>
          </div>

          <div className="rounded-md border-2 border-em-200 bg-em-50 p-6 md:p-10">
            <h2 className={h2Class}>
              Teams Order Bulk Corporate Gifts from GIVOO for Several Reasons
            </h2>
            <ul className="mt-5 space-y-4">
              {REASONS.map(([title, desc]) => (
                <li key={title} className="text-sm leading-relaxed text-ink-2">
                  <span className="font-semibold text-ink">{title}:</span> {desc}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* How ordering works */}
        <div className="rounded-md border-2 border-bdr bg-white p-6 md:p-10">
          <h2 className={h2Class}>How ordering works</h2>
          <ol className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {STEPS.map(([title, desc], i) => (
              <li key={title} className="rounded-md border border-bdr bg-canvas p-4">
                <span className="font-serif text-3xl font-light text-em">0{i + 1}</span>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">
                  <span className="font-semibold text-ink">{title}</span> — {desc}
                </p>
              </li>
            ))}
          </ol>
          <p className={`mt-6 ${bodyClass}`}>
            Ready to start?{' '}
            <Link href="/box" className={linkClass}>
              Build your pack
            </Link>{' '}
            or browse{' '}
            <Link href="/curated-packs" className={linkClass}>
              curated packs
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
    {/* Same collapsible FAQ block the category / occasion pages use. */}
    <FaqSection
      heading="Corporate gifting catalogue"
      faqs={FAQS.map((f) => ({ question: f.q, answer: f.a }))}
    />
    </>
  );
}
