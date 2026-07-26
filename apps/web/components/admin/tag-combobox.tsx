'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Check } from 'lucide-react';

/**
 * Shopify-style tag input: selected tags show as removable pills, and typing
 * opens a dropdown of matching suggestions. If the typed value isn't an existing
 * suggestion, an "Add '<value>'" row lets the admin create it on the spot.
 */
interface TagComboboxProps {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  /** Lowercase newly-created tags (existing suggestions keep their case). */
  lowercaseNew?: boolean;
  /** Allow creating tags that aren't in `suggestions`. Default true. */
  allowCreate?: boolean;
}

export function TagCombobox({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Search or add a tag…',
  lowercaseNew = false,
  allowCreate = true,
}: TagComboboxProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside the widget.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = input.trim();
  const filtered = useMemo(
    () =>
      suggestions.filter(
        (s) => !value.includes(s) && s.toLowerCase().includes(q.toLowerCase())
      ),
    [suggestions, value, q]
  );

  const exists =
    q.length > 0 &&
    (suggestions.some((s) => s.toLowerCase() === q.toLowerCase()) ||
      value.some((v) => v.toLowerCase() === q.toLowerCase()));
  const showCreate = allowCreate && q.length > 0 && !exists;

  const addTag = (tag: string) => {
    const clean = (lowercaseNew ? tag.toLowerCase() : tag).trim();
    if (!clean) return;
    if (!value.some((v) => v.toLowerCase() === clean.toLowerCase())) {
      onChange([...value, clean]);
    }
    setInput('');
    setHighlight(0);
  };

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  // Options list = matching suggestions, then the "create" row if applicable.
  const options: Array<{ type: 'suggestion' | 'create'; label: string }> = [
    ...filtered.map((s) => ({ type: 'suggestion' as const, label: s })),
    ...(showCreate ? [{ type: 'create' as const, label: q }] : []),
  ];

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = options[highlight] ?? options[0];
      if (opt) addTag(opt.label);
      else if (q) addTag(q);
    } else if (e.key === 'Backspace' && !input && value.length) {
      const last = value[value.length - 1];
      if (last) removeTag(last);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Selected pills + input */}
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 focus-within:border-gray-400"
        onClick={() => setOpen(true)}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-2.5 pr-1 text-sm text-gray-800"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-gray-400"
        />
      </div>

      {/* Dropdown */}
      {open && options.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((opt, i) => (
            <button
              key={`${opt.type}-${opt.label}`}
              type="button"
              onMouseEnter={() => setHighlight(i)}
              onClick={() => addTag(opt.label)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                i === highlight ? 'bg-gray-100' : ''
              }`}
            >
              {opt.type === 'create' ? (
                <>
                  <Plus className="h-3.5 w-3.5 text-gray-500" />
                  <span>
                    Add <span className="font-medium">&ldquo;{opt.label}&rdquo;</span>
                  </span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 text-transparent" />
                  <span>{opt.label}</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
