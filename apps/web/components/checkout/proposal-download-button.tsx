'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Remembered guest details so a returning visitor isn't asked twice.
const LEAD_STORAGE_KEY = 'givoo-proposal-lead';

interface LeadDetails {
  name: string;
  email: string;
  phone: string;
  company: string;
}

interface Props {
  quoteToken: string;
  // Anything the visitor already typed in the checkout forms — used to
  // prefill the dialog so guests rarely have to type twice.
  prefill?: Partial<LeadDetails>;
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
export function ProposalDownloadButton({ quoteToken, prefill }: Props) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<LeadDetails>({
    name: '',
    email: '',
    phone: '',
    company: '',
  });

  const startDownload = () => {
    const a = document.createElement('a');
    a.href = `/api/quotes/${quoteToken}/deck`;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const logDownload = (details?: Partial<LeadDetails>) =>
    fetch('/api/proposal-downloads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteToken, ...details }),
    }).catch(() => null);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (status === 'authenticated') {
        await logDownload();
        startDownload();
        return;
      }

      const saved = readSavedLead();
      if (saved.name && saved.email && saved.phone) {
        await logDownload(saved);
        startDownload();
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
      setError('');
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!name || !email || !phone) {
      setError('Please fill in your name, email and phone.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
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
      setOpen(false);
      startDownload();
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#E5E5DF] bg-white px-4 py-2.5 text-sm text-[#222222] placeholder:text-[#A3A39B] focus:outline-none focus:border-[#222222] transition';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="shrink-0 inline-flex items-center justify-center rounded-full border border-[#222222] px-5 py-2.5 text-sm font-medium text-[#222222] hover:bg-[#222222] hover:text-[#F5F1EB] transition disabled:opacity-60"
      >
        {busy ? 'Preparing…' : 'Download Proposal Deck'}
      </button>

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
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
              className="w-full rounded-full bg-[#222222] px-5 py-3 text-sm font-medium text-[#F5F1EB] hover:opacity-90 transition disabled:opacity-60"
            >
              {busy ? 'Starting download…' : 'Download Deck'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
