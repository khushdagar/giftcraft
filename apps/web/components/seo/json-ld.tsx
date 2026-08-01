/**
 * Server-rendered JSON-LD script tag. Renders in the initial HTML so Google
 * sees structured data without executing JS. `<` is escaped to prevent the
 * payload from ever closing the script tag early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
