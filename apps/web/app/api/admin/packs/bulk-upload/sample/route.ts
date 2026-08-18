import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { buildPackCsv } from '@/lib/pack-csv';

/**
 * GET /api/admin/packs/bulk-upload/sample
 * Downloads a filled-in SAMPLE sheet showing three packs across collections —
 * built from REAL SKUs in the catalogue so it imports without editing. Falls
 * back to illustrative SKUs when the catalogue is empty.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [products, collections] = await Promise.all([
      prisma.product.findMany({
        where: { isPack: false, status: 'active' },
        select: { sku: true },
        orderBy: { createdAt: 'desc' },
        take: 9,
      }),
      prisma.giftCollection.findMany({ select: { name: true }, orderBy: { sortOrder: 'asc' }, take: 2 }),
    ]);

    const skus = products.map((p) => p.sku);
    const fallback = ['DRIN-Insula-4', 'NOTE-A5-1', 'PEN-Metal-2', 'BAG-Tote-3', 'TECH-Hub-1', 'MUG-Cera-2'];
    const pick = (i: number, n: number) =>
      Array.from({ length: n }, (_, k) => skus[(i + k) % (skus.length || 1)] || fallback[(i + k) % fallback.length]);

    const colA = collections[0]?.name || 'Onboarding Kits';
    const colB = collections[1]?.name || 'Festive Hampers';

    const rows: Record<string, string>[] = [
      {
        name: 'Welcome Kit — Starter',
        collection: colA,
        status: 'active', isFeatured: 'yes', sortOrder: '1',
        products: pick(0, 2).join(', '),
        category: 'Gift Packs',
        occasions: 'Onboarding',
        tags: 'welcome, onboarding',
        recipientTags: 'New joiners',
        descriptionShort: 'The two essentials every new joiner gets on day one.',
        descriptionLong: 'A lean welcome bundle — the daily-carry essentials, branded and boxed together.',
        keyFeatures: 'Ships as one branded box; Fully customisable in the builder',
        shippingDelivery: 'Dispatched in 10-12 working days after artwork approval.',
      },
      {
        name: 'Welcome Kit — Pro',
        collection: colA,
        status: 'active', isFeatured: 'no', sortOrder: '2',
        // "x2" after a SKU sets that member's quantity inside the pack.
        products: `${pick(0, 1)[0]} x2, ${pick(1, 3).join(', ')}`,
        category: 'Gift Packs',
        occasions: 'Onboarding',
        tags: 'welcome, onboarding, premium',
        recipientTags: 'New joiners, Managers',
        descriptionShort: 'The full onboarding bundle for senior hires.',
        descriptionLong: 'Everything in the Starter kit plus a second bottle and two premium extras.',
        keyFeatures: 'Four branded items; Premium rigid box; Bulk pricing from 25 packs',
        shippingDelivery: 'Dispatched in 10-12 working days after artwork approval.',
      },
      {
        name: 'Festive Hamper — Classic',
        collection: colB,
        status: 'active', isFeatured: 'yes', sortOrder: '1',
        products: pick(3, 3).join(', '),
        category: 'Gift Packs',
        occasions: 'Diwali, Festive',
        tags: 'festive, diwali',
        recipientTags: 'Clients, All staff',
        descriptionShort: 'A three-piece festive hamper ready for Diwali dispatch.',
        descriptionLong: 'A classic festive assortment presented in a branded hamper box.',
        keyFeatures: 'Three curated items; Festive packaging; Personalised gift note',
        shippingDelivery: 'Order by 15 days before the festival for guaranteed dispatch.',
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
