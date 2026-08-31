'use client';

import { Node, ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { HelpCircle, Pencil } from 'lucide-react';

/**
 * FAQ section block for the rich-text editor: ONE block holding every
 * question/answer pair, edited together in a single dialog.
 *
 * Saved as
 *   <div data-faq-section class="blog-faqs">
 *     <details data-faq-item class="blog-faq"><summary>Q</summary><div class="blog-faq__answer">…</div></details>
 *     …
 *   </div>
 * so the public page renders native collapsibles with plain CSS (`.blog-faqs`
 * / `.blog-faq` in globals.css) and `extractFaqs()` (lib/blog.ts) turns every
 * item into FAQPage JSON-LD automatically.
 *
 * Inside the editor the block is drawn by a NodeView (below) as a flat,
 * always-expanded list with an "Edit questions" button — nothing collapses
 * while authoring. Atom node: `items` is an attribute, not editable content.
 */
export interface FaqEntry {
  question: string;
  /** Answer as HTML produced by the (minimal) nested editor. */
  answer: string;
}

export interface FaqSectionAttrs {
  items: FaqEntry[];
}

export interface FaqSectionOptions {
  /** Called by the NodeView's Edit button after selecting the block. */
  onEdit: () => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    faqSection: {
      /** Insert an FAQ section at the cursor. */
      setFaqSection: (attrs: FaqSectionAttrs) => ReturnType;
      /** Replace the questions of the selected FAQ section. */
      updateFaqSection: (attrs: Partial<FaqSectionAttrs>) => ReturnType;
    };
  }
}

const textOf = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** Read items back from saved markup — a whole section, or a legacy single item. */
function parseItems(el: HTMLElement): FaqEntry[] {
  const nodes = el.matches('details') ? [el] : Array.from(el.querySelectorAll(':scope > details'));
  return nodes
    .map((d) => ({
      question: d.querySelector('summary')?.textContent?.trim() ?? '',
      answer: d.querySelector('.blog-faq__answer')?.innerHTML ?? '',
    }))
    .filter((i) => i.question);
}

function FaqSectionView({ node, selected, editor, getPos, extension }: NodeViewProps) {
  const items = (node.attrs as FaqSectionAttrs).items;

  const edit = () => {
    // Select the block first so the dialog's update targets this node.
    const pos = getPos();
    if (typeof pos === 'number') editor.commands.setNodeSelection(pos);
    (extension.options as FaqSectionOptions).onEdit();
  };

  return (
    <NodeViewWrapper
      data-drag-handle
      onDoubleClick={edit}
      className={`faq-section-view my-6 overflow-hidden rounded-md border-2 bg-gray-50 ${
        selected ? 'border-blue-500' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2" contentEditable={false}>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          <HelpCircle className="h-3.5 w-3.5" />
          FAQ section · {items.length} question{items.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={edit}
          onMouseDown={(e) => e.preventDefault()}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit questions
        </button>
      </div>

      <ol className="divide-y divide-gray-200 bg-white" contentEditable={false}>
        {items.map((it, i) => (
          <li key={i} className="px-4 py-3">
            <p className="text-sm font-bold text-gray-900">
              {i + 1}. {it.question}
            </p>
            {/* Admin-authored HTML from our own editor — same trust level as the post body. */}
            <div className="mt-1 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: it.answer }} />
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-500">No questions yet — click &quot;Edit questions&quot;.</li>
        )}
      </ol>

      <p className="border-t border-gray-200 px-4 py-1.5 text-[11px] text-gray-400" contentEditable={false}>
        Shown as collapsible questions on the post and added to its FAQ schema.
      </p>
    </NodeViewWrapper>
  );
}

export const FaqSection = Node.create<FaqSectionOptions>({
  name: 'faqSection',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { onEdit: () => {} };
  },

  addAttributes() {
    return {
      items: {
        default: [] as FaqEntry[],
        parseHTML: (el: HTMLElement) => parseItems(el),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-faq-section]' },
      // Posts saved by the earlier one-item-per-block version.
      { tag: 'details[data-faq-item]' },
    ];
  },

  renderHTML({ node }) {
    const { items } = node.attrs as FaqSectionAttrs;

    // Answers are HTML strings, which a DOMOutputSpec array can't carry, so
    // build real elements. getHTML() only ever runs in the browser; the array
    // form is a text-only safety net for SSR.
    if (typeof document === 'undefined') {
      return [
        'div',
        { 'data-faq-section': '', class: 'blog-faqs' },
        ['p', {}, items.map((i) => `${i.question} ${textOf(i.answer)}`).join(' ')],
      ];
    }

    const wrap = document.createElement('div');
    wrap.setAttribute('data-faq-section', '');
    wrap.className = 'blog-faqs';
    for (const item of items) {
      const details = document.createElement('details');
      details.setAttribute('data-faq-item', '');
      details.className = 'blog-faq';
      const summary = document.createElement('summary');
      summary.textContent = item.question;
      const body = document.createElement('div');
      body.className = 'blog-faq__answer';
      body.innerHTML = item.answer || '<p></p>';
      details.append(summary, body);
      wrap.appendChild(details);
    }
    return { dom: wrap };
  },

  addNodeView() {
    return ReactNodeViewRenderer(FaqSectionView);
  },

  addCommands() {
    return {
      setFaqSection:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
      updateFaqSection:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    };
  },
});
