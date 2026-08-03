/**
 * Editorial fallback copy for occasion landing pages.
 *
 * Unlike categories, occasions are created freely by admins, so there is no
 * hand-written per-slug map here — a generic but still occasion-specific
 * template keeps a brand-new occasion from shipping as a thin page with no copy
 * at all. An admin-written description always wins over this.
 */

export function occasionCopy(name: string, isCollection = false) {
  const lower = name.toLowerCase();
  const noun = isCollection ? 'collection' : 'occasion';

  return {
    intro: isCollection
      ? `Our ${lower} collection, hand-picked for corporate gifting. Every product is priced per unit with branding already included, and prices step down as your order quantity grows.`
      : `Corporate gifts chosen for ${lower}. Every product is priced per unit with branding already included, and prices step down as your order quantity grows.`,
    meta: `Bulk corporate gifts for ${lower} — branded to order with transparent per-unit pricing and quantity discounts on every ${noun} on GIVOO.`,
    title: isCollection ? `${name} — Curated Corporate Gifts` : `${name} Gifts — Bulk Corporate Gifting`,
  };
}
