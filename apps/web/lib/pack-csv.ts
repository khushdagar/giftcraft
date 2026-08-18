/**
 * Shared column definition for the curated-pack bulk-upload CSV.
 * Used by both the blank template and the filled sample-sheet downloads so
 * they never drift out of sync with the importer.
 *
 * A pack carries no prices, HSN or dimensions of its own — those are derived
 * from its member products (see `products` column), exactly as the pack form
 * does. The pack image is a render-time collage of the members' images, so
 * `imageUrls` is optional.
 */
export const PACK_CSV_HEADERS = [
  'name',
  'slug', 'sku', 'status', 'isFeatured', 'sortOrder',
  // The members: "SKU x2, SKU, SKU x4" — quantity defaults to 1 when omitted.
  'products',
  'category', 'occasions', 'tags', 'recipientTags',
  'descriptionShort', 'descriptionLong',
  'keyFeatures', 'specifications', 'shippingDelivery',
  // SEO — left blank the pack page falls back to its name / short description.
  'metaTitle', 'metaDescription',
  'imageUrls',
] as const;

// Quote a cell when it contains a comma, quote, or newline (RFC-4180)
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Build a CSV string from an array of row objects keyed by header name. */
export function buildPackCsv(rows: Record<string, string>[]): string {
  const headerLine = PACK_CSV_HEADERS.join(',');
  const dataLines = rows.map((row) =>
    PACK_CSV_HEADERS.map((h) => cell(row[h] ?? '')).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}
