'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

/** What the download bar says at each stage (see lib/catalogue-progress). */
const PDF_STAGE_LABELS: Record<string, string> = {
  queued: 'Starting…',
  images: 'Loading product photos…',
  layout: 'Laying out pages…',
  done: 'Finishing up…',
  receiving: 'Downloading…',
};

export interface CatalogueDownloadProgress {
  /** Which download is running — the catalogue id, or a caller-chosen key. */
  key: string;
  /** Shown above the bar, e.g. the catalogue title. */
  title: string;
  pct: number;
  label: string;
}

/**
 * Downloads a catalogue PDF with a live percentage.
 *
 * 0–60% images and 60–90% layout are reported by the server and polled here;
 * 90–100% is the file arriving. The layout pass blocks the server, so polls go
 * unanswered during it and the bar eases forward on its own.
 */
export function useCatalogueDownload() {
  const [progress, setProgress] = useState<CatalogueDownloadProgress | null>(null);
  const busy = useRef(false);

  const start = useCallback(async (key: string, title: string, pdfUrl: string) => {
    if (busy.current) return;
    busy.current = true;

    const token = crypto.randomUUID();
    let pct = 0;
    let stage = 'queued';
    const show = (next: number, label: string) => {
      pct = Math.max(pct, Math.min(next, 100));
      setProgress({ key, title, pct: Math.round(pct), label });
    };
    show(1, PDF_STAGE_LABELS.queued!);

    let pollInFlight = false;
    const ticker = setInterval(() => {
      if (stage === 'layout') show(pct + (89 - pct) * 0.04, PDF_STAGE_LABELS.layout!);
      if (pollInFlight) return;
      pollInFlight = true;
      fetch(`/api/admin/catalogues/progress?token=${token}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const p = d?.progress as { pct: number; stage: string } | null | undefined;
          if (!p || stage === 'receiving') return;
          stage = p.stage;
          show(p.pct, PDF_STAGE_LABELS[p.stage] ?? PDF_STAGE_LABELS.queued!);
        })
        .catch(() => {})
        .finally(() => {
          pollInFlight = false;
        });
    }, 500);

    try {
      const res = await fetch(`${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}progress=${token}`);
      if (!res.ok || !res.body) {
        throw new Error(
          res.status === 422
            ? await res.text()
            : 'Could not generate the PDF. Please try again in a minute.'
        );
      }
      stage = 'receiving';
      clearInterval(ticker);
      show(90, PDF_STAGE_LABELS.receiving!);

      const total = Number(res.headers.get('Content-Length')) || 0;
      const reader = res.body.getReader();
      const chunks: BlobPart[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) show(90 + (received / total) * 10, PDF_STAGE_LABELS.receiving!);
      }
      show(100, 'Done');

      const name =
        /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] ||
        'givoo-catalogue.pdf';
      const url = URL.createObjectURL(new Blob(chunks, { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success('Catalogue downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not download the PDF');
    } finally {
      clearInterval(ticker);
      // Leave the full bar on screen for a beat before it slides away.
      setTimeout(() => {
        busy.current = false;
        setProgress(null);
      }, 900);
    }
  }, []);

  return { progress, start };
}
