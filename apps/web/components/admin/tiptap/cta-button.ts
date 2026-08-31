import { Node } from '@tiptap/react';

/**
 * Call-to-action button for the rich-text editor.
 *
 * An INLINE atom, so several buttons can share a line (separated by a space)
 * and a new line is just a new paragraph; the line's alignment comes from the
 * paragraph (TextAlign), like any other text.
 *
 * Saved as `<a data-cta-button class="blog-cta__btn blog-cta__btn--primary" href="…">Label</a>`
 * inside the paragraph, styled by `.blog-cta__btn` in globals.css — no JS on
 * the public page. The label and URL are attributes edited through the
 * toolbar dialog, not inline text.
 *
 * Legacy block form `<div data-cta-button class="blog-cta"><a …>` (from the
 * first version) still parses; the parser wraps it in a paragraph.
 */
export type CtaVariant = 'primary' | 'outline';
export type CtaAlign = 'left' | 'center' | 'right';

export interface CtaButtonAttrs {
  href: string;
  label: string;
  variant: CtaVariant;
  newTab: boolean;
}

export const DEFAULT_CTA: CtaButtonAttrs = {
  href: '',
  label: '',
  variant: 'primary',
  newTab: false,
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ctaButton: {
      /** Insert a button at the cursor, followed by a space so another can follow. */
      setCtaButton: (attrs: CtaButtonAttrs) => ReturnType;
      /** Change the attributes of the selected button. */
      updateCtaButton: (attrs: Partial<CtaButtonAttrs>) => ReturnType;
    };
  }
}

/** The <a> carrying the data — the element itself (inline form) or its child (legacy block form). */
const anchorOf = (el: HTMLElement): HTMLElement | null => (el.matches('a') ? el : el.querySelector('a'));

export const CtaButton = Node.create({
  name: 'ctaButton',
  inline: true,
  group: 'inline',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    // Each attribute is read back from the saved markup and NOT echoed as a
    // raw HTML attribute (renderHTML below builds the markup by hand).
    return {
      href: {
        default: '',
        parseHTML: (el: HTMLElement) => anchorOf(el)?.getAttribute('href') ?? '',
        renderHTML: () => ({}),
      },
      label: {
        default: '',
        parseHTML: (el: HTMLElement) => anchorOf(el)?.textContent?.trim() ?? '',
        renderHTML: () => ({}),
      },
      variant: {
        default: 'primary',
        parseHTML: (el: HTMLElement): CtaVariant =>
          /blog-cta__btn--outline/.test(anchorOf(el)?.className ?? '') || el.getAttribute('data-variant') === 'outline'
            ? 'outline'
            : 'primary',
        renderHTML: () => ({}),
      },
      newTab: {
        default: false,
        parseHTML: (el: HTMLElement) => anchorOf(el)?.getAttribute('target') === '_blank',
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    // ProseMirror tries MARK rules before node rules at equal priority, and the
    // Link mark matches any `a[href]` — without a higher priority a saved
    // button would be re-read as a plain link when the post is reopened.
    return [
      { tag: 'a[data-cta-button]', priority: 100 },
      { tag: 'div[data-cta-button]', priority: 100 },
    ];
  },

  renderHTML({ node }) {
    const { href, label, variant, newTab } = node.attrs as CtaButtonAttrs;
    return [
      'a',
      {
        'data-cta-button': '',
        href,
        class: `blog-cta__btn blog-cta__btn--${variant}`,
        ...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
      },
      label || 'Button',
    ];
  },

  addCommands() {
    return {
      setCtaButton:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent([{ type: this.name, attrs }, { type: 'text', text: ' ' }]),
      updateCtaButton:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    };
  },
});
