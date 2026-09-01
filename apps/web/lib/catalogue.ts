import { z } from 'zod';

/**
 * Catalogue feature — shared, dependency-free helpers.
 *
 * Imported by BOTH the admin builder (client) and the PDF renderer (server),
 * so nothing in here may touch Prisma or Node APIs. The page maths lives here
 * so the builder's page estimate is identical to the rendered PDF.
 */

// ── Themes ─────────────────────────────────────────────────────────────────
// One pastel block colour + its ink, used on the cover and the closing page.
export const CATALOGUE_THEMES = {
  warm: { label: 'Warm', block: '#FBE3C7', ink: '#9A3412', soft: '#FFF7EE' },
  cool: { label: 'Cool', block: '#E0E7FF', ink: '#3730A3', soft: '#F4F5FF' },
  fresh: { label: 'Fresh', block: '#D1FAE5', ink: '#065F46', soft: '#F1FDF7' },
  festive: { label: 'Festive', block: '#FFE4E6', ink: '#9F1239', soft: '#FFF5F6' },
  mono: { label: 'Mono', block: '#EDEBE6', ink: '#222222', soft: '#F6F5F2' },
} as const;
export type CatalogueThemeKey = keyof typeof CATALOGUE_THEMES;
export const THEME_KEYS = Object.keys(CATALOGUE_THEMES) as CatalogueThemeKey[];

// ── Pages ──────────────────────────────────────────────────────────────────
/** The one approved layout: full-width cards, three to an A4 page. */
export const CARDS_PER_PAGE = 3;

export function pagesFor(count: number): number {
  return count === 0 ? 0 : Math.ceil(count / CARDS_PER_PAGE);
}

export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Rows of the contents page before it spills onto a second page. */
export const CONTENTS_ROWS_PER_PAGE = 11;

/**
 * Page bookkeeping shared by the builder estimate and the PDF: cover (1) +
 * contents pages (none for a single section) + every section's card pages +
 * closing page (1).
 */
export function paginate(sections: { count: number }[]) {
  const contentsPages =
    sections.length > 1 ? Math.ceil(sections.length / CONTENTS_ROWS_PER_PAGE) : 0;
  let page = 1 + contentsPages + 1; // first card page
  const starts = sections.map((s) => {
    const start = page;
    page += pagesFor(s.count);
    return start;
  });
  return { contentsPages, starts, total: page }; // `page` now = closing page number
}

// ── Prices ─────────────────────────────────────────────────────────────────
export const PRICE_MODE_OPTIONS = [
  { value: 'starting', label: 'Starting price — lowest tier, shown as "From : ₹X/-"' },
  { value: 'base', label: 'Base price — tier 1 (MOQ) sell price, shown as "MRP : ₹X/-"' },
  { value: 'hidden', label: 'Hide prices' },
] as const;
export type PriceModeKey = (typeof PRICE_MODE_OPTIONS)[number]['value'];

export interface TierLike {
  tier: number;
  sellPrice: number;
}

/** Unit price to print for a product, or null when hidden / unpriced. */
export function displayPrice(
  tiers: TierLike[],
  mode: PriceModeKey
): { amount: number; prefix: string } | null {
  if (mode === 'hidden' || tiers.length === 0) return null;
  const priced = tiers.filter((t) => Number.isFinite(t.sellPrice) && t.sellPrice > 0);
  if (priced.length === 0) return null;
  if (mode === 'base') {
    const t1 = [...priced].sort((a, b) => a.tier - b.tier)[0]!;
    return { amount: t1.sellPrice, prefix: '' };
  }
  const lowest = priced.reduce((m, t) => (t.sellPrice < m ? t.sellPrice : m), Infinity);
  return { amount: lowest, prefix: priced.length > 1 ? 'From ' : '' };
}

/** "₹1,250" — the PDF font ships the rupee glyph, so this is safe to print. */
export function formatCataloguePrice(amount: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(amount))}`;
}

// ── API validation ─────────────────────────────────────────────────────────
const nullableText = (max: number) => z.string().max(max).optional().nullable();

export const catalogueItemSchema = z.object({
  productId: z.string().min(1),
  badge: nullableText(24),
});

/** Section fields without the completeness checks — used by the live preview. */
export const catalogueSectionBaseSchema = z.object({
  title: z.string().trim().max(80).default(''),
  mode: z.enum(['category', 'manual']),
  categoryId: z.string().optional().nullable(),
  includeChildren: z.boolean().default(true),
  maxProducts: z.number().int().min(1).max(200).optional().nullable(),
  items: z.array(catalogueItemSchema).max(200).default([]),
});

export const catalogueSectionSchema = catalogueSectionBaseSchema
  .extend({ title: z.string().trim().min(1, 'Section title is required').max(80) })
  .refine((s) => s.mode !== 'category' || !!s.categoryId, {
    message: 'Pick a category for this section',
    path: ['categoryId'],
  })
  .refine((s) => s.mode !== 'manual' || s.items.length > 0, {
    message: 'Add at least one product to this section',
    path: ['items'],
  });

export const catalogueInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  slug: z.string().trim().max(140).optional().nullable(),
  closingNote: nullableText(1200),
  coverImageUrl: nullableText(2000),
  closingImageUrl: nullableText(2000),
  theme: z.enum(THEME_KEYS as [CatalogueThemeKey, ...CatalogueThemeKey[]]).default('warm'),
  priceMode: z.enum(['starting', 'base', 'hidden']).default('starting'),
  showSku: z.boolean().default(false),
  showMoq: z.boolean().default(true),
  sections: z.array(catalogueSectionSchema).min(1, 'Add at least one section').max(30),
});

export type CatalogueInput = z.infer<typeof catalogueInputSchema>;
export type CatalogueSectionInput = z.infer<typeof catalogueSectionSchema>;
