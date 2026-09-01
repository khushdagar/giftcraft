import { renderToBuffer } from '@react-pdf/renderer';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { stripHtml } from '@/lib/strip-html';
import { isHiddenCategory } from '@/lib/catalog-visibility';
import {
  CataloguePDF,
  type CatalogueDoc,
  type CatalogueDocProduct,
  type CatalogueDocSection,
} from '@/components/catalogue/catalogue-pdf';
import { displayPrice, formatCataloguePrice, paginate, type PriceModeKey } from '@/lib/catalogue';

/**
 * Catalogue resolver + PDF renderer (server only).
 *
 * `resolveSections` turns the admin's section definitions into concrete
 * product lists. It is used by BOTH the builder's live preview and the PDF
 * route, so what the admin sees in the preview is exactly what prints.
 */

// ── Product projection ─────────────────────────────────────────────────────

const productSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  brand: true,
  status: true,
  descriptionShort: true,
  keyFeatures: true,
  material: true,
  moq: true,
  printingTechnique: true,
  isEcoCertified: true,
  sortOrder: true,
  viewCount: true,
  images: {
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    take: 1,
    select: { url: true },
  },
  priceTiers: { select: { tier: true, sellPrice: true } },
  // Colour variants → the "Colors:" swatch dots on the card.
  variants: {
    where: { kind: { in: ['color', 'colour'] }, hexColor: { not: null } },
    orderBy: { sortOrder: 'asc' },
    select: { hexColor: true },
  },
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

const BRANDING_LABELS: Record<string, string> = {
  screen_print: 'Screen print',
  uv_print: 'UV print',
  embroidery: 'Embroidery',
  laser_engraving: 'Laser engraving',
  digital_print: 'Digital print',
  emboss: 'Embossing',
  none: '',
};

/** Hard ceiling per section so one runaway category can't balloon the PDF. */
const MAX_PER_SECTION = 200;

export interface SectionSpec {
  title: string;
  mode: 'category' | 'manual';
  categoryId?: string | null;
  includeChildren?: boolean;
  maxProducts?: number | null;
  items: { productId: string; badge?: string | null }[];
}

export interface ResolvedProduct extends CatalogueDocProduct {
  slug: string;
  imageUrl: string | null;
  priceAmount: number | null;
}

export interface ResolvedSection {
  title: string;
  mode: 'category' | 'manual';
  products: ResolvedProduct[];
}

/** Public site origin used for the links printed in the PDF. */
const LINK_BASE = (process.env.NEXT_PUBLIC_APP_URL || 'https://givoo.in').replace(/\/+$/, '');

/** keyFeatures is Tiptap HTML authored as a bullet list — split it back up. */
function htmlToBullets(html: string | null | undefined): string[] {
  if (!html) return [];
  return html
    .replace(/<\/(li|p|div|h\d)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((line) => stripHtml(line).replace(/^[•\-–*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 6);
}

function toResolvedProduct(
  row: ProductRow,
  priceMode: PriceModeKey,
  badge: string | null
): ResolvedProduct {
  const price = displayPrice(
    row.priceTiers.map((t) => ({ tier: t.tier, sellPrice: Number(t.sellPrice) })),
    priceMode
  );
  // Only the branding method is printed as a pill (material strings from the
  // product master are far too long for one).
  const chips = [BRANDING_LABELS[row.printingTechnique] || null].filter(
    (c): c is string => !!c && c.trim().length > 0
  );

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand ?? null,
    sku: row.sku,
    imageUrl: row.images[0]?.url ?? null,
    // "Add to cart" drops the product straight into the gift builder, which
    // already accepts ?product=<id> (see components/builder/builder-content).
    builderUrl: `${LINK_BASE}/builder?product=${encodeURIComponent(row.id)}`,
    productUrl: `${LINK_BASE}/products/${encodeURIComponent(row.slug)}`,
    imageData: null,
    imageBg: null,
    priceAmount: price?.amount ?? null,
    price: price ? formatCataloguePrice(price.amount) : null,
    pricePrefix: price?.prefix ?? '',
    moq: row.moq,
    description: row.descriptionShort ? stripHtml(row.descriptionShort).trim() || null : null,
    features: htmlToBullets(row.keyFeatures),
    chips,
    colors: row.variants
      .map((v) => (v.hexColor || '').trim())
      .filter((h) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)),
    badge: badge?.trim() || null,
  };
}

// ── Resolver ───────────────────────────────────────────────────────────────

export async function resolveSections(
  specs: SectionSpec[],
  opts: { priceMode: PriceModeKey }
): Promise<ResolvedSection[]> {
  const out: ResolvedSection[] = [];

  for (const spec of specs) {
    let products: ResolvedProduct[] = [];

    if (spec.mode === 'category' && spec.categoryId) {
      const ids = [spec.categoryId];
      if (spec.includeChildren !== false) {
        const children = await prisma.category.findMany({
          where: { parentId: spec.categoryId },
          select: { id: true },
        });
        ids.push(...children.map((c) => c.id));
      }
      const rows = await prisma.product.findMany({
        where: {
          isPack: false,
          status: 'active',
          categories: { some: { categoryId: { in: ids } } },
        },
        select: productSelect,
        // Deterministic tie-break order; the real order is set below.
        orderBy: [{ sortOrder: 'asc' }, { viewCount: 'desc' }, { name: 'asc' }],
        take: MAX_PER_SECTION,
      });
      // Category sections print cheapest first (unpriced products last). Sort
      // before applying the admin's cap so the cap keeps the cheapest ones.
      products = rows
        .map((r) => toResolvedProduct(r, opts.priceMode, null))
        .sort((a, b) => (a.priceAmount ?? Infinity) - (b.priceAmount ?? Infinity))
        .slice(0, spec.maxProducts ?? MAX_PER_SECTION);
    } else if (spec.mode === 'manual' && spec.items.length > 0) {
      const ids = spec.items.map((i) => i.productId);
      const rows = await prisma.product.findMany({
        // Hand-picked products stay in unless archived — an admin may want a
        // draft product in a "coming soon" catalogue.
        where: { id: { in: ids }, status: { not: 'archived' } },
        select: productSelect,
      });
      const byId = new Map(rows.map((r) => [r.id, r]));
      products = spec.items
        .map((item) => {
          const row = byId.get(item.productId);
          return row ? toResolvedProduct(row, opts.priceMode, item.badge ?? null) : null;
        })
        .filter((p): p is ResolvedProduct => p !== null);
    }

    out.push({ title: spec.title, mode: spec.mode, products });
  }

  return out;
}

// ── Loading ────────────────────────────────────────────────────────────────

const catalogueInclude = {
  sections: {
    orderBy: { sortOrder: 'asc' },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  },
} satisfies Prisma.CatalogueInclude;

export type LoadedCatalogue = Prisma.CatalogueGetPayload<{ include: typeof catalogueInclude }>;

export async function loadCatalogue(where: { id: string }): Promise<LoadedCatalogue | null> {
  return prisma.catalogue.findUnique({ where, include: catalogueInclude });
}

export function toSectionSpecs(catalogue: LoadedCatalogue): SectionSpec[] {
  return catalogue.sections.map((s) => ({
    title: s.title,
    mode: s.mode,
    categoryId: s.categoryId,
    includeChildren: s.includeChildren,
    maxProducts: s.maxProducts,
    items: s.items.map((i) => ({ productId: i.productId, badge: i.badge })),
  }));
}

// ── Images ─────────────────────────────────────────────────────────────────

/**
 * Download + shrink one image to a data URI. A catalogue can hold 100+
 * products, so — unlike the proposal deck — EVERY image goes through sharp and
 * is capped in size, keeping the render well inside the 1 GB container.
 * Failures degrade to null (the card prints a placeholder).
 *
 * Product cut-outs are usually transparent PNG/webp: they become PNG with the
 * transparency kept, so nothing sits behind the product on the card. The cover
 * is a photo and can be large, so it gets a bigger size budget and timeout.
 */
interface LoadedImage {
  /** data: URI for react-pdf. */
  data: string;
  /**
   * The photo's backdrop colour — the median of its border pixels — or null
   * when the border is (mostly) transparent, i.e. a real cut-out. Painted
   * behind the card's photo column so the picture reads edge to edge.
   */
  edge: string | null;
}

/** Median colour of the border ring of raw RGBA pixels, or null for cut-outs. */
function edgeColour(px: Buffer, width: number, height: number): string | null {
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  let clear = 0;
  const take = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    if (px[i + 3]! < 250) clear++;
    r.push(px[i]!);
    g.push(px[i + 1]!);
    b.push(px[i + 2]!);
  };
  for (let x = 0; x < width; x++) {
    take(x, 0);
    if (height > 1) take(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    take(0, y);
    if (width > 1) take(width - 1, y);
  }
  if (r.length === 0 || clear > r.length * 0.1) return null;
  const med = (v: number[]) => v.sort((a, c) => a - c)[Math.floor(v.length / 2)]!;
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(med(r))}${hex(med(g))}${hex(med(b))}`;
}

async function toCatalogueImage(
  url: string,
  opts: { maxPx: number; timeoutMs: number; photo: boolean } = {
    maxPx: 640,
    timeoutMs: 8000,
    photo: false,
  }
): Promise<LoadedImage | null> {
  const raw = url.startsWith('http')
    ? url
    : `${process.env.NEXT_PUBLIC_APP_URL || ''}${url.startsWith('/') ? '' : '/'}${url}`;
  // Media-library URLs can carry spaces from the original filename.
  const absolute = raw.replace(/ /g, '%20');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    const res = await fetch(absolute, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || '').split(';')[0]!.toLowerCase();
    if (!type.startsWith('image/')) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;

    try {
      const sharp = (await import('sharp')).default;
      const base = sharp(buffer).resize(opts.maxPx, opts.maxPx, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      if (opts.photo) {
        const jpeg = await base.flatten({ background: '#FFFFFF' }).jpeg({ quality: 84 }).toBuffer();
        return { data: `data:image/jpeg;base64,${jpeg.toString('base64')}`, edge: null };
      }
      const { data: px, info } = await base
        .clone()
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const png = await base.png({ compressionLevel: 8, palette: true }).toBuffer();
      return {
        data: `data:image/png;base64,${png.toString('base64')}`,
        edge: edgeColour(px, info.width, info.height),
      };
    } catch {
      // No sharp: react-pdf can still decode JPEG/PNG as-is.
      return /^image\/(jpeg|jpg|png)$/.test(type)
        ? { data: `data:${type};base64,${buffer.toString('base64')}`, edge: null }
        : null;
    }
  } catch {
    return null;
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    })
  );
  return out;
}

// ── Render ─────────────────────────────────────────────────────────────────

/** The document-level settings the renderer needs, independent of storage. */
export interface RenderSettings {
  title: string;
  closingNote: string | null;
  coverImageUrl: string | null;
  closingImageUrl: string | null;
  theme: LoadedCatalogue['theme'];
  priceMode: PriceModeKey;
  showSku: boolean;
  showMoq: boolean;
  /** Product image size budget (px). The complete catalogue uses a smaller one. */
  imageMaxPx?: number;
}

/** Turns resolved sections into the finished PDF (shared by both catalogue kinds). */
async function renderResolved(settings: RenderSettings, resolved: ResolvedSection[]): Promise<Buffer> {
  const sections = resolved.filter((s) => s.products.length > 0);
  const totalProducts = sections.reduce((n, s) => n + s.products.length, 0);
  if (totalProducts === 0) throw new Error('NO_PRODUCTS');

  // Download each distinct product image once, four at a time. The cover is
  // fetched separately with a photo budget (bigger, longer timeout); if it
  // fails the cover simply prints without a photo.
  const urls = new Set<string>();
  for (const s of sections) for (const p of s.products) if (p.imageUrl) urls.add(p.imageUrl);
  const list = [...urls];
  const photo = { maxPx: 1400, timeoutMs: 20000, photo: true } as const;

  // The thank-you page photo: the catalogue's own, else the homepage hero.
  const closingImageUrl =
    settings.closingImageUrl ||
    (
      await prisma.homepageBanner.findFirst({
        where: { isActive: true, imageUrl: { not: null } },
        orderBy: { sortOrder: 'asc' },
        select: { imageUrl: true },
      })
    )?.imageUrl ||
    null;

  const [data, coverImage, closingImage] = await Promise.all([
    mapLimit(list, 4, (u) =>
      toCatalogueImage(u, {
        maxPx: settings.imageMaxPx ?? 640,
        timeoutMs: 8000,
        photo: false,
      })
    ),
    settings.coverImageUrl ? toCatalogueImage(settings.coverImageUrl, photo) : Promise.resolve(null),
    closingImageUrl ? toCatalogueImage(closingImageUrl, photo) : Promise.resolve(null),
  ]);
  const coverImageData = coverImage?.data ?? null;
  const closingImageData = closingImage?.data ?? null;
  const imageByUrl = new Map(list.map((u, i) => [u, data[i] ?? null]));
  if (settings.coverImageUrl && !coverImageData) {
    console.warn(`Catalogue "${settings.title}": cover image could not be loaded (${settings.coverImageUrl})`);
  }

  const { starts } = paginate(sections.map((s) => ({ count: s.products.length })));

  const docSections: CatalogueDocSection[] = sections.map((s, i) => ({
    title: s.title,
    startPage: starts[i]!,
    products: s.products.map((p) => {
      const img = p.imageUrl ? (imageByUrl.get(p.imageUrl) ?? null) : null;
      return { ...p, imageData: img?.data ?? null, imageBg: img?.edge ?? null };
    }),
  }));

  const doc: CatalogueDoc = {
    title: settings.title,
    closingNote: settings.closingNote,
    coverImageData,
    closingImageData,
    theme: settings.theme,
    monthLabel: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    showSku: settings.showSku,
    showMoq: settings.showMoq,
    pricesShown: settings.priceMode !== 'hidden',
    totalProducts,
    sections: docSections,
  };

  return renderToBuffer(<CataloguePDF doc={doc} />);
}

/** A built catalogue (the admin's sections and settings). */
export async function renderCataloguePdf(catalogue: LoadedCatalogue): Promise<Buffer> {
  const resolved = await resolveSections(toSectionSpecs(catalogue), {
    priceMode: catalogue.priceMode,
  });
  return renderResolved(
    {
      title: catalogue.title,
      closingNote: catalogue.closingNote,
      coverImageUrl: catalogue.coverImageUrl,
      closingImageUrl: catalogue.closingImageUrl,
      theme: catalogue.theme,
      priceMode: catalogue.priceMode,
      showSku: catalogue.showSku,
      showMoq: catalogue.showMoq,
    },
    resolved
  );
}

/** A category needs this many active products to earn a section in the complete catalogue. */
export const COMPLETE_MIN_PRODUCTS = 3;

/**
 * The whole range in one PDF: every top-level category (sub-categories folded
 * in) that has at least COMPLETE_MIN_PRODUCTS active products, in storefront
 * order. Packaging / add-on categories back the builder, not the catalogue,
 * so they are skipped. Nothing is stored — it is always live.
 */
export async function renderCompleteCataloguePdf(): Promise<Buffer> {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true },
  });
  const specs: SectionSpec[] = categories
    .filter((c) => !isHiddenCategory(c))
    .map((c) => ({
      title: c.name,
      mode: 'category' as const,
      categoryId: c.id,
      includeChildren: true,
      maxProducts: null,
      items: [],
    }));
  const resolved = await resolveSections(specs, { priceMode: 'starting' });
  const sections = resolved.filter((s) => s.products.length >= COMPLETE_MIN_PRODUCTS);
  if (sections.length === 0) throw new Error('NO_PRODUCTS');

  return renderResolved(
    {
      title: 'Complete Catalogue',
      closingNote: null,
      coverImageUrl: null,
      closingImageUrl: null,
      theme: 'mono',
      priceMode: 'starting',
      showSku: false,
      showMoq: true,
      // Hundreds of products can print here; a smaller image budget keeps the
      // render comfortably inside the 1 GB container.
      imageMaxPx: 480,
    },
    sections
  );
}
