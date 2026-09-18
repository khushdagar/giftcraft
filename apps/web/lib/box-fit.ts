import { prisma } from '@/lib/prisma';
import { BOX_SIZES, packagingSizeForCount, type BoxSize } from '@/lib/packaging-designs';

/**
 * Which box size a pack needs, and which products cannot go in a box at all.
 *
 * The ONE place this is decided — the proposal builder (size + price) and the
 * AI pack image (what is drawn inside the box) both read it, so they can never
 * disagree.
 *
 * Every Packaging product carries inner dimensions per size (Size variant →
 * L × W × H, cm). A product fits a size when each of its sides fits the box in
 * some orientation; a set of products fits when, on top of that, their combined
 * volume stays inside the usable share of the box — filler, gaps and awkward
 * shapes mean a box is never packed solid.
 *
 * The size starts from the product count (1–2 Small · 3–4 Medium · 5+ Large)
 * and moves up one size at a time until everything fits. Products that fit no
 * size of this box ship beside it and are left out.
 *
 * Boxes without dimensions keep the count-based size and a fixed longest-side
 * limit. Products without dimensions are judged by category alone.
 */

const USABLE_VOLUME_SHARE = 0.75;
const FALLBACK_LONGEST_SIDE_CM = 40;
const NEVER_BOXED_CATEGORY_SLUGS = ['trolley-cabin-bag', 'toiletry-dopp-kit'];

type Dims = [number, number, number];

interface Sized {
  dimensionL: number | null;
  dimensionW: number | null;
  dimensionH: number | null;
}

const dimsOf = (o: Sized): Dims | null =>
  o.dimensionL && o.dimensionW && o.dimensionH ? [o.dimensionL, o.dimensionW, o.dimensionH] : null;
const sortedDesc = (d: Dims) => [...d].sort((a, b) => b - a);
const volume = (d: Dims) => d[0] * d[1] * d[2];

/** Largest side against largest side, and so on — any upright or flat rotation. */
const sidesFit = (product: Dims, box: Dims) => {
  const b = sortedDesc(box);
  return sortedDesc(product).every((side, i) => side <= b[i]!);
};

export interface BoxFit {
  /** Inner size of that box size in cm (L, W, H) — null when the box has no dimensions. */
  boxInner: [number, number, number] | null;
  /** The size the pack needs. */
  size: BoxSize;
  /** Products that go in the box, in pick order. */
  insideIds: string[];
  /** Products that do not go in the box — they ship separately. */
  outside: { id: string; name: string }[];
}

export async function resolveBoxFit(
  productIds: string[],
  boxId: string | null,
  /** Uploaded mockup items — they count towards the size but have no dimensions. */
  extraItemCount = 0
): Promise<BoxFit> {
  const startSize = packagingSizeForCount(productIds.length + extraItemCount);
  if (!boxId || productIds.length === 0) {
    return { size: startSize, boxInner: null, insideIds: productIds, outside: [] };
  }

  const [rows, box] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        dimensionL: true,
        dimensionW: true,
        dimensionH: true,
        categories: { select: { category: { select: { slug: true } } } },
      },
    }),
    prisma.product.findUnique({
      where: { id: boxId },
      select: {
        variants: {
          where: { kind: 'size' },
          select: { value: true, dimensionL: true, dimensionW: true, dimensionH: true },
        },
      },
    }),
  ]);
  const byId = new Map(rows.map((p) => [p.id, p]));
  const products = productIds.map((id) => byId.get(id)).filter((p) => !!p);

  const neverBoxed = (p: (typeof products)[number]) =>
    p.categories.some((c) => NEVER_BOXED_CATEGORY_SLUGS.includes(c.category.slug));

  // This box's sizes that have dimensions, smallest first.
  const sizes = BOX_SIZES.map((size) => {
    const v = box?.variants.find((x) => x.value.trim().toLowerCase() === size.toLowerCase());
    const dims = v ? dimsOf(v) : null;
    return dims ? { size, dims } : null;
  }).filter((s) => !!s);

  const result = (size: BoxSize, outside: typeof products, boxInner: Dims | null = null): BoxFit => ({
    boxInner,
    size,
    insideIds: products.filter((p) => !outside.includes(p)).map((p) => p.id),
    outside: outside.map((p) => ({ id: p.id, name: p.name })),
  });

  // No dimensions on this box — count-based size, fixed limit.
  if (sizes.length === 0) {
    return result(
      startSize,
      products.filter((p) => {
        const d = dimsOf(p);
        return neverBoxed(p) || (d ? Math.max(...d) > FALLBACK_LONGEST_SIDE_CM : false);
      })
    );
  }

  // Products that fit not even the biggest size never go in this box.
  const biggest = sizes[sizes.length - 1]!;
  const tooBig = products.filter((p) => {
    const d = dimsOf(p);
    return d ? !sidesFit(d, biggest.dims) : neverBoxed(p);
  });
  const boxable = products.filter((p) => !tooBig.includes(p));
  const boxableVolume = boxable.reduce((sum, p) => {
    const d = dimsOf(p);
    return sum + (d ? volume(d) : 0);
  }, 0);

  // Smallest size, from the count-based one upward, that takes all of them.
  const found = sizes.findIndex((s) => BOX_SIZES.indexOf(s.size) >= BOX_SIZES.indexOf(startSize));
  for (const s of sizes.slice(found === -1 ? sizes.length - 1 : found)) {
    const allSidesFit = boxable.every((p) => {
      const d = dimsOf(p);
      return !d || sidesFit(d, s.dims);
    });
    if (allSidesFit && boxableVolume <= volume(s.dims) * USABLE_VOLUME_SHARE) return result(s.size, tooBig, s.dims);
  }

  // Even the biggest size is too full — fill it in pick order, the rest ship separately.
  let room = volume(biggest.dims) * USABLE_VOLUME_SHARE;
  const overflow = boxable.filter((p) => {
    const d = dimsOf(p);
    if (!d) return false;
    if (volume(d) > room) return true;
    room -= volume(d);
    return false;
  });
  return result(biggest.size, [...tooBig, ...overflow], biggest.dims);
}
