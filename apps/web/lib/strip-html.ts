/**
 * Client-safe plain-text extraction from a possibly-HTML string. Used for
 * teasers/meta previews where markup must not appear. No dependencies, so it's
 * safe to import from client components (unlike `lib/rich-text`).
 */
export function stripHtml(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/<[^>]*>/g, ' ') // drop tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
