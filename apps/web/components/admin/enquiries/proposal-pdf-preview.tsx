'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Download, FileText } from 'lucide-react';

/**
 * Previews the proposal deck inside the admin panel.
 *
 * The deck route serves the PDF as an attachment (that is what the email needs),
 * so a plain link would download rather than preview. Fetching it as a blob and
 * pointing the iframe at an object URL renders it in place instead.
 */
export function ProposalPdfPreview({
  token,
  proposalToken,
  title,
  open,
  onClose,
}: {
  token: string;
  /**
   * Set for proposals that carry pack options — previews the SAME combined deck
   * the lead was emailed (comparison slide + every pack). Falls back to the
   * single-quote deck for proposals sent before multi-pack existed.
   */
  proposalToken?: string | null;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deckUrl = proposalToken
    ? `/api/proposals/${proposalToken}/deck`
    : `/api/quotes/${token}/deck`;
  const livePageUrl = proposalToken ? `/proposal/${proposalToken}` : `/quote/${token}`;

  useEffect(() => {
    if (!open) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    setUrl(null);
    setError(null);

    (async () => {
      try {
        const res = await fetch(deckUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error('Could not load the proposal PDF');
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the PDF');
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, deckUrl]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-gray-500" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="h-[70vh] overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-gray-600">{error}</p>
              <a
                href={deckUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-emerald-700 hover:underline"
              >
                Download it instead
              </a>
            </div>
          ) : url ? (
            <iframe src={url} title={title} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Building the proposal PDF…
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <a
            href={livePageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-gray-500 hover:text-gray-900 hover:underline"
          >
            {proposalToken ? 'Open the live proposal page' : 'Open the live quote page'}
          </a>
          {url && (
            <a
              href={url}
              download={`givoo-proposal-${proposalToken || token}.pdf`}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
