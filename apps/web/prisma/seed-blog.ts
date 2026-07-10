/**
 * Seeds 8 sample blog posts + 4 categories so the blog has something to show.
 *
 * These are placeholders. Delete them from Admin → Blog once you publish real
 * posts, or wipe them all with:
 *
 *     npx tsx prisma/seed-blog.ts --clean
 *
 * Re-running without --clean upserts by slug, so it never creates duplicates.
 */
import { PrismaClient } from '@prisma/client';
import { readingMinutes, autoExcerpt } from '../lib/blog';

const prisma = new PrismaClient();

/** Every URL below returns 200 from images.unsplash.com (whitelisted in next.config.js). */
const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

const CATEGORIES = [
  { slug: 'gifting-strategy', name: 'Gifting Strategy', description: 'How to plan gifting that actually lands.', sortOrder: 0 },
  { slug: 'sustainability', name: 'Sustainability', description: 'Eco-conscious materials and packaging.', sortOrder: 1 },
  { slug: 'festivals', name: 'Festivals', description: 'Diwali, Holi, New Year and everything between.', sortOrder: 2 },
  { slug: 'how-to', name: 'How-To', description: 'Practical guides for running a gifting programme.', sortOrder: 3 },
];

interface SeedPost {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  cover: string;
  coverAlt: string;
  metaTitle?: string;
  metaDescription?: string;
  featured?: boolean;
  /** Days ago this post was published. */
  daysAgo: number;
  content: string;
}

const POSTS: SeedPost[] = [
  {
    slug: 'psychology-of-corporate-gifting',
    title: 'The Psychology of Corporate Gifting',
    category: 'gifting-strategy',
    tags: ['strategy', 'client-gifting', 'research'],
    cover: img('1513885535751-8b9238bd345a'),
    coverAlt: 'Wrapped gift boxes tied with ribbon on a pale surface',
    metaTitle: 'The Psychology of Corporate Gifting | GiftCraft',
    metaDescription:
      'Why a well-chosen gift outperforms a discount, and what reciprocity research tells us about building durable business relationships.',
    featured: true,
    daysAgo: 3,
    content: `
<p>A gift is not a transaction. That single distinction explains why a ₹900 bottle sent to a client at the right moment does more for a relationship than a ₹9,000 discount buried in an invoice.</p>

<h2>Reciprocity is not manipulation</h2>
<p>The norm of reciprocity — our instinct to return a favour — is one of the most consistent findings in social psychology. But it only works when the gesture reads as <strong>genuine</strong>. The moment a gift feels transactional, it stops being a gift and becomes an obligation, and obligations breed resentment rather than loyalty.</p>
<p>The practical test is simple: would you still send it if you knew the recipient could never buy from you again?</p>

<h2>Why utility beats extravagance</h2>
<p>Expensive gifts create awkwardness. A gift that sits on someone's desk and gets used every day creates a hundred small reminders of your company.</p>
<ul>
  <li><strong>Daily-use items</strong> — bottles, notebooks, and bags earn repeated impressions.</li>
  <li><strong>Consumables</strong> — coffee, chocolate, and dry fruit are enjoyed and never awkward to accept.</li>
  <li><strong>Desk objects</strong> — anything that stays in a line of sight quietly does its job.</li>
</ul>

<blockquote>
  <p>The best corporate gift is the one your recipient would have bought for themselves, but slightly nicer than they'd have justified.</p>
</blockquote>

<h2>Timing outperforms budget</h2>
<p>An unexpected gift in March is remembered. The same gift in the Diwali flood is one of forty. If your budget is tight, spend it off-season — you will buy more attention per rupee.</p>

<h3>What to do next</h3>
<p>Pick one relationship that matters and one moment that isn't a holiday. Send something useful. Then do nothing — no follow-up email, no call. That restraint is what separates a gift from a pitch.</p>
`.trim(),
  },
  {
    slug: 'sustainable-packaging-trends-2026',
    title: 'Sustainable Packaging Is No Longer a Premium Feature',
    category: 'sustainability',
    tags: ['sustainability', 'packaging', 'eco-friendly'],
    cover: img('1542744173-8e7e53415bb0'),
    coverAlt: 'Brown kraft paper packaging materials arranged on a desk',
    metaDescription:
      'Recycled board, soy inks and plastic-free fills have moved from nice-to-have to baseline expectation. Here is what that means for your gifting budget.',
    daysAgo: 9,
    content: `
<p>Five years ago, eco-friendly packaging was a line item you justified. Today it is the line item you get asked about. Procurement teams increasingly screen suppliers on packaging before they look at the product inside.</p>

<h2>What actually changed</h2>
<p>Three things happened at once: recycled board reached price parity with virgin board at volume, plastic-free void fill became widely available in India, and — most importantly — recipients started noticing.</p>

<h2>The four decisions that matter</h2>
<ol>
  <li><strong>Board stock.</strong> Recycled kraft costs marginally less than bleached white and looks more considered.</li>
  <li><strong>Void fill.</strong> Crinkle-cut paper replaces plastic shred at nearly identical cost.</li>
  <li><strong>Inks.</strong> Soy and water-based inks print beautifully on uncoated board.</li>
  <li><strong>Adhesive tape.</strong> Paper tape is the single cheapest visible signal of intent.</li>
</ol>

<h3>The trap to avoid</h3>
<p>A recycled box wrapped in shrink film fools nobody and costs you more than either option alone. Consistency is the whole point — a half-sustainable pack reads as marketing, not commitment.</p>

<p>If you are choosing between a more sustainable box and a more expensive product, choose the box. It is the first thing your recipient touches, and the last thing they throw away.</p>
`.trim(),
  },
  {
    slug: 'diwali-corporate-gifting-guide',
    title: 'The Diwali Corporate Gifting Guide',
    category: 'festivals',
    tags: ['diwali', 'festivals', 'client-gifting'],
    cover: img('1607083206869-4c7672e72a8a'),
    coverAlt: 'Lit diyas arranged for Diwali celebrations',
    metaTitle: 'Diwali Corporate Gifting Guide | GiftCraft',
    metaDescription:
      'Timelines, budgets, and etiquette for Diwali corporate gifting in India — plus the mistakes that quietly cost you goodwill.',
    featured: true,
    daysAgo: 16,
    content: `
<p>Diwali is the single largest corporate gifting moment in India, and the one most companies get wrong. Not because their gifts are bad, but because their timing is.</p>

<h2>Work backwards from the festival</h2>
<p>Count back from Diwali, not forward from today:</p>
<ul>
  <li><strong>10 weeks out</strong> — lock your budget and recipient list.</li>
  <li><strong>8 weeks out</strong> — approve the pack and artwork. Vendor lead times balloon after this point.</li>
  <li><strong>4 weeks out</strong> — packs assembled and quality-checked.</li>
  <li><strong>2 weeks out</strong> — dispatch. Couriers are saturated in the final week.</li>
</ul>
<p>Arriving a week early is remembered as thoughtful. Arriving two days late is remembered as an afterthought.</p>

<h2>Etiquette that still matters</h2>
<p>Avoid leather for recipients who may not want it. Check whether sweets suit dietary restrictions before defaulting to a mithai box. And when gifting to a team, gift to the whole team — a hamper for the manager alone lands badly.</p>

<h2>Where the budget should go</h2>
<p>Spend on the box and the card. The products inside will be forgotten within a month; the moment of opening will not.</p>

<hr>

<p>Start early. Everything else in Diwali gifting is downstream of that one decision.</p>
`.trim(),
  },
  {
    slug: 'employee-onboarding-kits-that-work',
    title: 'Employee Onboarding Kits That People Actually Keep',
    category: 'how-to',
    tags: ['onboarding', 'employees', 'strategy'],
    cover: img('1517245386807-bb43f82c33c4'),
    coverAlt: 'A tidy desk with a notebook, laptop and coffee cup',
    metaDescription:
      'The first thing a new hire touches is their welcome kit. Here is how to build one that survives the first month.',
    daysAgo: 24,
    content: `
<p>Most onboarding kits are a t-shirt nobody wears and a pen nobody keeps. The kit is the first physical artefact of your culture, and it is almost always designed by whoever had spare time.</p>

<h2>The three-object rule</h2>
<p>A great kit contains exactly three things: something they will <strong>use daily</strong>, something that <strong>tells a story</strong>, and something <strong>consumable</strong>. Adding a fourth object dilutes all three.</p>

<h3>Something they'll use daily</h3>
<p>A good bottle or a genuinely nice notebook. If it isn't something you'd use, it isn't good enough.</p>

<h3>Something that tells a story</h3>
<p>A short printed note on why the company exists. Not a values poster — a paragraph, signed.</p>

<h3>Something consumable</h3>
<p>Coffee, chocolate, dry fruit. It signals generosity without demanding shelf space.</p>

<h2>Get sizing right or skip apparel</h2>
<p>Nothing kills a kit faster than a t-shirt in the wrong size. If you cannot collect sizes before day one, leave apparel out and send it later.</p>

<blockquote>
  <p>A kit of three excellent objects beats a kit of seven adequate ones, every time.</p>
</blockquote>
`.trim(),
  },
  {
    slug: 'how-gst-works-on-corporate-gifts',
    title: 'How GST Actually Works on Corporate Gifts',
    category: 'how-to',
    tags: ['gst', 'compliance', 'finance'],
    cover: img('1554224155-6726b3ff858f'),
    coverAlt: 'A calculator and financial documents on a desk',
    metaDescription:
      'HSN codes, input tax credit, and why the rate on your gift pack is not one number. A plain-English guide for finance teams.',
    daysAgo: 31,
    content: `
<p>Finance teams ask us one question more than any other: what GST rate applies to a gift pack? The honest answer is that there isn't one.</p>

<h2>Rates are per product, not per pack</h2>
<p>GST is levied against each item's HSN code. A notebook and a power bank in the same box are taxed at different rates, and a compliant invoice lists them separately with their own taxable value, rate, and tax amount.</p>
<p>Any supplier quoting you a single blended rate across a mixed pack is rounding somewhere, and you inherit that problem at audit.</p>

<h2>CGST + SGST, or IGST?</h2>
<p>It depends entirely on where the goods are delivered relative to where they're supplied from. Same state, and the tax splits evenly into CGST and SGST. Different state, and the identical total appears as a single IGST line. The amount you pay does not change — only the split on the invoice does.</p>

<h2>Shipping is usually tax-inclusive</h2>
<p>Courier rates in India are quoted inclusive of 18% GST under HSN 996812. A correct invoice reverse-calculates this rather than adding tax on top:</p>
<pre><code>taxable value = shipping ÷ 1.18
GST           = taxable value × 0.18</code></pre>
<p>If your supplier adds 18% to a courier rate that already contained it, you are paying tax twice.</p>

<h2>Claiming input tax credit</h2>
<p>Give your GSTIN at checkout so it is printed on the invoice. Without it the order is billed as B2C and the credit is gone.</p>
`.trim(),
  },
  {
    slug: 'choosing-gifts-for-remote-teams',
    title: 'Choosing Gifts for a Fully Remote Team',
    category: 'gifting-strategy',
    tags: ['remote', 'employees', 'logistics'],
    cover: img('1521737604893-d14cc237f11d'),
    coverAlt: 'A distributed team on a video call',
    metaDescription:
      'Shipping to forty home addresses is a different problem from shipping to one office. What changes, and what to plan for.',
    daysAgo: 38,
    content: `
<p>Gifting to a remote team is not the same exercise as gifting to an office, and treating it as one is why so many remote gifts arrive late, damaged, or at an address someone moved out of in 2023.</p>

<h2>Address data is the whole project</h2>
<p>Collect addresses at least three weeks ahead, and ask people to confirm rather than supply. Confirmation catches stale data; supply does not. Expect roughly one in ten addresses to need a correction.</p>

<h2>Weight becomes your budget</h2>
<p>Consolidated office delivery hides shipping cost inside a single consignment. Individual delivery multiplies it by headcount, and couriers bill on <strong>volumetric</strong> weight — length × width × height ÷ 5000 — whenever that exceeds actual weight.</p>
<p>A large, light gift can cost more to ship than a small, heavy one. Design the pack around the box, not the other way round.</p>

<h2>Pick gifts that survive a courier</h2>
<ul>
  <li>Avoid glass and anything with a liquid seal.</li>
  <li>Avoid chocolate between April and September.</li>
  <li>Favour items that need no assembly and no manual.</li>
</ul>

<p>Plan for it, and remote gifting works beautifully. Improvise, and you spend December chasing tracking numbers.</p>
`.trim(),
  },
  {
    slug: 'branding-techniques-explained',
    title: 'Screen Print, UV, Laser: Branding Techniques Explained',
    category: 'how-to',
    tags: ['branding', 'printing', 'design'],
    cover: img('1556742049-0cfed4f6a45d'),
    coverAlt: 'Close-up of a screen printing press in a workshop',
    metaDescription:
      'Which branding technique suits which material, what each does to your logo, and when to change your artwork rather than the method.',
    daysAgo: 46,
    content: `
<p>The same logo looks different on a steel bottle, a cotton bag, and a leather journal — not because the printer got it wrong, but because each material accepts ink differently.</p>

<h2>Screen printing</h2>
<p>Ink pushed through a mesh. Excellent on fabric and flat surfaces, superb colour density, and cheap at volume. Struggles with fine gradients and tight detail.</p>

<h2>UV printing</h2>
<p>Ink cured instantly under ultraviolet light. Handles full colour and photographic detail on hard surfaces, and sits slightly raised. The best default for bottles and tech.</p>

<h2>Laser engraving</h2>
<p>No ink at all — the surface itself is burned away. Permanent, elegant, and monochrome by definition. On steel it reads as a light etch; on wood, dark. If your logo depends on colour, engraving will not carry it.</p>

<h2>Embroidery</h2>
<p>Thread, not ink. Beautiful on apparel and bags, and the only technique that survives a hundred washes. Small text below about 4mm turns to mush.</p>

<h3>The rule that saves the most reprints</h3>
<p>Supply vector artwork, and supply a single-colour version of your logo. A logo that only works in five colours with a gradient will look bad in at least two of the four techniques above.</p>
`.trim(),
  },
  {
    slug: 'gifting-budget-per-employee',
    title: 'How Much Should You Spend Per Employee?',
    category: 'gifting-strategy',
    tags: ['budget', 'employees', 'strategy'],
    cover: img('1554224154-26032ffc0d07'),
    coverAlt: 'Coins stacked beside a small notebook and pen',
    metaDescription:
      'Benchmarks for per-head corporate gifting budgets in India, and why the number matters far less than how you allocate it.',
    daysAgo: 54,
    content: `
<p>Every gifting conversation starts with a number per head. It is the wrong place to start, but since everyone starts there anyway, here is what we see.</p>

<h2>Rough benchmarks</h2>
<ul>
  <li><strong>₹500–₹900</strong> — festival gifts for large teams, or partner gifting at scale.</li>
  <li><strong>₹1,200–₹2,500</strong> — onboarding kits and annual employee gifts.</li>
  <li><strong>₹3,000+</strong> — key clients, milestone recognition, and executive gifting.</li>
</ul>

<h2>Why allocation beats amount</h2>
<p>A ₹1,500 pack made of one excellent object and good packaging outperforms a ₹2,500 pack of four mediocre ones. Quantity signals bulk buying. Restraint signals choice.</p>

<blockquote>
  <p>Nobody has ever been disappointed by receiving one very good thing.</p>
</blockquote>

<h2>Spend the marginal rupee on presentation</h2>
<p>If you find yourself with a little extra budget, do not add a fifth item. Upgrade the box, add a printed card, or improve the branding technique. Those are the parts people photograph.</p>

<h3>Tiering is fine, hiding it is not</h3>
<p>Different budgets for different relationships is normal and expected. Just make sure two people in the same room never open visibly different packs.</p>
`.trim(),
  },
];

async function main() {
  const clean = process.argv.includes('--clean');

  if (clean) {
    const { count } = await prisma.blogPost.deleteMany({
      where: { slug: { in: POSTS.map((p) => p.slug) } },
    });
    await prisma.blogCategory.deleteMany({ where: { slug: { in: CATEGORIES.map((c) => c.slug) } } });
    console.log(`🧹 Removed ${count} sample posts and their categories.`);
    return;
  }

  // Byline: use the first super_admin if one exists.
  const admin = await prisma.user.findFirst({
    where: { role: 'super_admin' },
    select: { id: true, name: true },
  });

  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.blogCategory.upsert({
      where: { slug: c.slug },
      create: c,
      update: { name: c.name, description: c.description, sortOrder: c.sortOrder },
    });
    categoryIds.set(c.slug, row.id);
  }
  console.log(`✅ ${CATEGORIES.length} categories`);

  for (const p of POSTS) {
    const publishedAt = new Date(Date.now() - p.daysAgo * 24 * 60 * 60 * 1000);
    const data = {
      title: p.title,
      excerpt: autoExcerpt(p.content),
      content: p.content,
      coverImageUrl: p.cover,
      coverImageAlt: p.coverAlt,
      status: 'published' as const,
      publishedAt,
      isFeatured: p.featured ?? false,
      tags: p.tags,
      categoryId: categoryIds.get(p.category) ?? null,
      authorId: admin?.id ?? null,
      authorName: admin?.name ?? 'GiftCraft Team',
      metaTitle: p.metaTitle ?? null,
      metaDescription: p.metaDescription ?? null,
      readingMinutes: readingMinutes(p.content),
    };

    await prisma.blogPost.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
    });
    console.log(`   · ${p.title}`);
  }

  console.log(`\n✅ ${POSTS.length} sample posts seeded.`);
  console.log('   Delete them from Admin → Blog, or run: npx tsx prisma/seed-blog.ts --clean');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
