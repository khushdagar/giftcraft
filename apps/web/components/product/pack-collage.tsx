'use client';

/**
 * A pack has no image of its own, so its card shows a bundle preview built from
 * its member products' shots — the same 2×2 tiling the curated-packs listing
 * uses, so a pack looks the same wherever it appears.
 */
export function PackCollage({ tiles }: { tiles: string[] }) {
  const t = tiles.slice(0, 4);
  if (t.length === 0) return null;

  const spanClass = (i: number) => {
    if (t.length === 1) return 'col-span-2 row-span-2';
    if (t.length === 2) return 'col-span-1 row-span-2';
    if (t.length === 3) return i === 0 ? 'col-span-2 row-span-1' : 'col-span-1 row-span-1';
    return 'col-span-1 row-span-1';
  };

  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 bg-white">
      {t.map((src, i) => (
        <div key={i} className={`relative overflow-hidden bg-elevated ${spanClass(i)}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ))}
    </div>
  );
}
