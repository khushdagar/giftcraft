/**
 * Display labels for the PrintingTechnique enum.
 *
 * Keys mirror `enum PrintingTechnique` in schema.prisma exactly. This is the one
 * place the mapping lives — components previously each carried their own copy,
 * which had drifted (`laser_engrave` vs the real `laser_engraving`, `emboss`
 * missing entirely), so some products rendered the raw database value.
 */
export const PRINTING_TECHNIQUE_LABELS: Record<string, string> = {
  screen_print: 'Screen Print',
  uv_print: 'UV Print',
  embroidery: 'Embroidery',
  laser_engraving: 'Laser Engraving',
  digital_print: 'Digital Print',
  emboss: 'Emboss',
  none: 'No Branding',
};

/**
 * Human label for a stored technique. Returns null for empty/`none` so callers
 * can skip rendering entirely rather than inventing a technique the product
 * doesn't have. An unmapped value is title-cased instead of shown raw, so a new
 * enum member degrades to "Foil Stamp" rather than "foil_stamp".
 */
export function printingTechniqueLabel(value?: string | null): string | null {
  const key = value?.trim();
  if (!key || key === 'none') return null;
  return (
    PRINTING_TECHNIQUE_LABELS[key] ??
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
