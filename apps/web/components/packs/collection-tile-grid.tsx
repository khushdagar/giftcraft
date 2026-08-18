import Link from 'next/link';

// Used for a tile when no cover image is set in the admin.
export const FALLBACK_GRADIENTS = [
  'linear-gradient(145deg, #D7AC55 0%, #9A6E2E 55%, #6F4D1E 100%)',
  'linear-gradient(145deg, #34332F 0%, #222222 55%, #0C0C0B 100%)',
  'linear-gradient(145deg, #3FA978 0%, #1F8A5C 45%, #134E36 100%)',
  'linear-gradient(145deg, #4A90D9 0%, #2D5A9E 55%, #1A3C6E 100%)',
];

export interface CollectionTile {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  gradient: string | null;
  /** Where the tile links — the caller builds it, since the depth differs. */
  href: string;
  /** Present on sub-collection tiles; absent on the top-level hub. */
  childCount?: number;
  /** Small line under the title — "12 packs", a price range, a nudge. */
  caption?: string | null;
  /** Overrides the button label when neither "Collections" nor "Packs" fits. */
  cta?: string;
}

// One grid of collection tiles. Shared by the top-level hub, the
// sub-collection level, and PacksBrowser's own level 1, so all three read as
// the same component to a customer walking down the tree.
export function CollectionTileGrid({ tiles }: { tiles: CollectionTile[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tiles.map((c, idx) => (
        // Each collection has its own crawlable page.
        <Link
          key={c.id}
          href={c.href}
          className="relative overflow-hidden rounded-md min-h-64 group text-left transition transform hover:-translate-y-1"
        >
          {c.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.image}
              alt={c.name}
              className="absolute inset-0 h-full w-full object-cover transition transform group-hover:scale-105"
            />
          ) : (
            <div
              className="absolute inset-0 transition transform group-hover:scale-105"
              style={{
                background: c.gradient || FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length],
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <h2 className="font-serif text-xl text-white mb-2 leading-tight">{c.name}</h2>
            {c.caption && <p className="text-[13px] text-white/80 leading-snug">{c.caption}</p>}
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-white rounded-full text-em text-sm font-medium group-hover:bg-em/90 transition group-hover:text-white">
              {/* A tile with children opens another tile level, not the packs —
                  the label says which, so the click is never a surprise. */}
              {c.cta ?? (c.childCount ? 'Browse Collections →' : 'Browse Packs →')}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
