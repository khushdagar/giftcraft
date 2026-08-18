import { NextResponse } from 'next/server';
import { getPacks, getBudgetTiles, getPackOccasionTiles } from '@/lib/pack-data';

// Cached for an hour — the nav tree changes only when packs or occasions do.
export const revalidate = 3600;

/**
 * GET /api/pack-nav
 * The Curated Packs mega-menu, in the exact shape the navbar cascades over:
 * two entries ("By Budget", "By Occasion"), each with the rungs beneath it.
 * Individual packs are deliberately left out — the menu hands you to a listing
 * page rather than trying to be a catalogue. Slugs line up with
 * /curated-packs/<entry>/<rung>.
 */
export async function GET() {
  try {
    const packs = await getPacks();
    const bands = await getBudgetTiles(packs);
    const occasions = await getPackOccasionTiles(packs);

    const tree = [
      {
        name: 'By Budget',
        slug: 'budget',
        children: bands.map((b) => ({ name: b.band.name, slug: b.band.slug })),
      },
      {
        name: 'By Occasion',
        slug: 'occasions',
        children: occasions.map((o) => ({ name: o.name, slug: o.slug })),
      },
      // An entry with no rungs at all would be a dead end in the menu.
    ].filter((entry) => entry.children.length > 0);

    return NextResponse.json(tree);
  } catch (error) {
    console.error('Error building pack nav:', error);
    return NextResponse.json([], { status: 200 });
  }
}
