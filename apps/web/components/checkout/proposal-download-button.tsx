'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { validateEmail, validateName, validatePhone } from '@/lib/validation';

// Remembered guest details so a returning visitor isn't asked twice.
const LEAD_STORAGE_KEY = 'givoo-proposal-lead';

interface LeadDetails {
  name: string;
  email: string;
  phone: string;
  company: string;
}

interface Props {
  // The live quote being checked out. Omitted once the order exists.
  quoteToken?: string;
  // A placed order — the deck is rebuilt from the order instead of the quote,
  // so buyers/admins can still download it after confirmation.
  orderId?: string;
  // Anything the visitor already typed in the checkout forms — used to
  // prefill the dialog so guests rarely have to type twice.
  prefill?: Partial<LeadDetails>;
  // Style variant: the checkout uses the outline pill, order pages sit next to
  // the invoice link and use the same compact outline button.
  className?: string;
  label?: string;
}

function readSavedLead(): Partial<LeadDetails> {
  try {
    return JSON.parse(localStorage.getItem(LEAD_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * "Download Proposal Deck" with download tracking. Logged-in users download
 * immediately (identity logged server-side from their session). Guests get a
 * one-time details dialog (name/email/phone/company) before the PDF starts.
 */
export function ProposalDownloadButton({
  quoteToken,
  orderId,
  prefill,
  className,
  label,
}: Props) {
  // Order decks are behind session auth, so there is nothing to ask a guest for.
  const deckUrl = orderId
    ? `/api/orders/${orderId}/deck`
    : `/api/quotes/${quoteToken}/deck`;
  // The download log keys on a quote token; order downloads are tagged so they
  // stay distinguishable in /admin.
  const logToken = orderId ? `order:${orderId}` : quoteToken || '';

  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // 0 = idle, 1-100 = deck is being prepared/downloaded (drives the button fill).
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState<LeadDetails>({
    name: '',
    email: '',
    phone: '',
    company: '',
  });

  // The fill is animated on rAF rather than by CSS transitions: `target` is
  // where the real download is, `shown` chases it a percent at a time so the
  // bar always sweeps smoothly instead of jumping between chunk sizes.
  const target = useRef(0);
  const shown = useRef(0);
  const raf = useRef<number | undefined>(undefined);
  // Resolves once the fill has visually reached 100% — the save is held back
  // until then so the animation always completes.
  const settled = useRef<(() => void) | null>(null);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const animate = () => {
    if (raf.current) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      // Below 100 the target drifts upward on its own, so the fill keeps
      // moving even while the server is still building the PDF.
      if (target.current < 90) target.current += (90 - target.current) * 0.55 * dt;

      const gap = target.current - shown.current;
      if (gap > 0.05) {
        // Percent-per-second: quicker the further behind it is, but capped so a
        // fast response still plays the full sweep instead of snapping.
        const rate = reduced ? 10000 : Math.min(Math.max(gap * 3.5, 14), 85);
        shown.current = Math.min(target.current, shown.current + rate * dt);
        setProgress(shown.current);
      }

      if (shown.current >= 99.95 && settled.current) {
        const done = settled.current;
        settled.current = null;
        done();
      }

      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  };

  const stopAnimation = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = undefined;
    settled.current = null;
    target.current = 0;
    shown.current = 0;
  };

  // Fetches the deck instead of navigating to it, so the button can show real
  // progress (or a smooth estimate when the server streams without a length).
  const startDownload = async () => {
    target.current = 6;
    shown.current = 0;
    setProgress(0.1);
    animate();
    try {
      const res = await fetch(deckUrl);
      if (!res.ok) throw new Error('deck request failed');

      const total = Number(res.headers.get('content-length')) || 0;
      let blob: Blob;

      if (total && res.body) {
        const reader = res.body.getReader();
        const chunks: BlobPart[] = [];
        let loaded = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          target.current = Math.max(target.current, Math.min(97, (loaded / total) * 100));
        }
        blob = new Blob(chunks, { type: res.headers.get('content-type') || 'application/pdf' });
      } else {
        blob = await res.blob();
      }

      const disposition = res.headers.get('content-disposition') || '';
      const named = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
      const url = URL.createObjectURL(blob);

      // Let the fill run all the way to the right edge before saving.
      target.current = 100;
      await new Promise<void>((resolve) => {
        settled.current = resolve;
      });
      setProgress(100);

      const a = document.createElement('a');
      a.href = url;
      a.download = named && named[1] ? decodeURIComponent(named[1]) : 'givoo-proposal-deck.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Hold the full bar for a beat so "Downloaded" is readable, then reset.
      setTimeout(() => {
        URL.revokeObjectURL(url);
        stopAnimation();
        setProgress(0);
      }, 700);
    } catch {
      stopAnimation();
      setProgress(0);
      setError('Could not prepare the deck. Please try again.');
      throw new Error('download failed');
    }
  };

  const logDownload = (details?: Partial<LeadDetails>) =>
    fetch('/api/proposal-downloads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteToken: logToken, ...details }),
    }).catch(() => null);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      // Order decks require a session anyway — never show the lead dialog.
      if (status === 'authenticated' || orderId) {
        await logDownload();
        await startDownload();
        return;
      }

      const saved = readSavedLead();
      if (saved.name && saved.email && saved.phone) {
        await logDownload(saved);
        await startDownload();
        return;
      }

      // First-time guest → collect details, prefilled from saved values and
      // whatever they already typed into the checkout forms.
      setForm({
        name: saved.name || prefill?.name || '',
        email: saved.email || prefill?.email || '',
        phone: saved.phone || prefill?.phone || '',
        company: saved.company || prefill?.company || '',
      });
      setOpen(true);
    } catch {
      /* startDownload already surfaced the message */
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const problem =
      validateName(name, 'Your name') || validateEmail(email) || validatePhone(phone);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const details = { name, email, phone, company: form.company.trim() };
      await logDownload(details);
      try {
        localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(details));
      } catch {
        /* storage unavailable — they'll just be asked again next time */
      }
      // Stay open while the deck builds so the fill animation is visible, then
      // close once the file has actually started saving.
      await startDownload();
      setOpen(false);
    } catch {
      /* startDownload already surfaced the message */
    } finally {
      setBusy(false);
    }
  };

  const downloading = progress > 0;
  const mainLabel = downloading
    ? progress >= 100
      ? 'Downloaded'
      : 'Preparing deck…'
    : label || 'Download Proposal Deck';
  const dialogLabel = downloading
    ? progress >= 100
      ? 'Downloaded'
      : 'Preparing deck…'
    : busy
      ? 'Starting download…'
      : 'Download Deck';

  const inputClass =
    'w-full rounded-xl border border-[#E5E5DF] bg-white px-4 py-2.5 text-sm text-[#222222] placeholder:text-[#A3A39B] focus:outline-none focus:border-[#222222] transition';

  return (
    <>
      <div className="shrink-0">
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          aria-busy={downloading}
          className={
            className ||
            'relative overflow-hidden w-full inline-flex items-center justify-center rounded-full border border-[#222222] px-5 py-2.5 text-sm font-medium text-[#222222] transition hover:bg-[#222222] hover:text-[#F5F1EB] disabled:cursor-default disabled:opacity-100 disabled:hover:bg-transparent disabled:hover:text-[#222222]'
          }
        >
          <span>{mainLabel}</span>
          {downloading && (
            <span
              aria-hidden
              style={{ clipPath: `inset(0 ${100 - progress}% 0 0)`, willChange: 'clip-path' }}
              className="absolute inset-0 flex items-center justify-center bg-[#222222] text-[#F5F1EB]"
            >
              {mainLabel}
            </span>
          )}
        </button>
        {error && !open && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Almost there</DialogTitle>
            <DialogDescription>
              Tell us who you are and the proposal deck will download right away.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name *"
              className={inputClass}
              autoFocus
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Work email *"
              className={inputClass}
            />
            <input
              type="tel"
              inputMode="tel"
              maxLength={14}
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value.replace(/[^\d+\s-]/g, '') })
              }
              placeholder="Phone *"
              className={inputClass}
            />
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company (optional)"
              className={inputClass}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              aria-busy={downloading}
              className="relative overflow-hidden w-full rounded-full bg-[#222222] px-5 py-3 text-sm font-medium text-[#F5F1EB] transition hover:opacity-90 disabled:cursor-default disabled:opacity-100"
            >
              <span>{dialogLabel}</span>
              {downloading && (
                <span
                  aria-hidden
                  style={{ clipPath: `inset(0 ${100 - progress}% 0 0)`, willChange: 'clip-path' }}
                  className="absolute inset-0 flex items-center justify-center bg-[#F5F1EB] text-[#222222]"
                >
                  {dialogLabel}
                </span>
              )}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
