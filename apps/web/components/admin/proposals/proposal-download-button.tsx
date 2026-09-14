'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { downloadImagesStaggered, triggerDownload } from '@/lib/generated-image-download';

/** Downloads a sent proposal's deck PDF, followed by each pack's AI image. */
export function ProposalDownloadButton({
  proposalToken,
  images,
}: {
  proposalToken: string;
  images: { url: string; label: string }[];
}) {
  const [started, setStarted] = useState(false);

  const handleClick = () => {
    triggerDownload(`/api/proposals/${proposalToken}/deck`);
    downloadImagesStaggered(images);
    // The deck renders server-side for a few seconds before the file arrives.
    setStarted(true);
    setTimeout(() => setStarted(false), 5000);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={started}
      title={images.length > 0 ? 'Download the proposal PDF and its AI pack images' : 'Download the proposal PDF'}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
    >
      {started ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {images.length > 0 ? `PDF + ${images.length} image${images.length === 1 ? '' : 's'}` : 'PDF'}
    </button>
  );
}
