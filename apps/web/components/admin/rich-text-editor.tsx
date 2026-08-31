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
  Table as TableIcon, Trash2, Eraser, MousePointerClick, Images, Plus,
  ChevronDown, ChevronUp, MoreHorizontal, HelpCircle, Pencil, X,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MediaLibraryModal } from '@/components/admin/media-library-modal';
import { CtaButton, DEFAULT_CTA, type CtaButtonAttrs, type CtaAlign } from '@/components/admin/tiptap/cta-button';
import { FaqSection, type FaqEntry } from '@/components/admin/tiptap/faq-section';

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
      className={`flex items-center justify-center gap-1 rounded-md text-xs font-medium transition disabled:opacity-40 ${
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

/** Row under the toolbar for controls that only apply to the selected block. */
function ContextRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-t border-gray-200 px-2 py-1.5">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      {children}
    </div>
  );
}

/**
 * Colour menu row. The native colour input sits invisibly on top so the OS
 * picker opens on click — no extra dependency, works on every browser.
 */
function ColorMenuItem({
  value, onPick, children,
}: {
  value: string;
  onPick: (color: string) => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenuItem className="relative gap-2" onSelect={(e) => e.preventDefault()}>
      {children}
      <input
        type="color"
        value={value}
        onChange={(e) => onPick(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </DropdownMenuItem>
  );
}

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

interface ToolbarProps {
  editor: Editor;
  /** Bold / italic / lists / link only — used for the FAQ answer editor. */
  minimal: boolean;
  uploading: boolean;
  onImage: () => void;
  onLibrary: () => void;
  onInsertButton: () => void;
  onEditButton: () => void;
  onInsertFaq: () => void;
  onEditFaq: () => void;
}

function Toolbar({
  editor, minimal, uploading, onImage, onLibrary, onInsertButton, onEditButton, onInsertFaq, onEditFaq,
}: ToolbarProps) {
  const compact = useContext(CompactContext);

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
  const buttonSelected = editor.isActive('ctaButton');
  const faqSelected = editor.isActive('faqSection');
  const menuButton = `flex items-center gap-1 rounded-md text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 ${
    compact ? 'h-7 px-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5' : 'h-8 px-2 [&_svg]:h-4 [&_svg]:w-4'
  }`;

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="flex flex-wrap items-center gap-0.5 p-2">
        {!minimal && (
          <>
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
          </>
        )}

        {/* Inline marks */}
        <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="h-4 w-4" /></TB>
        {!minimal && (
          <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><Underline className="h-4 w-4" /></TB>
        )}
        <Divider />

        {/* Lists */}
        <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered className="h-4 w-4" /></TB>
        <Divider />

        {/* Links */}
        <TB onClick={setLink} active={editor.isActive('link')} title="Add link"><Link2 className="h-4 w-4" /></TB>
        <TB onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} title="Remove link"><Link2Off className="h-4 w-4" /></TB>

        {!minimal && (
          <>
            <Divider />

            {/* Images */}
            <TB onClick={onImage} disabled={uploading} title="Upload image">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            </TB>
            <TB onClick={onLibrary} title="Insert image from media library"><Images className="h-4 w-4" /></TB>
            <Divider />

            {/* Insert menu — blocks that don't need a permanent toolbar slot. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={menuButton} title="Insert a block">
                  <Plus />
                  Insert
                  <ChevronDown className="opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem className="gap-2" onSelect={onInsertButton}>
                  <MousePointerClick className="h-4 w-4" /> Button
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={onInsertFaq}>
                  <HelpCircle className="h-4 w-4" /> FAQ section
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                >
                  <TableIcon className="h-4 w-4" /> Table
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => editor.chain().focus().toggleBlockquote().run()}>
                  <Quote className="h-4 w-4" /> Quote
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => editor.chain().focus().toggleCodeBlock().run()}>
                  <Code className="h-4 w-4" /> Code block
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => editor.chain().focus().setHorizontalRule().run()}>
                  <Minus className="h-4 w-4" /> Divider
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* More formatting — kept, but out of the way. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={menuButton} title="More formatting" aria-label="More formatting">
                  <MoreHorizontal />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-gray-400">Text</DropdownMenuLabel>
                <DropdownMenuItem className="gap-2" onSelect={() => editor.chain().focus().toggleStrike().run()}>
                  <Strikethrough className="h-4 w-4" /> Strikethrough
                </DropdownMenuItem>
                <ColorMenuItem
                  value={(editor.getAttributes('textStyle').color as string) || '#222222'}
                  onPick={(c) => editor.chain().focus().setColor(c).run()}
                >
                  <Palette className="h-4 w-4" /> Font colour
                </ColorMenuItem>
                <ColorMenuItem
                  value={(editor.getAttributes('highlight').color as string) || '#fef08a'}
                  onPick={(c) => editor.chain().focus().setHighlight({ color: c }).run()}
                >
                  <Highlighter className="h-4 w-4" /> Highlight
                </ColorMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-gray-400">Align</DropdownMenuLabel>
                <DropdownMenuItem className="gap-2" onSelect={() => editor.chain().focus().setTextAlign('left').run()}>
                  <AlignLeft className="h-4 w-4" /> Left
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => editor.chain().focus().setTextAlign('center').run()}>
                  <AlignCenter className="h-4 w-4" /> Centre
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => editor.chain().focus().setTextAlign('right').run()}>
                  <AlignRight className="h-4 w-4" /> Right
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => editor.chain().focus().setTextAlign('justify').run()}>
                  <AlignJustify className="h-4 w-4" /> Justify
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" disabled={!editor.can().undo()} onSelect={() => editor.chain().focus().undo().run()}>
                  <Undo2 className="h-4 w-4" /> Undo
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" disabled={!editor.can().redo()} onSelect={() => editor.chain().focus().redo().run()}>
                  <Redo2 className="h-4 w-4" /> Redo
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
                  <Eraser className="h-4 w-4" /> Clear formatting
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Controls for the selected block. Double-clicking a block does the same. */}
      {buttonSelected && (
        <ContextRow label="Button">
          <TB onClick={onEditButton} title="Edit button"><Pencil className="h-4 w-4" /> Edit</TB>
          <TB onClick={() => editor.chain().focus().deleteSelection().run()} title="Remove button"><Trash2 className="h-4 w-4" /> Remove</TB>
        </ContextRow>
      )}
      {faqSelected && (
        <ContextRow label="FAQ section">
          <TB onClick={onEditFaq} title="Edit questions"><Pencil className="h-4 w-4" /> Edit questions</TB>
          <TB onClick={() => editor.chain().focus().deleteSelection().run()} title="Remove FAQ section"><Trash2 className="h-4 w-4" /> Remove</TB>
        </ContextRow>
      )}
      {inTable && (
        <ContextRow label="Table">
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
        </ContextRow>
      )}
    </div>
  );
}

const hasText = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;

/** A row in the FAQ dialog. `id` keeps each answer editor stable while rows move. */
type FaqDraft = FaqEntry & { id: number };
let faqDraftSeq = 0;
const newFaqDraft = (entry?: FaqEntry): FaqDraft => ({ id: ++faqDraftSeq, question: entry?.question ?? '', answer: entry?.answer ?? '' });

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write here…',
  uploadFolder = 'content',
  minHeight = 420,
  compact = false,
  normalizeEmpty = false,
  containerClassName = 'rounded-md border-gray-200',
  minimal = false,
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
  /** Bold / italic / lists / link only; no images, blocks or dialogs. */
  minimal?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  // `editing` = the dialog is changing the selected block rather than inserting.
  // `align` is the line's alignment (paragraph textAlign), not a button attribute.
  const [ctaDialog, setCtaDialog] = useState<{ editing: boolean; attrs: CtaButtonAttrs; align: CtaAlign } | null>(null);
  const [faqDialog, setFaqDialog] = useState<{ editing: boolean; items: FaqDraft[] } | null>(null);

  const openCta = useCallback((editing: boolean) => {
    const ed = editorRef.current;
    if (!ed) return;
    const prev = editing ? (ed.getAttributes('ctaButton') as Partial<CtaButtonAttrs>) : {};
    const lineAlign = ed.getAttributes('paragraph').textAlign as string | undefined;
    const align: CtaAlign = lineAlign === 'center' || lineAlign === 'right' ? lineAlign : 'left';
    setCtaDialog({ editing, attrs: { ...DEFAULT_CTA, ...prev }, align });
  }, []);
  const openFaq = useCallback((editing: boolean) => {
    const ed = editorRef.current;
    if (!ed) return;
    const prev = editing ? ((ed.getAttributes('faqSection').items as FaqEntry[] | undefined) ?? []) : [];
    const items = prev.length > 0 ? prev.map((e) => newFaqDraft(e)) : [newFaqDraft()];
    setFaqDialog({ editing, items });
  }, []);
  // The editor config (and the FAQ NodeView) are created once, so they reach
  // the current openers through a ref.
  const openersRef = useRef({ openCta, openFaq });
  openersRef.current = { openCta, openFaq };

  const saveCta = () => {
    const ed = editorRef.current;
    if (!ed || !ctaDialog) return;
    const label = ctaDialog.attrs.label.trim();
    const href = ctaDialog.attrs.href.trim();
    if (!label || !href) {
      toast.error('The button needs both a label and a URL');
      return;
    }
    const attrs = { ...ctaDialog.attrs, label, href };
    // Alignment belongs to the line the button sits on, so several buttons on
    // one line always agree.
    if (ctaDialog.editing) ed.chain().focus().updateCtaButton(attrs).setTextAlign(ctaDialog.align).run();
    else ed.chain().focus().setCtaButton(attrs).setTextAlign(ctaDialog.align).run();
    setCtaDialog(null);
  };

  const patchFaq = (id: number, patch: Partial<FaqEntry>) =>
    setFaqDialog((d) => (d ? { ...d, items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) } : d));
  const moveFaq = (index: number, dir: -1 | 1) =>
    setFaqDialog((d) => {
      if (!d) return d;
      const target = index + dir;
      if (target < 0 || target >= d.items.length) return d;
      const items = [...d.items];
      const [row] = items.splice(index, 1);
      if (row) items.splice(target, 0, row);
      return { ...d, items };
    });

  const saveFaq = () => {
    const ed = editorRef.current;
    if (!ed || !faqDialog) return;
    // Rows left completely blank are dropped; a half-filled row is a mistake.
    const rows = faqDialog.items.filter((it) => it.question.trim() || hasText(it.answer));
    const bad = rows.findIndex((it) => !it.question.trim() || !hasText(it.answer));
    if (bad !== -1) {
      toast.error(`Question ${bad + 1} needs both a question and an answer`);
      return;
    }
    if (rows.length === 0) {
      toast.error('Add at least one question');
      return;
    }
    const items: FaqEntry[] = rows.map((it) => ({ question: it.question.trim(), answer: it.answer }));
    if (faqDialog.editing) ed.chain().focus().updateFaqSection({ items }).run();
    else ed.chain().focus().setFaqSection({ items }).run();
    setFaqDialog(null);
  };

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
      CtaButton,
      FaqSection.configure({ onEdit: () => openersRef.current.openFaq(true) }),
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
      // The button is a real <a href> inside a non-editable atom, so a click
      // would follow the link. Cancel navigation but let ProseMirror keep
      // handling the click (it selects the button).
      handleDOMEvents: {
        click: (_view, event) => {
          if ((event.target as HTMLElement | null)?.closest?.('a[data-cta-button]')) event.preventDefault();
          return false;
        },
      },
      // Double-click a button block to edit it (the first click of the pair
      // already selected it). The FAQ section handles its own double-click.
      handleDoubleClickOn: (_view, _pos, node) => {
        if (node.type.name === 'ctaButton') {
          openersRef.current.openCta(true);
          return true;
        }
        return false;
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
        <Toolbar
          editor={editor}
          minimal={minimal}
          uploading={uploading}
          onImage={() => fileRef.current?.click()}
          onLibrary={() => setLibraryOpen(true)}
          onInsertButton={() => openCta(false)}
          onEditButton={() => openCta(true)}
          onInsertFaq={() => openFaq(false)}
          onEditFaq={() => openFaq(true)}
        />
        <EditorContent editor={editor} />
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
      </div>

      {/* Reuse an image that's already in Spaces instead of uploading a duplicate. */}
      {libraryOpen && (
        <MediaLibraryModal
          multiple={false}
          title="Insert image from media library"
          onClose={() => setLibraryOpen(false)}
          onConfirm={([picked]) => {
            if (picked) editor.chain().focus().setImage({ src: picked.url, alt: picked.altText ?? '' }).run();
          }}
        />
      )}

      {/* Button dialog */}
      <Dialog open={!!ctaDialog} onOpenChange={(open) => !open && setCtaDialog(null)}>
        {ctaDialog && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{ctaDialog.editing ? 'Edit button' : 'Insert button'}</DialogTitle>
              <DialogDescription>
                A call-to-action link styled as a button. Insert several in a row for buttons side by side, or press Enter first for a new line.
              </DialogDescription>
            </DialogHeader>
            <div
              className="space-y-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                  e.preventDefault();
                  saveCta();
                }
              }}
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Button text</label>
                <Input
                  autoFocus
                  value={ctaDialog.attrs.label}
                  onChange={(e) => setCtaDialog({ ...ctaDialog, attrs: { ...ctaDialog.attrs, label: e.target.value } })}
                  placeholder="Shop gifts by budget"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">URL</label>
                <Input
                  value={ctaDialog.attrs.href}
                  onChange={(e) => setCtaDialog({ ...ctaDialog, attrs: { ...ctaDialog.attrs, href: e.target.value } })}
                  placeholder="https://givoo.in/curated-packs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Style</label>
                  <select
                    value={ctaDialog.attrs.variant}
                    onChange={(e) =>
                      setCtaDialog({ ...ctaDialog, attrs: { ...ctaDialog.attrs, variant: e.target.value as CtaButtonAttrs['variant'] } })
                    }
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                  >
                    <option value="primary">Solid</option>
                    <option value="outline">Outline</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Align line</label>
                  <select
                    value={ctaDialog.align}
                    onChange={(e) => setCtaDialog({ ...ctaDialog, align: e.target.value as CtaAlign })}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                  >
                    <option value="left">Left</option>
                    <option value="center">Centre</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={ctaDialog.attrs.newTab}
                  onChange={(e) => setCtaDialog({ ...ctaDialog, attrs: { ...ctaDialog.attrs, newTab: e.target.checked } })}
                />
                Open in a new tab
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCtaDialog(null)}>Cancel</Button>
              <Button type="button" onClick={saveCta}>{ctaDialog.editing ? 'Update button' : 'Insert button'}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* FAQ section dialog — every question for the block, edited together. */}
      <Dialog open={!!faqDialog} onOpenChange={(open) => !open && setFaqDialog(null)}>
        {faqDialog && (
          <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{faqDialog.editing ? 'Edit FAQ section' : 'Insert FAQ section'}</DialogTitle>
              <DialogDescription>
                Add every question here. On the post they appear as collapsible questions and are added to the FAQ schema automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-1">
              {faqDialog.items.map((it, i) => (
                <div key={it.id} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Question {i + 1}</span>
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => moveFaq(i, -1)} disabled={i === 0} title="Move up"
                        className="rounded-md p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => moveFaq(i, 1)} disabled={i === faqDialog.items.length - 1} title="Move down"
                        className="rounded-md p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button type="button" title="Remove question"
                        onClick={() => setFaqDialog((d) => (d ? { ...d, items: d.items.filter((x) => x.id !== it.id) } : d))}
                        className="rounded-md p-1 text-gray-500 hover:bg-red-50 hover:text-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <Input
                    autoFocus={i === faqDialog.items.length - 1 && !it.question}
                    value={it.question}
                    onChange={(e) => patchFaq(it.id, { question: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                    placeholder="What is the best farewell gift for a boss?"
                    className="bg-white"
                  />
                  <div className="mt-2">
                    <RichTextEditor
                      minimal
                      compact
                      normalizeEmpty
                      minHeight={90}
                      placeholder="Write the answer…"
                      value={it.answer}
                      onChange={(html) => patchFaq(it.id, { answer: html })}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setFaqDialog((d) => (d ? { ...d, items: [...d.items, newFaqDraft()] } : d))}
              >
                <Plus className="h-4 w-4" />
                Add another question
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFaqDialog(null)}>Cancel</Button>
              <Button type="button" onClick={saveFaq}>
                {faqDialog.editing ? 'Update FAQ section' : 'Insert FAQ section'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </CompactContext.Provider>
  );
}
