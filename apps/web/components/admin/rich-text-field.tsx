'use client';

import { RichTextEditor } from '@/components/admin/rich-text-editor';

/**
 * Rich-text editor bound to a single string value (HTML), sized to sit inline in
 * a form. Designed to drop into react-hook-form via <Controller>. Emits '' for
 * empty content so we never store a stray "<p></p>".
 *
 * A thin preset over <RichTextEditor> — same toolbar and same output as the blog
 * and offer composers, just a denser chrome.
 */
interface RichTextFieldProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum editing-area height in px. Defaults to 120. */
  minHeight?: number;
  /** Spaces folder that pasted/uploaded images land in. */
  uploadFolder?: string;
}

export function RichTextField({
  value,
  onChange,
  placeholder,
  minHeight = 120,
  uploadFolder = 'content',
}: RichTextFieldProps) {
  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? 'Write here…'}
      minHeight={minHeight}
      uploadFolder={uploadFolder}
      compact
      normalizeEmpty
      containerClassName="rounded-lg border-gray-300"
    />
  );
}
