import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { buildPackCsv } from '@/lib/pack-csv';

/**
 * GET /api/admin/packs/bulk-upload/sample
 * Downloads a filled-in SAMPLE sheet of four packs, built from REAL SKUs and
 * REAL occasion names in the catalogue so it imports without editing. Falls
 * back to illustrative values when the catalogue is empty.
 *
 * Each row carries the occasion it should surface under; its budget band is
 * derived from the members' prices, so there is nothing to fill in for that.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [products, occasionRows] = await Promise.all([
      prisma.product.findMany({
        where: { isPack: false, status: 'active' },
        select: { sku: true },
        orderBy: { createdAt: 'desc' },
        take: 9,
      }),
      // `isCollection` entries are the homepage's curated tiles, not occasions.
      prisma.occasionConfig.findMany({
        where: { isActive: true, isCollection: false },
        select: { name: true },
        orderBy: { sortOrder: 'asc' },
        take: 3,
      }),
    ]);

    const skus = products.map((p) => p.sku);
    const fallback = ['DRIN-Insula-4', 'NOTE-A5-1', 'PEN-Metal-2', 'BAG-Tote-3', 'TECH-Hub-1', 'MUG-Cera-2'];
    const pick = (i: number, n: number) =>
      Array.from({ length: n }, (_, k) => skus[(i + k) % (skus.length || 1)] || fallback[(i + k) % fallback.length]);

    const occA = occasionRows[0]?.name || 'Onboarding';
    const occB = occasionRows[1]?.name || 'Diwali';
    const occC = occasionRows[2]?.name || 'Festive';
    // Deduped: the catalogue's first three occasions can collide with the
    // literal fallbacks, and a cell reading 'Festive, Festive' teaches nothing.
    const multiOccasion = Array.from(new Set([occB, occC])).join(', ');

    const rows: Record<string, string>[] = [
      {
        name: 'Welcome Kit — Starter',
        status: 'active', isFeatured: 'yes', sortOrder: '1',
        products: pick(0, 2).join(', '),
        category: 'Gift Packs',
        // An occasion that doesn't exist yet is created from this cell.
        occasions: occA,
        tags: 'welcome, onboarding',
        recipientTags: 'New joiners',
        descriptionShort: 'The two essentials every new joiner gets on day one.',
        descriptionLong: 'A lean welcome bundle — the daily-carry essentials, branded and boxed together.',
        keyFeatures: 'Ships as one branded box; Fully customisable in the builder',
        shippingDelivery: 'Dispatched in 10-12 working days after artwork approval.',
        metaTitle: 'Welcome Kit — Starter | Employee Onboarding Gifts',
        metaDescription:
          'A two-piece branded welcome kit for new joiners. Bulk pricing from 25 packs, custom logo printing, pan-India delivery.',
      },
      {
        name: 'Welcome Kit — Pro',
        status: 'active', isFeatured: 'no', sortOrder: '2',
        // "x2" after a SKU sets that member's quantity inside the pack.
        products: `${pick(0, 1)[0]} x2, ${pick(1, 3).join(', ')}`,
        category: 'Gift Packs',
        occasions: occA,
        tags: 'welcome, onboarding, premium',
        recipientTags: 'New joiners, Managers',
        descriptionShort: 'The full onboarding bundle for senior hires.',
        descriptionLong: 'Everything in the Starter kit plus a second bottle and two premium extras.',
        keyFeatures: 'Four branded items; Premium rigid box; Bulk pricing from 25 packs',
        shippingDelivery: 'Dispatched in 10-12 working days after artwork approval.',
        metaTitle: 'Welcome Kit — Pro | Premium Onboarding Gift Box',
        metaDescription:
          'A four-piece premium onboarding kit for senior hires, presented in a rigid branded box. Bulk pricing from 25 packs.',
      },
      {
        name: 'Festive Hamper — Classic',
        status: 'active', isFeatured: 'yes', sortOrder: '1',
        products: pick(3, 3).join(', '),
        category: 'Gift Packs',
        // Several occasions, comma-separated — the pack appears under each.
        occasions: multiOccasion,
        tags: 'festive, diwali',
        recipientTags: 'Clients, All staff',
        descriptionShort: 'A three-piece festive hamper ready for dispatch.',
        descriptionLong: 'A classic festive assortment presented in a branded hamper box.',
        keyFeatures: 'Three curated items; Festive packaging; Personalised gift note',
        shippingDelivery: 'Order by 15 days before the festival for guaranteed dispatch.',
        metaTitle: 'Festive Hamper — Classic | Corporate Diwali Gifts',
        metaDescription:
          'A three-piece festive hamper for clients and staff, in branded packaging with a personalised gift note. Bulk Diwali dispatch.',
      },
      {
        name: 'Festive Hamper — New Year',
        status: 'active', isFeatured: 'no', sortOrder: '2',
        products: pick(5, 2).join(', '),
        category: 'Gift Packs',
        occasions: 'New Year',
        tags: 'festive, new-year',
        recipientTags: 'Clients',
        descriptionShort: 'A two-piece desk refresh to open the new year with.',
        descriptionLong: 'A compact new-year gift pairing, branded and boxed for client dispatch.',
        keyFeatures: 'Two curated items; Branded gift box; Personalised gift note',
        shippingDelivery: 'Dispatched in 10-12 working days after artwork approval.',
        metaTitle: 'Festive Hamper — New Year | Corporate New Year Gifts',
        metaDescription:
          'A two-piece new-year gift pack for clients, branded and boxed with a personalised note. Bulk pricing and pan-India delivery.',
      },
    ];

    const csv = buildPackCsv(rows);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="givoo-packs-sample.csv"',
      },
    });
  } catch (error) {
    console.error('Error generating pack sample sheet:', error);
    return NextResponse.json({ error: 'Failed to generate sample' }, { status: 500 });
  }
}
