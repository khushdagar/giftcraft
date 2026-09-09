import { prisma } from '@/lib/prisma';
import { getPacks, getBudgetTiles, getPackOccasionTiles } from '@/lib/pack-data';
import { SITE_URL } from '@/lib/site';

// /llms.txt — the machine-readable site overview for AI crawlers. Rendered at
// request time so the budget bands, occasion collections and category tree
// listed here always match what the admin has published. Replaces the old
// static public/llms.txt.
export const dynamic = 'force-dynamic';

interface Line {
  name: string;
  path: string;
  note?: string | null;
}

function section(heading: string, lines: Line[]): string {
  if (lines.length === 0) return '';
  const body = lines
    .map((l) => {
      const note = (l.note || '').replace(/\s+/g, ' ').trim();
      return `- [${l.name}](${SITE_URL}${l.path})${note ? `: ${note}` : ''}`;
    })
    .join('\n');
  return `## ${heading}\n\n${body}\n\n`;
}

export async function GET() {
  let budgetLines: Line[] = [];
  let packOccasionLines: Line[] = [];
  let occasionLines: Line[] = [];
  let categoryLines: Line[] = [];

  try {
    const packs = await getPacks();
    const [bands, packOccasions, occasions, categories] = await Promise.all([
      getBudgetTiles(packs),
      getPackOccasionTiles(packs),
      prisma.occasionConfig.findMany({
        where: { isActive: true, isCollection: false },
        select: { name: true, slug: true },
        orderBy: [{ sortOrder: 'asc' }, { viewCount: 'desc' }],
      }),
      prisma.category.findMany({
        select: {
          name: true,
          slug: true,
          parentId: true,
          children: { select: { name: true, slug: true }, orderBy: { name: 'asc' } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    budgetLines = bands.map((b) => ({
      name: b.band.name,
      path: `/curated-packs/budget/${b.band.slug}`,
      note: b.band.description,
    }));
    packOccasionLines = packOccasions.map((o) => ({
      name: o.name,
      path: `/curated-packs/occasions/${o.slug}`,
    }));
    occasionLines = occasions.map((o) => ({ name: o.name, path: `/occasion/${o.slug}` }));

    // Top-level categories, each followed by its sub-collections.
    categoryLines = categories
      .filter((c) => !c.parentId)
      .flatMap((c) => [
        { name: c.name, path: `/category/${c.slug}` },
        ...c.children.map((child) => ({
          name: `${c.name} › ${child.name}`,
          path: `/category/${child.slug}`,
        })),
      ]);
  } catch (error) {
    console.error('llms.txt: generation failed', error);
  }

  const text =
    `# GIVOO\n\n` +
    `> GIVOO (by Arts Shala, Delhi) is India's first self-serve bulk corporate gifting platform. Corporate buyers browse products, build branded gift packs, get instant transparent pricing, and place orders — all without a sales rep. Pricing includes standard branding cost; payment gateway fees are shown as a separate line item. GST is calculated per product HSN code.\n\n` +
    section('Core Offerings', [
      { name: 'Curated Packs', path: '/curated-packs', note: 'Ready-made corporate gift packs, browsable by budget or by occasion.' },
      { name: 'Build Your Pack', path: '/box', note: 'Self-serve gift builder — pick products, customize branding, and get instant pricing (Corporate MOQ 25, Party MOQ 10).' },
      { name: 'Products', path: '/catalog', note: 'Full product catalog for bulk corporate gifting, filterable by category and occasion.' },
      { name: 'All Categories', path: '/categories', note: 'Browse every product category.' },
      { name: 'Shop by Budget', path: '/curated-packs/budget', note: 'Curated packs grouped by price band.' },
      { name: 'Shop by Occasion', path: '/curated-packs/occasions', note: 'Curated packs grouped by occasion (Diwali, onboarding, client gifting, etc).' },
    ]) +
    section('Curated Packs by Budget', budgetLines) +
    section('Curated Packs by Occasion', packOccasionLines) +
    section('Products by Occasion', occasionLines) +
    section('Product Categories & Sub-collections', categoryLines) +
    section('Corporate Gifting', [
      { name: 'Contact', path: '/contact', note: 'Get in touch for corporate gifting orders, bulk quotes, and support.' },
      { name: 'FAQ', path: '/faq', note: 'Answers to common questions about ordering, pricing, and delivery.' },
      { name: 'Sell With Us', path: '/sell-with-us', note: 'Vendor onboarding information.' },
      { name: 'GST Info', path: '/gst', note: 'GST and tax compliance details for orders.' },
    ]) +
    section('Policies', [
      { name: 'Shipping Policy', path: '/shipping' },
      { name: 'Return & Refund Policy', path: '/returns' },
      { name: 'Privacy Policy', path: '/privacy' },
      { name: 'Terms & Conditions', path: '/terms' },
    ]) +
    section('Optional', [
      { name: 'Blog', path: '/blog', note: 'Articles on corporate gifting ideas and trends.' },
    ]);

  return new Response(text.trimEnd() + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
