/**
 * Proposal-only products — one-off items an admin types into the proposal
 * builder because a lead asked for something that is not in the catalogue.
 *
 * They are stored as real Product rows so everything downstream of a proposal
 * keeps working unchanged: server-side pricing, HSN/GST lookup, the deck PDF,
 * and OrderItem's required productId when the client accepts and pays.
 *
 * Two things keep them out of sight:
 *  - status `archived` — every storefront query, the sitemap and the public
 *    product page only serve `active` products;
 *  - this tag — admin listings (Products tab, global search) filter it out.
 */
export const PROPOSAL_ONLY_TAG = 'proposal-only';

/** Prisma `where` fragment that hides proposal-only products from a listing. */
export const NOT_PROPOSAL_ONLY = { NOT: { tags: { has: PROPOSAL_ONLY_TAG } } } as const;
