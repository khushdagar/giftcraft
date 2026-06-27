/**
 * Shared column definition for the product bulk-upload CSV.
 * Used by both the blank template and the filled sample-sheet downloads so
 * they never drift out of sync with the importer.
 */
export const PRODUCT_CSV_HEADERS = [
  // Specs
  'name', 'sku', 'slug', 'brand', 'status', 'isFeatured', 'sortOrder',
  'category', 'subcategory', 'material',
  'lengthCm', 'widthCm', 'heightCm', 'weightG',
  'colors', 'sizes', 'moq', 'leadTimeDays',
  'isEcoCertified', 'ecoCertification',
  // Tax + branding
  'hsnCode', 'printingTechnique', 'printingPosition', 'brandingArea', 'sampleAvailable',
  // Tags + description
  'occasions', 'recipientTags', 'descriptionShort', 'descriptionLong', 'imageUrls',
  // Vendor / sourcing
  'vendorName', 'vendorSku', 'vendorMoq', 'vendorLeadDays', 'vendorCost', 'sourcingStatus', 'altVendorName',
  // 6 price tiers
  't1_minQty', 't1_maxQty', 't1_costPrice', 't1_sellPrice',
  't2_minQty', 't2_maxQty', 't2_costPrice', 't2_sellPrice',
  't3_minQty', 't3_maxQty', 't3_costPrice', 't3_sellPrice',
  't4_minQty', 't4_maxQty', 't4_costPrice', 't4_sellPrice',
  't5_minQty', 't5_maxQty', 't5_costPrice', 't5_sellPrice',
  't6_minQty', 't6_maxQty', 't6_costPrice', 't6_sellPrice',
] as const;

// Quote a cell when it contains a comma, quote, or newline (RFC-4180)
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Build a CSV string from an array of row objects keyed by header name. */
export function buildProductCsv(rows: Record<string, string>[]): string {
  const headerLine = PRODUCT_CSV_HEADERS.join(',');
  const dataLines = rows.map((row) =>
    PRODUCT_CSV_HEADERS.map((h) => cell(row[h] ?? '')).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}
