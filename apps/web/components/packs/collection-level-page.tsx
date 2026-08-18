import Link from 'next/link';
import { CollectionTileGrid, type CollectionTile } from '@/components/packs/collection-tile-grid';

// The middle rung of the curated-packs tree: a collection that holds
// sub-collections rather than packs. Same shell as PacksBrowser (parchment
// background, serif heading, breadcrumb) so walking down the levels feels
// like one continuous page.
export function CollectionLevelPage({
  title,
  description,
  breadcrumb,
  tiles,
  backHref,
  backLabel,
}: {
  title: string;
  description: string | null;
  /** Trail between "Home" and the current title. */
  breadcrumb: { name: string; href: string }[];
  tiles: CollectionTile[];
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="min-h-screen" style={{ background: '#F5F1EB' }}>
      {/* Header */}
      <div className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <p className="text-xs" style={{ color: '#8F8A82' }}>
            <Link href="/" style={{ color: '#800020' }}>
              Home
            </Link>{' '}
            {breadcrumb.map((b) => (
              <span key={b.href}>
                /{' '}
                <Link href={b.href} style={{ color: '#800020' }}>
                  {b.name}
                </Link>{' '}
              </span>
            ))}
            / <span>{title}</span>
          </p>
          <h1 className="text-4xl md:text-5xl font-serif font-light mt-2">{title}</h1>
          {description && (
            <p className="mt-2 text-base max-w-2xl" style={{ color: '#5C5852' }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-10 pb-20">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 transition hover:opacity-80"
          style={{ color: '#800020' }}
        >
          ← {backLabel}
        </Link>

        {tiles.length === 0 ? (
          <div className="text-center py-20 rounded-md border-2 border-dashed border-bdr bg-white">
            <p className="text-lg text-ink">Nothing here yet</p>
            <p className="mt-1 text-sm text-ink-2">
              Check back soon — or{' '}
              <Link href="/builder" className="text-em font-medium">
                build your own from scratch →
              </Link>
            </p>
          </div>
        ) : (
          <CollectionTileGrid tiles={tiles} />
        )}
      </div>
    </div>
  );
}
