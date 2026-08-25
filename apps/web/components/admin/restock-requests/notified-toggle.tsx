'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';

export function NotifiedToggle({ id, notified }: { id: string; notified: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState(notified);

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    startTransition(async () => {
      await fetch(`/api/admin/restock-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notified: next }),
      });
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-normal transition ${
        checked ? 'bg-em-50 text-em-700' : 'bg-recessed text-ink-2 hover:bg-elevated'
      }`}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        checked && <Check className="h-3 w-3" />
      )}
      {checked ? 'Notified' : 'Mark notified'}
    </button>
  );
}
