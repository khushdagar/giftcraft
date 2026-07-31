'use client';

import { compressAndUpload } from '@/hooks/use-compressed-upload';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { TableKit } from '@tiptap/extension-table';
import { toast } from 'sonner';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Quote, Code, Link2, Link2Off, ImagePlus, Undo2, Redo2, Minus, Loader2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, Highlighter,
  Table as TableIcon, Trash2, Eraser,
} from 'lucide-react';

/** Compact mode shrinks the toolbar for editors that sit inline in a form. */
const CompactContext = createContext(false);

/** Toolbar button. `active` renders the pressed state. */
function TB({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  const compact = useContext(CompactContext);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex items-center justify-center rounded-md text-xs font-medium transition disabled:opacity-40 ${
        compact
          ? 'h-7 min-w-7 px-1 [&_svg]:h-3.5 [&_svg]:w-3.5'
          : 'h-8 min-w-8 px-1.5'
      } ${active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-gray-200" />;
}

/**
 * Colour swatch button. The native colour input sits invisibly on top so the
 * OS picker opens on click — no extra dependency, works on every browser.
 */
function ColorButton({
  title, value, onPick, children,
}: {
  title: string;
  value: string;
  onPick: (color: string) => void;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex">
      <span
        title={title}
        aria-hidden
        className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 [&_svg]:h-4 [&_svg]:w-4"
      >
        {children}
      </span>
      <input
        type="color"
        aria-label={title}
        value={value}
        onChange={(e) => onPick(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  );
}

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

function Toolbar({
  editor, onImage, uploading,
}: {
  editor: Editor;
  onImage: () => void;
  uploading: boolean;
}) {
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

  const blockValue = HEADING_LEVELS.find((l) => editor.isActive('heading', { level: l }));
  const inTable = editor.isActive('table');

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="flex flex-wrap items-center gap-0.5 p-2">
        {/* Block type */}
        <select
          value={blockValue ? `h${blockValue}` : 'p'}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .setHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6 })
                .run();
          }}
          title="Text style"
          aria-label="Text style"
          className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="p">Paragraph</option>
          {HEADING_LEVELS.map((l) => (
            <option key={l} value={`h${l}`}>{`Heading ${l}`}</option>
          ))}
        </select>
        <Divider />

        {/* Inline marks */}
        <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><Underline className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough className="h-4 w-4" /></TB>
        <Divider />

        {/* Colours */}
        <ColorButton
          title="Font colour"
          value={(editor.getAttributes('textStyle').color as string) || '#1a1a18'}
          onPick={(c) => editor.chain().focus().setColor(c).run()}
        >
          <Palette className="h-4 w-4" />
        </ColorButton>
        <ColorButton
          title="Highlight colour"
          value={(editor.getAttributes('highlight').color as string) || '#fef08a'}
          onPick={(c) => editor.chain().focus().setHighlight({ color: c }).run()}
        >
          <Highlighter className="h-4 w-4" />
        </ColorButton>
        <Divider />

        {/* Alignment */}
        <TB onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left"><AlignLeft className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align centre"><AlignCenter className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right"><AlignRight className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify"><AlignJustify className="h-4 w-4" /></TB>
        <Divider />

        {/* Blocks */}
        <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote"><Quote className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block"><Code className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="h-4 w-4" /></TB>
        <Divider />

        {/* Links, media, tables */}
        <TB onClick={setLink} active={editor.isActive('link')} title="Add link"><Link2 className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} title="Remove link"><Link2Off className="h-4 w-4" /></TB>
        <TB onClick={onImage} disabled={uploading} title="Insert image">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </TB>
        <TB
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          active={inTable}
          title="Insert table"
        >
          <TableIcon className="h-4 w-4" />
        </TB>
        <Divider />

        {/* History + reset */}
        <TB onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo2 className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo2 className="h-4 w-4" /></TB>
        <TB
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Clear formatting"
        >
          <Eraser className="h-4 w-4" />
        </TB>
      </div>

      {/* Table controls only matter with the cursor inside a table. */}
      {inTable && (
        <div className="flex flex-wrap items-center gap-0.5 border-t border-gray-200 px-2 py-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Table</span>
          <TB onClick={() => editor.chain().focus().addRowBefore().run()} title="Add row above">+ Row above</TB>
          <TB onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row below">+ Row below</TB>
          <TB onClick={() => editor.chain().focus().deleteRow().run()} title="Delete row">− Row</TB>
          <Divider />
          <TB onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add column left">+ Col left</TB>
          <TB onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column right">+ Col right</TB>
          <TB onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete column">− Col</TB>
          <Divider />
          <TB onClick={() => editor.chain().focus().toggleHeaderRow().run()} title="Toggle header row">Header row</TB>
          <TB onClick={() => editor.chain().focus().mergeOrSplit().run()} title="Merge or split cells">Merge / split</TB>
          <TB onClick={() => editor.chain().focus().deleteTable().run()} title="Delete table"><Trash2 className="h-4 w-4" /></TB>
        </div>
      )}
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write here…',
  uploadFolder = 'content',
  minHeight = 420,
  compact = false,
  normalizeEmpty = false,
  containerClassName = 'rounded-md border-gray-200',
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Spaces folder that pasted/uploaded images land in. */
  uploadFolder?: string;
  /** Minimum editing-area height in px. */
  minHeight?: number;
  /** Smaller toolbar for editors embedded inline in a form. */
  compact?: boolean;
  /** Emit '' instead of TipTap's empty "<p></p>" — for optional DB columns. */
  normalizeEmpty?: boolean;
  containerClassName?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [uploading, setUploading] = useState(false);

  /** Compress, upload, then drop the CDN URL into the document. */
  const insertImage = useCallback(
    async (file: File) => {
      const editor = editorRef.current;
      if (!editor) return;
      setUploading(true);
      try {
        const data = await compressAndUpload(file, { folder: uploadFolder });
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to upload image');
      } finally {
        setUploading(false);
      }
    },
    [uploadFolder]
  );

  const editor = useEditor({
    // TipTap v3's StarterKit already ships Link and Underline, so configure them
    // here rather than registering the packages again (duplicate-extension error).
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } },
      }),
      Image.configure({ HTMLAttributes: { class: 'rounded-md' } }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: value,
    // Next.js renders this on the server first; without this TipTap warns about
    // a hydration mismatch.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `blog-content ${compact ? 'px-3 py-2' : 'px-4 py-4'} focus:outline-none`,
        style: `min-height:${minHeight}px`,
      },
      // Pasted / dropped images are uploaded instead of being embedded as
      // base64, which would bloat the saved HTML and break in email clients.
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith('image/')
        );
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach(insertImage);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(
          (event as DragEvent).dataTransfer?.files ?? []
        ).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach(insertImage);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(normalizeEmpty && html === '<p></p>' ? '' : html);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await insertImage(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (!editor) {
    return (
      <div
        className={`animate-pulse border bg-gray-50 ${containerClassName}`}
        style={{ minHeight: minHeight + 48 }}
      />
    );
  }

  return (
    <CompactContext.Provider value={compact}>
      <div className={`overflow-hidden border bg-white focus-within:border-gray-400 ${containerClassName}`}>
        <Toolbar editor={editor} onImage={() => fileRef.current?.click()} uploading={uploading} />
        <EditorContent editor={editor} />
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
      </div>
    </CompactContext.Provider>
  );
}
