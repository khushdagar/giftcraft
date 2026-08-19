import { NextResponse } from 'next/server';
import { getPacks, getPackOccasionTiles } from '@/lib/pack-data';

// Cached for an hour — changes only when packs or occasions do.
export const revalidate = 3600;

/**
 * GET /api/pack-occasions
 * Occasions that actually hold curated packs, in the homepage tile shape.
 * Distinct from /api/occasions, which lists occasions with *products* — a tile
 * built from that list can land on an empty "No curated packs yet" page.
 */
export async function GET() {
  try {
    const tiles = await getPackOccasionTiles(await getPacks());
    return NextResponse.json(
      tiles.map((o) => ({
        name: o.name,
        slug: o.slug,
        image: o.image,
        bg: o.gradient || 'linear-gradient(135deg, #800020 0%, #3D000F 100%)',
        packCount: o.count,
      }))
    );
  } catch (error) {
    console.error('Error fetching pack occasions:', error);
    return NextResponse.json([], { status: 200 });
  }
}
