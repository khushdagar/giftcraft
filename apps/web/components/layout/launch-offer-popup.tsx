"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "givoo_launch_offer_seen";
const DELAY_MS = 3000;
const OFFER_CODE = "LAUNCH10";

export function LaunchOfferPopup() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // Private mode / storage blocked — still show the offer once per page.
    }
    const t = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  // Escape to close + lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(OFFER_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — code is visible on screen anyway */
    }
  }

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={dismiss}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-offer-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] overflow-hidden rounded-md bg-white shadow-float animate-scale-in"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close offer"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="bg-dark px-7 pb-8 pt-9 text-center text-inv">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
            Special Launch Offer
          </span>
          <h2 id="launch-offer-title" className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white">
            Flat 10% off your
            <br />
            first bulk order
          </h2>
          <p className="mx-auto mt-3 max-w-[300px] text-[13px] leading-relaxed text-white/70">
            Launch pricing on every curated gift pack. Transparent quotes, no
            hidden branding charges.
          </p>
        </div>

        <div className="px-7 pb-8 pt-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3">
            Use code
          </p>
          <button
            type="button"
            onClick={copyCode}
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-dashed border-ink/25 px-5 py-2.5 text-lg font-semibold tracking-[0.15em] text-ink transition hover:border-em hover:text-em"
          >
            {OFFER_CODE}
            <span className="text-[11px] font-medium tracking-normal text-ink-3">
              {copied ? "Copied!" : "Tap to copy"}
            </span>
          </button>

          <Link href="/catalog" onClick={dismiss} className="btn-em mt-5 w-full">
            Shop Now
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 text-[12px] text-ink-3 underline-offset-2 transition hover:text-ink hover:underline"
          >
            No thanks, maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
