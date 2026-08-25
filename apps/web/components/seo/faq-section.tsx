import { toRichHtml } from '@/lib/rich-text';

interface FaqSectionProps {
  heading: string;
  /** `answer` is rich text (HTML) as authored in the admin — sanitized here. */
  faqs: { question: string; answer: string }[];
}

/**
 * A dedicated FAQ section, structurally independent of any other page
 * content (ContentSection, the product/pack grid, etc.) — renders nothing at
 * all when there are no FAQs, rather than folding into a shared block. Used
 * by /occasion/[slug], /category/[slug], /curated-packs/occasions/[slug] and
 * /curated-packs/budget/[band]. The FAQPage JSON-LD for the same `faqs` is
 * emitted separately by the caller (see lib/schema.ts's faqPageSchema) — this
 * component only renders the visible copy.
 */
export function FaqSection({ heading, faqs }: FaqSectionProps) {
  if (faqs.length === 0) return null;

  return (
    <section aria-label={`${heading} — FAQs`} style={{ background: '#F5F1EB' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-10 pb-16">
        <div className="max-w-3xl border-t border-bdr pt-10">
          <h2 className="text-xl font-black tracking-tight text-ink">Frequently asked questions</h2>
          <div className="mt-4 divide-y divide-bdr">
            {faqs.map((faq, i) => (
              <details key={i} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink">
                  {faq.question}
                  <span className="shrink-0 text-ink-3 transition group-open:rotate-45">+</span>
                </summary>
                <div
                  className="blog-content mt-2 text-sm leading-relaxed text-ink-2"
                  dangerouslySetInnerHTML={{ __html: toRichHtml(faq.answer) }}
                />
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
