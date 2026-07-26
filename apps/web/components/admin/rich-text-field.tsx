'use client';

import { useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, Link2Off, Undo2, Redo2,
} from 'lucide-react';

/**
 * Reusable rich-text editor bound to a single string value (HTML). Designed to
 * drop into react-hook-form via <Controller>. Emits '' for empty content so we
 * never store a stray "<p></p>". Used for the product Description and each of
 * the product detail tabs.
 */

function TB({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex h-7 w-7 items-center justify-center rounded transition disabled:opacity-40 ${
        active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
      <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="h-3.5 w-3.5" /></TB>
      <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="h-3.5 w-3.5" /></TB>
      <TB onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></TB>
      <span className="mx-1 h-4 w-px bg-gray-200" />
      <TB onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading"><Heading2 className="h-3.5 w-3.5" /></TB>
      <TB onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Subheading"><Heading3 className="h-3.5 w-3.5" /></TB>
      <span className="mx-1 h-4 w-px bg-gray-200" />
      <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List className="h-3.5 w-3.5" /></TB>
      <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered className="h-3.5 w-3.5" /></TB>
      <TB onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote"><Quote className="h-3.5 w-3.5" /></TB>
      <span className="mx-1 h-4 w-px bg-gray-200" />
      <TB onClick={setLink} active={editor.isActive('link')} title="Add link"><Link2 className="h-3.5 w-3.5" /></TB>
      <TB onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} title="Remove link"><Link2Off className="h-3.5 w-3.5" /></TB>
      <span className="mx-1 h-4 w-px bg-gray-200" />
      <TB onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo2 className="h-3.5 w-3.5" /></TB>
      <TB onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo2 className="h-3.5 w-3.5" /></TB>
    </div>
  );
}

interface RichTextFieldProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum editing-area height in px. Defaults to 120. */
  minHeight?: number;
}

export function RichTextField({ value, onChange, placeholder, minHeight = 120 }: RichTextFieldProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } },
      }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write here…' }),
    ],
    content: value || '',
    // SSR-safe: Next renders this on the server first.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none px-3 py-2 focus:outline-none',
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Normalize tiptap's "empty" document to a real empty string.
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  if (!editor) {
    return <div className="animate-pulse rounded-lg border border-gray-300 bg-gray-50" style={{ minHeight: minHeight + 40 }} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-gray-400">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
