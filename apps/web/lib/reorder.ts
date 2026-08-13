// Rebuild a past order (or saved pack) in the gift builder via the same
// ?pack=…&qty=…&pv=… URL hand-off the curated-pack pages use. The builder
// clears the current pack, sets the quantity and re-adds every product priced
// at TODAY'S tiers — a reorder never carries stale prices.
export function buildReorderHref(
  items: Array<{
    productId: string;
    variants?: Array<{ kind: string; value: string }> | null;
  }>,
  packQuantity: number
) {
  const ids = items.map((it) => it.productId);
  const pvEntries = items.flatMap((it) =>
    (it.variants ?? []).map(
      (v) =>
        `${encodeURIComponent(it.productId)}~${encodeURIComponent(v.kind)}~${encodeURIComponent(v.value)}`
    )
  );
  const pv = pvEntries.length ? `&pv=${encodeURIComponent(pvEntries.join('|'))}` : '';
  return `/builder?pack=${encodeURIComponent(ids.join(','))}&qty=${packQuantity}${pv}`;
}
