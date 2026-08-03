import sanitizeHtml from 'sanitize-html';

/**
 * Server-side rich-text helpers.
 *
 * Product description fields are authored in the admin with a tiptap editor and
 * stored as HTML. Older products still hold PLAIN TEXT (with newlines). Both must
 * render correctly on the public product page, so `toRichHtml` normalizes either
 * form into safe, display-ready HTML. Sanitization runs on the server so the
 * SSR'd markup is already clean — never pass raw stored HTML to the browser.
 *
 * NOTE: imports `sanitize-html` (Node only) — do not import this file from a
 * client component. Use `stripHtml` from `lib/strip-html` on the client instead.
 */

const ALLOWED_TAGS = [
  'p', 'br', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr',
  'a', 'img',
  // The admin editor can insert tables — without these the whole table is
  // stripped on render and the content silently disappears.
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
    span: ['style'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    '*': ['class'],
  },
  // Only http(s), mailto and protocol-relative links — blocks javascript: URIs.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  // Keep inline color/weight from the editor but nothing that can execute.
  allowedStyles: {
    '*': {
      color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/i, /^[a-z-]+$/i],
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      'font-weight': [/^bold$/, /^\d+$/],
    },
  },
  transformTags: {
    // Force safe rel on links that open a new tab.
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, false),
  },
};

/** True if the string appears to contain HTML markup (a real tag). */
function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Sanitize already-HTML content against the allowlist above. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/**
 * Normalize a stored description field into safe, display-ready HTML.
 * - HTML input  → sanitized HTML.
 * - Plain text  → escaped, with paragraph/line breaks preserved.
 * - Empty/null  → '' (callers should treat as "no content").
 */
export function toRichHtml(value?: string | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (looksLikeHtml(trimmed)) {
    const clean = sanitizeRichText(trimmed);
    // Sanitizing away everything (e.g. a lone "<3") leaves an empty string.
    return clean.trim() ? clean : `<p>${escapeHtml(trimmed)}</p>`;
  }

  // Legacy plain text: preserve blank-line paragraphs and single line breaks.
  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
  return paragraphs;
}
