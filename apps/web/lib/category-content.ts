/**
 * Editorial copy for category landing pages.
 *
 * Categories in the database carry no description for the most part, and a
 * category page with no unique copy is a thin page — Google treats a grid of
 * product links with a stock sentence as duplicate/low-value. This map gives
 * each category its own honest, specific intro and meta description.
 *
 * `intro` is what renders on the page; `meta` is the <meta name="description">
 * (kept ≤155 chars). A category's DB `description` always wins over `intro`
 * when an admin has written one — keep this as the fallback, not an override.
 *
 * Keyed by category slug. Unknown/new slugs fall back to a generic template so
 * a newly created category is never left without copy.
 */

type CategoryCopy = { intro: string; meta: string };

const COPY: Record<string, CategoryCopy> = {
  drinkware: {
    intro:
      'Bottles, tumblers, flasks and mugs that people actually keep on their desk — the most-used category in corporate gifting. Every piece can carry your logo, with the printing cost already built into the per-unit price you see.',
    meta: 'Bulk branded drinkware for corporate gifting — insulated bottles, tumblers, flasks and mugs with your logo. Transparent per-unit pricing.',
  },
  'tech--gadgets': {
    intro:
      'Power banks, speakers, chargers and desk tech for teams that live on their devices. Branding is included in the price shown, and quantity tiers bring the per-unit cost down as your order grows.',
    meta: 'Branded tech gifts in bulk — power banks, speakers, chargers and desk gadgets for corporate gifting, with logo printing included.',
  },
  'bags--travel': {
    intro:
      'Backpacks, laptop bags, duffels and travel organisers for onboarding kits, offsites and client gifting. Large branding areas make these some of the most visible gifts you can send.',
    meta: 'Bulk branded bags and travel gear — backpacks, laptop bags and duffels for corporate gifting, with your logo included in the price.',
  },
  'stationery--desk': {
    intro:
      'Notebooks, pens, diaries and desk organisers — the dependable core of any welcome kit or event giveaway. Our widest range, and the easiest category to brand well at volume.',
    meta: 'Branded stationery and desk gifts in bulk — notebooks, pens, diaries and organisers for corporate gifting and welcome kits.',
  },
  'gourmet--hampers': {
    intro:
      'Dry fruits, chocolates, teas and ready-assembled festive hampers for Diwali, New Year and client appreciation. Packaging can be branded even where the food inside cannot.',
    meta: 'Corporate gourmet gifts and festive hampers in bulk — dry fruits, chocolates and curated boxes with branded packaging.',
  },
  wellness: {
    intro:
      'Fitness, self-care and desk-wellness gifts for programmes that put employee wellbeing first. A thoughtful alternative when standard swag feels impersonal.',
    meta: 'Bulk corporate wellness gifts — fitness, self-care and desk-wellness products for employee wellbeing programmes, branded to order.',
  },
  'leather--accessories': {
    intro:
      'Wallets, card holders, journals and leather accessories for senior recognition, milestones and high-value client gifting. Debossed branding sits well on these pieces.',
    meta: 'Premium leather corporate gifts in bulk — wallets, card holders and journals with debossed branding for client and milestone gifting.',
  },
  'eco--sustainable': {
    intro:
      'Gifts made from recycled, organic and responsibly sourced materials, for teams whose gifting has to line up with their sustainability commitments. Certifications are listed on each product.',
    meta: 'Eco-friendly corporate gifts in bulk — recycled, organic and sustainably sourced branded products with certifications listed.',
  },
  'gift-cards': {
    intro:
      'Prepaid and digital gift options for when recipients are best left to choose for themselves — useful for distributed teams and last-minute programmes.',
    meta: 'Corporate gift cards for bulk gifting programmes — a flexible option for distributed teams and short-notice occasions.',
  },
  recognition: {
    intro:
      'Awards, trophies and milestone gifts for work anniversaries, farewells and performance recognition. Personalisation with names and dates is available on most pieces.',
    meta: 'Corporate recognition gifts and awards in bulk — trophies and milestone gifts for anniversaries, farewells and performance awards.',
  },
  apparel: {
    intro:
      'T-shirts, polos, jackets and headwear for team kits, events and onboarding. Available across full size ranges, with embroidery or print applied to your artwork.',
    meta: 'Branded corporate apparel in bulk — t-shirts, polos and jackets with embroidery or print, in full size ranges for teams and events.',
  },
};

/**
 * Clamp text to a meta-description-safe length on a word boundary. Admin-written
 * category descriptions are page copy, not meta copy — Google truncates around
 * 155–160 characters, so a 500-character description would be cut mid-sentence
 * in the SERP.
 */
export function toMetaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-–—]$/, '')}…`;
}

export function categoryCopy(slug: string, name: string): CategoryCopy {
  const found = COPY[slug];
  if (found) return found;
  // Generic but still category-specific fallback for newly added categories.
  return {
    intro: `Browse our ${name.toLowerCase()} range for corporate gifting. Every product is priced per unit with branding already included, and prices step down as your order quantity grows.`,
    meta: `Bulk ${name.toLowerCase()} for corporate gifting on GIVOO — branded to order with transparent per-unit pricing and quantity discounts.`,
  };
}
