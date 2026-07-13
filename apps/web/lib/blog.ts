/**
 * Shared helpers for the blog. Kept framework-free so both the admin API routes
 * and the public pages can use them.
 */

/** URL-safe slug from a title. Mirrors the inline helper used by other admin forms. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Strip HTML tags and collapse whitespace — for word counts and excerpts. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Reading time at ~200 words per minute, never less than 1. */
export function readingMinutes(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** First `max` characters of the body, cut on a word boundary. */
export function autoExcerpt(html: string, max = 160): string {
  const text = stripHtml(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).trimEnd() + '…';
}

/** Comma/newline separated tag input → a clean, de-duplicated list. */
export function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,\n]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export function formatPostDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** What the public site treats as visible: published AND not future-dated. */
export function publishedPostWhere() {
  return {
    status: 'published' as const,
    publishedAt: { not: null, lte: new Date() },
  };
}
