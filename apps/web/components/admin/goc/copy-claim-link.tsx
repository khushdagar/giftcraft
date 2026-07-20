'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

export function CopyClaimLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — user can still select the text */
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-lg bg-canvas border border-bdr px-3 py-2 text-sm text-ink">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-em px-3 py-2 text-sm font-medium text-white hover:bg-em-600 transition"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-bdr px-3 py-2 text-sm text-ink hover:border-em transition"
      >
        <ExternalLink className="h-4 w-4" />
        Open
      </a>
    </div>
  );
}
