/**
 * The one slugify used everywhere a name becomes a URL — categories, occasions,
 * collections, packs, campaigns.
 *
 * Replaces every run of non-alphanumeric characters with a SINGLE hyphen. The
 * order matters: the six admin forms that previously each had their own copy
 * turned spaces into hyphens FIRST and only then stripped punctuation, so
 * "Tech & Gadgets" became "tech-&-gadgets" and then "tech--gadgets" — a double
 * hyphen baked into the public URL. Collapsing in one pass can't produce that.
 *
 * Accents are folded ("Café" → "cafe") so a slug is always plain ASCII.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    // Strip combining diacritical marks left behind by NFD decomposition.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
