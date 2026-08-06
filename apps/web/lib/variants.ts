// Resolving which variants an order line records.
//
// A product can be added to the builder from several places — a catalog card
// swatch, the product page, a curated pack page, the Budget Planner — and each
// one used to hand over a different (often empty) slice of the choice. That is
// why orders showed "color: Navy" with no size, or nothing at all. This is the
// single place that decides, so every entry path records the same complete set.

export interface VariantOption {
  kind: string;
  value: string;
  hexColor?: string | null;
}

export interface ChosenVariant {
  kind: string;
  value: string;
  hex?: string | null;
}

/**
 * Every variant the order line should record: the user's explicit picks, plus a
 * default for any other kind the product has.
 *
 * An explicit pick is ALWAYS kept, even for a kind missing from `options`. The
 * options list is not a reliable authority — the builder reads its catalogue
 * from a fetch cached for an hour, so it can lag behind the product page the
 * user actually chose on. Validating picks against it silently deleted real
 * choices (a picked size vanished from the order because the stale catalogue
 * copy only carried colours). When a pick can be matched we enrich it with the
 * variant's hex; when it can't, we still record the value.
 *
 * Kinds the user was never asked about fall back to that kind's first option —
 * the same default the pickers pre-select, so the order matches what was shown.
 *
 * A product with no variants and no picks records nothing.
 */
export function resolveChosenVariants(
  options: VariantOption[] | null | undefined,
  picks: Array<{ kind: string; value: string }> = []
): ChosenVariant[] {
  const all = options ?? [];

  // Explicit picks first, in the order they were given.
  const chosen: ChosenVariant[] = [];
  const seen = new Set<string>();
  for (const pick of picks) {
    if (!pick.kind || !pick.value || seen.has(pick.kind)) continue;
    seen.add(pick.kind);
    const match = all.find((v) => v.kind === pick.kind && v.value === pick.value);
    chosen.push({ kind: pick.kind, value: pick.value, hex: match?.hexColor ?? null });
  }

  // Then a default for every remaining kind the product offers.
  for (const kind of Array.from(new Set(all.map((v) => v.kind)))) {
    if (seen.has(kind)) continue;
    const first = all.find((v) => v.kind === kind);
    if (!first) continue;
    seen.add(kind);
    chosen.push({ kind, value: first.value, hex: first.hexColor ?? null });
  }

  return chosen;
}
