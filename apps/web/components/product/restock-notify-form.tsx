'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

/**
 * Small inline "notify me when back in stock" form shown in place of a pack
 * member's picker once that product has gone out of stock (draft/archived).
 */
export function RestockNotifyForm({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/restock-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, productName, email }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <span className="flex h-9 items-center gap-1.5 text-xs font-medium text-em">
        <CheckCircle2 className="h-3.5 w-3.5" />
        We&apos;ll email you
      </span>
    );
  }

  return (
    <form onSubmit={submit} className="flex h-9 items-center gap-1.5">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        aria-label={`Email for restock notification — ${productName}`}
        className="h-9 w-32 min-w-0 rounded-md border border-bdr bg-white px-2 text-xs text-ink focus:border-em focus:outline-none sm:w-36"
      />
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="flex h-9 flex-shrink-0 items-center rounded-md bg-ink px-2.5 text-xs font-semibold text-white transition hover:bg-ink/90 disabled:opacity-60"
      >
        {status === 'submitting' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Notify me'}
      </button>
      {status === 'error' && (
        <span className="text-[10px] text-error">Failed — try again</span>
      )}
    </form>
  );
}
