interface ContentSectionProps {
  heading: string;
  /** Sanitized rich-text HTML (already run through `toRichHtml`), or ''. */
  bodyHtml: string;
}

/**
 * The admin's editorial "content below" copy for a collection page — kept as
 * its own section, separate from FaqSection, so the FAQ block has no
 * structural dependency on whether this copy exists.
 */
export function ContentSection({ heading, bodyHtml }: ContentSectionProps) {
  if (!bodyHtml) return null;

  return (
    <section aria-label={heading} style={{ background: '#F5F1EB' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-10 pb-16">
        <div
          className="blog-content max-w-7xl border-t border-bdr pt-10"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
    </section>
  );
}
