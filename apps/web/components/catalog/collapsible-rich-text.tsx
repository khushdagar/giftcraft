'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleRichTextProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
  /** Words shown before "Read more" — same on desktop and mobile. */
  wordLimit?: number;
}

// Regex strip, not DOMParser — this renders on the server too, so the collapsed
// excerpt must come out identical in both environments.
function toPlainText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
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

// A leading <h1>–<h6> is page copy, not body text — keep it rendered as a
// heading in the collapsed state instead of folding it into the word count.
const LEADING_HEADING = /^\s*<(h[1-6])\b[^>]*>[\s\S]*?<\/\1>/i;

export function CollapsibleRichText({
  html,
  className,
  style,
  wordLimit = 15,
}: CollapsibleRichTextProps) {
  const [open, setOpen] = useState(false);

  const { heading, words, truncated } = useMemo(() => {
    const match = html.match(LEADING_HEADING);
    const headingHtml = match?.[0] ?? null;
    const body = headingHtml ? html.slice(headingHtml.length) : html;
    const all = toPlainText(body).split(' ').filter(Boolean);
    return {
      heading: headingHtml,
      words: all.slice(0, wordLimit),
      truncated: all.length > wordLimit,
    };
  }, [html, wordLimit]);

  // "Read more" must sit on the same line as the excerpt's last word. At the
  // full word limit it often doesn't fit, so drop trailing words one at a time
  // until it does — measured after layout, since it depends on the rendered
  // width. Re-measures from scratch on resize.
  const [shown, setShown] = useState(words.length);
  const lastWordRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    setShown(words.length);
  }, [words]);

  useLayoutEffect(() => {
    const onResize = () => setShown(words.length);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [words]);

  useLayoutEffect(() => {
    if (open || !truncated || shown <= 4) return;
    const lastWord = lastWordRef.current;
    const toggleEl = toggleRef.current;
    if (!lastWord || !toggleEl) return;
    // Different offsetTop => the toggle got pushed onto its own line.
    if (toggleEl.offsetTop > lastWord.offsetTop) setShown((n) => n - 1);
  }, [open, truncated, shown]);

  // Short copy needs no toggle at all.
  if (!truncated) {
    return (
      <div
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const toggle = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      // inline (not inline-flex) so the toggle flows as part of the sentence and
      // sits directly after the last word instead of starting its own line.
      className="m-0 inline whitespace-nowrap align-baseline text-sm font-medium"
      style={{ color: '#800020' }}
    >
      {open ? 'Read less' : 'Read more'}
      <ChevronDown
        className={`ml-0.5 inline-block h-3.5 w-3.5 align-[-0.15em] transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>
  );

  return (
    <div>
      {open ? (
        <div className={className} style={style}>
          {/* last-child:inline so "Read less" trails the final line of copy
              instead of being pushed onto its own line by a block element. */}
          <span
            className="[&>*:last-child]:inline"
            dangerouslySetInnerHTML={{ __html: html }}
          />{' '}
          {toggle}
        </div>
      ) : (
        <div className={className} style={style}>
          {heading && <div dangerouslySetInnerHTML={{ __html: heading }} />}
          {/* Last word is its own span so the effect above can tell whether
              the toggle wrapped past it. */}
          <p>
            {words.slice(0, Math.max(shown - 1, 0)).join(' ')}{' '}
            <span ref={lastWordRef}>{words[Math.max(shown - 1, 0)]}…</span>{' '}
            <span ref={toggleRef}>{toggle}</span>
          </p>
        </div>
      )}
    </div>
  );
}
