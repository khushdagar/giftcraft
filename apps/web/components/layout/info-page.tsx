import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shared shell for the static help & legal pages linked from the footer
 * (FAQ, Shipping, Returns, Terms, Privacy, GST Info). Keeps them visually
 * consistent with the rest of the customer-facing site without each page
 * re-inventing a header.
 */
export function InfoPage({
  eyebrow,
  title,
  intro,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  /** Only shown on policy pages, where "last updated" carries legal weight. */
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="container-gc-w py-12 md:py-16">
        <p className="text-xs" style={{ color: '#9B9B93' }}>
          <Link href="/" style={{ color: '#1A6B4F' }}>
            Home
          </Link>{' '}
          / <span>{title}</span>
        </p>

        <p className="overline mt-4 text-ink-3">{eyebrow}</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">{intro}</p>
        {updated && <p className="mt-2 text-xs text-ink-3">Last updated: {updated}</p>}

        <div className="mt-10 space-y-6">{children}</div>
      </div>
    </div>
  );
}

/** One bordered block of content. */
export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border-2 border-bdr bg-white p-6 md:p-8">
      <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

/** A question/answer pair for the FAQ page. */
export function InfoQA({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="border-b border-bdr pb-4 last:border-b-0 last:pb-0">
      <h3 className="text-sm font-bold text-ink">{q}</h3>
      <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}
