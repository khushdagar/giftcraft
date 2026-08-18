import Link from 'next/link';
import { getCuratedPackEntries } from '@/lib/curated-pack-entries';

// Two ways into the curated packs — budget and occasion. These mirror the
// /curated-packs hub exactly, so the homepage and the nav tell the same story.
// Cover image and blurb come from /admin/settings/curated-packs.
export async function CuratedCollections() {
  const entries = await getCuratedPackEntries();

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container">
        <h2 className="text-4xl md:text-5xl text-center mb-2 font-serif font-normal">
          Curated <span className="italic text-[#800020]">packs.</span>
        </h2>
        <p className="text-center text-[#5C5852] text-sm mb-12">
          Hand-picked gifts for every budget and occasion.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {entries.map((entry) => (
            <Link
              key={entry.slug}
              href={`/curated-packs/${entry.slug}`}
              className="rounded-3xl p-4 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative h-52 md:h-[400px] flex flex-col justify-end"
              style={entry.image ? undefined : { background: entry.gradient }}
            >
              {entry.image && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.image}
                    alt={entry.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* Scrim so the white copy stays readable over any photo. */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </>
              )}
              <div className="relative z-10">
                <h3 className="text-2xl md:text-3xl text-white mb-2 font-normal leading-snug font-serif">
                  {entry.name}
                </h3>
                <p className="text-white/80 text-xs md:text-sm mb-4">{entry.description}</p>
                <span className="text-white text-sm font-medium">Browse →</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Every pack, filterable — full-width on mobile, centred pill above. */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/curated-packs"
            className="flex w-full sm:w-auto items-center justify-center rounded-full border border-[#800020] px-8 py-2.5 text-sm font-semibold text-[#800020] transition hover:bg-[#800020] hover:text-white"
          >
            See All →
          </Link>
        </div>
      </div>
    </section>
  );
}
