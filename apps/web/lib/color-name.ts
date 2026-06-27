/**
 * Resolve a human colour name (e.g. "Navy", "White", "Rose Gold") to a hex
 * value so a swatch can render automatically — even when no hex was saved in
 * the admin dashboard. Falls back to `null` when the name isn't recognised.
 */

const COLOR_NAME_MAP: Record<string, string> = {
  // Neutrals
  white: '#FFFFFF',
  offwhite: '#FAFAF5',
  ivory: '#FFFFF0',
  cream: '#FDF6E3',
  beige: '#F5F5DC',
  black: '#1A1A1A',
  mattblack: '#1A1A1A',
  matteblack: '#1A1A1A',
  jetblack: '#0A0A0A',
  gray: '#9CA3AF',
  grey: '#9CA3AF',
  charcoal: '#36454F',
  slate: '#64748B',
  silver: '#C0C0C0',
  graphite: '#41424C',
  gunmetal: '#2A3439',

  // Blues
  navy: '#1A3C6E',
  midnight: '#191970',
  royalblue: '#1D4ED8',
  blue: '#2563EB',
  skyblue: '#0EA5E9',
  sky: '#0EA5E9',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  powderblue: '#B0E0E6',
  cobalt: '#0047AB',

  // Greens
  green: '#16A34A',
  forestgreen: '#1A6B4F',
  forest: '#1A6B4F',
  olive: '#808000',
  mint: '#98FF98',
  emerald: '#10B981',
  lime: '#84CC16',
  sage: '#9CAF88',

  // Reds / pinks
  red: '#DC2626',
  maroon: '#800000',
  burgundy: '#800020',
  crimson: '#DC143C',
  pink: '#EC4899',
  rose: '#F43F5E',
  rosegold: '#B76E79',
  coral: '#FF7F50',
  salmon: '#FA8072',

  // Oranges / yellows / browns
  orange: '#F97316',
  amber: '#F59E0B',
  yellow: '#EAB308',
  gold: '#D4AF37',
  mustard: '#E1AD01',
  brown: '#8B5E3C',
  tan: '#D2B48C',
  khaki: '#C3B091',
  chocolate: '#7B3F00',
  copper: '#B87333',
  bronze: '#CD7F32',

  // Purples
  purple: '#9333EA',
  violet: '#8B5CF6',
  lavender: '#B57EDC',
  indigo: '#6366F1',
  plum: '#8E4585',
  magenta: '#D946EF',

  // Misc
  transparent: '#FFFFFF',
  clear: '#FFFFFF',
  natural: '#E8DCC4',
  wood: '#A1662F',
  bamboo: '#C2A878',
};

/**
 * Returns a hex colour for a variant name, or `null` if it can't be resolved.
 * Matching is case-insensitive and ignores spaces/hyphens, so "Rose Gold",
 * "rose-gold" and "rosegold" all resolve to the same value.
 */
export function colorNameToHex(name?: string | null): string | null {
  if (!name) return null;
  const key = name.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (COLOR_NAME_MAP[key]) return COLOR_NAME_MAP[key];

  // Try matching the last word (e.g. "Deep Navy" -> "navy")
  const words = name.trim().toLowerCase().split(/[\s_-]+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    if (w && COLOR_NAME_MAP[w]) return COLOR_NAME_MAP[w];
  }

  return null;
}

/**
 * Resolve the best swatch colour for a variant: prefer an explicitly-saved hex,
 * otherwise derive it from the name, otherwise fall back to a neutral grey.
 */
export function resolveSwatchHex(value?: string | null, hex?: string | null): string {
  if (hex && hex.trim()) return hex.trim();
  return colorNameToHex(value) || '#D4D4D8';
}
