'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichTextField } from '@/components/admin/rich-text-field';
import { Plus, Trash2 } from 'lucide-react';

export interface FaqEntry {
  question: string;
  answer: string;
}

interface FaqRepeaterFieldProps {
  value: FaqEntry[];
  onChange: (faqs: FaqEntry[]) => void;
  /** Spaces folder for any images pasted into an answer. */
  uploadFolder?: string;
}

/**
 * Ordered question/answer pairs for a collection page's FAQ section — shown
 * to visitors and emitted as FAQPage JSON-LD. Blank rows are dropped on save,
 * so a half-filled row left behind is harmless.
 */
export function FaqRepeaterField({ value, onChange, uploadFolder = 'faqs' }: FaqRepeaterFieldProps) {
  const update = (index: number, patch: Partial<FaqEntry>) => {
    onChange(value.map((faq, i) => (i === index ? { ...faq, ...patch } : faq)));
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...value, { question: '', answer: '' }]);
  };

  return (
    <div className="space-y-3">
      {value.map((faq, i) => (
        <div key={i} className="rounded-lg border border-bdr p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Input
                value={faq.question}
                onChange={(e) => update(i, { question: e.target.value })}
                placeholder="Question"
              />
              <RichTextField
                value={faq.answer}
                onChange={(html) => update(i, { answer: html })}
                placeholder="Answer — bold, links etc. are supported"
                minHeight={90}
                uploadFolder={uploadFolder}
              />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="mt-1 rounded-md p-1.5 text-ink-3 transition hover:bg-rose-50 hover:text-rose-600"
              aria-label="Remove FAQ"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="gap-1.5">
        <Plus className="h-4 w-4" /> Add FAQ
      </Button>
    </div>
  );
}
