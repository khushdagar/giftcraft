/**
 * Shared helpers for the blog. Kept framework-free so both the admin API routes
 * and the public pages can use them.
 */

/**
 * Fallback byline for posts saved before authors became manageable rows.
 * Author entities now live in the BlogAuthor table (see lib/authors.ts,
 * managed in /admin/blog/authors); this constant only names the seeded
 * default and renders when a byline can't be resolved.
 */
export const BLOG_AUTHOR = 'Mayank Jain';

/** Posts per page on the public listing. */
export const POSTS_PER_PAGE = 9;

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
    // A closing inline tag before punctuation ("<strong>yes</strong>.") leaves
    // a space behind — pull the punctuation back in.
    .replace(/\s+([.,;:!?])/g, '$1')
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

// ── FAQ extraction ─────────────────────────────────────────────────────────

export interface FaqItem {
  question: string;
  answer: string;
}

/** A heading that opens the FAQ section: "FAQs", "FAQ", "Frequently Asked Questions …". */
const FAQ_HEADING = /\bfaqs?\b|frequently asked questions/i;

/**
 * Pull question/answer pairs out of a post body so the page can emit FAQPage
 * structured data without the author touching any schema.
 *
 * Recognised shapes (all are what the TipTap editor produces):
 *  1. The FAQ section block from the editor's Insert menu — one
 *     `<details data-faq-item><summary>Q</summary><div class="blog-faq__answer">A</div></details>`
 *     per question (inside `<div data-faq-section>`). When any exist they are
 *     the FAQ list; the heading shapes below are only a fallback for posts
 *     written before the block existed.
 *  A. An "FAQs" heading, then each question as a DEEPER heading (H2 → H3) with
 *     its answer in the blocks that follow, until the next heading at or above
 *     the section's level ends the section.
 *  B. An "FAQs" heading with no sub-headings — each question is a paragraph
 *     that is entirely bold, and the paragraphs after it are the answer.
 *
 * Regex-based on purpose: it runs in the admin form (client) as well as the
 * server page, and the editor emits a small, predictable node set.
 */
export function extractFaqs(html: string): FaqItem[] {
  if (!html) return [];

  // Shape 1 — explicit FAQ item blocks.
  const itemRe = /<details\b[^>]*\bdata-faq-item\b[^>]*>([\s\S]*?)<\/details>/gi;
  const items: FaqItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(html))) {
    const inner = m[1] ?? '';
    const q = /<summary\b[^>]*>([\s\S]*?)<\/summary>/i.exec(inner);
    const a = /<div\b[^>]*class="[^"]*\bblog-faq__answer\b[^"]*"[^>]*>([\s\S]*)<\/div>\s*$/i.exec(inner);
    const question = stripHtml(q?.[1] ?? '');
    const answer = stripHtml(a?.[1] ?? '');
    if (question && answer) items.push({ question, answer });
  }
  if (items.length > 0) return items;

  type Block = { level: number; text: string; bodyHtml: string };
  const headingRe = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  const blocks: Block[] = [];
  let last: Block | null = null;
  let lastEnd = 0;
  while ((m = headingRe.exec(html))) {
    if (last) last.bodyHtml = html.slice(lastEnd, m.index);
    last = { level: Number(m[1]), text: stripHtml(m[2] ?? ''), bodyHtml: '' };
    blocks.push(last);
    lastEnd = m.index + m[0].length;
  }
  if (last) last.bodyHtml = html.slice(lastEnd);

  const start = blocks.findIndex((b) => FAQ_HEADING.test(b.text));
  const section = blocks[start];
  if (start === -1 || !section) return [];
  const sectionLevel = section.level;
  const faqs: FaqItem[] = [];

  // Shape A — sub-headings are the questions.
  for (let i = start + 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (!b || b.level <= sectionLevel) break;
    const answer = stripHtml(b.bodyHtml);
    if (b.text && answer) faqs.push({ question: b.text, answer });
  }
  if (faqs.length > 0) return faqs;

  // Shape B — bold-only paragraphs are the questions.
  const paraRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let current: FaqItem | null = null;
  const body = section.bodyHtml;
  while ((m = paraRe.exec(body))) {
    const inner = m[1] ?? '';
    const boldOnly = /^\s*<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>\s*$/i.exec(inner);
    if (boldOnly) {
      if (current?.answer) faqs.push(current);
      current = { question: stripHtml(boldOnly[2] ?? ''), answer: '' };
    } else if (current) {
      const text = stripHtml(inner);
      if (text) current.answer = current.answer ? `${current.answer} ${text}` : text;
    }
  }
  if (current?.answer) faqs.push(current);
  return faqs.filter((f) => f.question);
}
