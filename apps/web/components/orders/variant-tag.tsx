export interface OrderedVariant {
  kind: string;
  value: string;
  hex?: string | null;
}

interface VariantTagProps {
  /** The order item's `variantsJson` — anything else is ignored. */
  variants?: unknown;
  className?: string;
}

/** Narrow the untyped Json column down to the entries we can actually render. */
export function parseVariants(variants: unknown): OrderedVariant[] {
  if (!Array.isArray(variants)) return [];
  return variants.filter(
    (v): v is OrderedVariant =>
      !!v && typeof v === 'object' && typeof (v as any).value === 'string'
  );
}

/**
 * Shows the colour/size a customer picked in the builder, from the snapshot
 * stored on the order item. Renders nothing for orders placed before variants
 * were recorded, so those rows just stay as they were.
 */
export function VariantTag({ variants, className = '' }: VariantTagProps) {
  const parsed = parseVariants(variants);
  if (parsed.length === 0) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      {parsed.map((v) => (
        <span
          key={`${v.kind}-${v.value}`}
          className="inline-flex items-center gap-1.5 text-xs text-ink-2"
        >
          {v.hex && (
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full border border-bdr"
              style={{ backgroundColor: v.hex }}
              aria-hidden
            />
          )}
          <span>
            {v.kind ? `${v.kind}: ` : ''}
            {v.value}
          </span>
        </span>
      ))}
    </span>
  );
}
