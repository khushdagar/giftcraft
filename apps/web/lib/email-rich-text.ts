import { COLORS, esc } from './email-theme';

// ── Rich text → email HTML ────────────────────────────────────────────────
// The offer composer stores TipTap HTML, which leans on stylesheets and class
// names. Mail clients strip both, so every tag is rewritten with inline styles
// and anything not on the allowlist is dropped.

const RICH_TEXT_STYLES: Record<string, string> = {
  p: `margin:0 0 16px;font-size:15px;line-height:1.65;color:${COLORS.body};`,
  div: `margin:0 0 16px;font-size:15px;line-height:1.65;color:${COLORS.body};`,
  h1: `margin:24px 0 12px;font-size:26px;line-height:1.25;font-weight:800;color:${COLORS.ink};`,
  h2: `margin:24px 0 12px;font-size:22px;line-height:1.3;font-weight:800;color:${COLORS.ink};`,
  h3: `margin:20px 0 10px;font-size:19px;line-height:1.35;font-weight:700;color:${COLORS.ink};`,
  h4: `margin:18px 0 8px;font-size:17px;line-height:1.4;font-weight:700;color:${COLORS.ink};`,
  h5: `margin:16px 0 8px;font-size:15px;line-height:1.4;font-weight:700;color:${COLORS.ink};`,
  h6: `margin:16px 0 8px;font-size:14px;line-height:1.4;font-weight:700;color:${COLORS.muted};`,
  ul: `margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.65;color:${COLORS.body};`,
  ol: `margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.65;color:${COLORS.body};`,
  li: `margin:0 0 6px;`,
  blockquote: `margin:0 0 16px;padding:4px 0 4px 16px;border-left:3px solid ${COLORS.emerald};font-style:italic;color:${COLORS.muted};`,
  pre: `margin:0 0 16px;padding:14px 16px;border-radius:8px;background-color:#222222;color:#F5F1EB;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.6;overflow-x:auto;white-space:pre-wrap;`,
  code: `padding:2px 5px;border-radius:4px;background-color:${COLORS.page};font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;`,
  a: `color:${COLORS.brand};text-decoration:underline;`,
  strong: 'font-weight:700;',
  b: 'font-weight:700;',
  em: 'font-style:italic;',
  i: 'font-style:italic;',
  u: 'text-decoration:underline;',
  s: 'text-decoration:line-through;',
  del: 'text-decoration:line-through;',
  mark: 'background-color:#FEF08A;padding:0 2px;',
  span: '',
  br: '',
  hr: `border:0;border-top:1px solid ${COLORS.border};margin:24px 0;`,
  img: 'display:block;max-width:100%;height:auto;border-radius:8px;margin:0 0 16px;',
  table: `width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px;color:${COLORS.body};`,
  thead: '',
  tbody: '',
  tr: '',
  th: `border:1px solid ${COLORS.border};padding:8px 10px;background-color:${COLORS.surface};text-align:left;font-weight:700;color:${COLORS.ink};`,
  td: `border:1px solid ${COLORS.border};padding:8px 10px;`,
};

const RICH_TEXT_ATTRS: Record<string, string[]> = {
  a: ['href'],
  img: ['src', 'alt', 'width', 'height'],
  th: ['colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
};

/** Author-set declarations worth keeping — colour, highlight and alignment. */
const RICH_TEXT_STYLE_PROPS = new Set([
  'color',
  'background-color',
  'text-align',
  'font-weight',
  'font-style',
  'text-decoration',
]);

const VOID_TAGS = new Set(['br', 'hr', 'img']);

const escAttr = (s: string) =>
  esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Keep only safe declarations from an author-supplied style attribute. */
function filterInlineStyle(style: string): string {
  return style
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const i = decl.indexOf(':');
      if (i < 0) return '';
      const prop = decl.slice(0, i).trim().toLowerCase();
      const value = decl.slice(i + 1).trim();
      if (!RICH_TEXT_STYLE_PROPS.has(prop)) return '';
      if (/url\s*\(|expression|javascript:/i.test(value)) return '';
      return `${prop}:${value};`;
    })
    .join('');
}

/** Rewrite editor HTML into sanitised, inline-styled markup for email. */
export function richTextToEmailHtml(html: string): string {
  let out = String(html ?? '');

  // Elements that must never reach an inbox, contents included.
  out = out.replace(/<(script|style|iframe|object|embed|noscript)\b[\s\S]*?<\/\1>/gi, '');

  // TipTap nests <code> inside <pre>; the block styling belongs on <pre> alone.
  out = out
    .replace(/<pre([^>]*)>\s*<code[^>]*>/gi, '<pre$1>')
    .replace(/<\/code>\s*<\/pre>/gi, '</pre>');

  // It also wraps list-item and cell content in <p>. Left in place the paragraph
  // margin double-spaces every bullet and table row, so unwrap single paragraphs.
  out = out.replace(
    /<(li|td|th)([^>]*)>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/\1>/gi,
    '<$1$2>$3</$1>'
  );

  return out.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g,
    (_match, closing: string, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      // Unknown tag: drop the markup but keep whatever text it wrapped.
      if (!(tag in RICH_TEXT_STYLES)) return '';
      if (closing) return VOID_TAGS.has(tag) ? '' : `</${tag}>`;

      const allowed = RICH_TEXT_ATTRS[tag] ?? [];
      const attrs: string[] = [];
      let authorStyle = '';
      let href = '';

      const attrRe = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let m: RegExpExecArray | null;
      while ((m = attrRe.exec(rawAttrs)) !== null) {
        const name = (m[1] ?? '').toLowerCase();
        const value = m[2] ?? m[3] ?? '';
        if (name === 'style') {
          authorStyle = filterInlineStyle(value);
          continue;
        }
        if (!allowed.includes(name)) continue;
        // Only http(s) and mailto/tel survive; blocks javascript: and data: URLs.
        if (
          (name === 'href' || name === 'src') &&
          !/^(https?:\/\/|mailto:|tel:|\/)/i.test(value.trim())
        ) {
          continue;
        }
        if (name === 'href') href = value;
        attrs.push(`${name}="${escAttr(value)}"`);
      }

      if (tag === 'a' && href) attrs.push('target="_blank"', 'rel="noopener noreferrer"');
      if (tag === 'table') attrs.push('cellpadding="0"', 'cellspacing="0"', 'border="0"');

      // Author declarations come last so colour and alignment win over defaults.
      const style = `${RICH_TEXT_STYLES[tag]}${authorStyle}`;
      if (style) attrs.unshift(`style="${style}"`);

      const attrStr = attrs.length ? ` ${attrs.join(' ')}` : '';
      return VOID_TAGS.has(tag) ? `<${tag}${attrStr} />` : `<${tag}${attrStr}>`;
    }
  );
}
