"use client";

import { useEffect, useState } from "react";
import {
  collectErrors,
  validateEmail,
  validateName,
  validateNumber,
  validatePhone,
} from "@/lib/validation";
import { FieldError, inputClass } from "@/components/ui/field-error";

// Bumped key: visitors who dismissed the old coupon popup should still see the
// new enquiry form once.
const STORAGE_KEY = "givoo_enquiry_popup_seen";
const DELAY_MS = 3000;

const EMPTY_FORM = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  quantity: "",
};

export function LaunchOfferPopup() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof typeof EMPTY_FORM, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // Private mode / storage blocked — still show the popup once per page.
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

  const validate = (data: typeof EMPTY_FORM) =>
    collectErrors({
      companyName: validateName(data.companyName, "Company name"),
      contactName: validateName(data.contactName, "Your name"),
      email: validateEmail(data.email),
      phone: validatePhone(data.phone),
      quantity: validateNumber(data.quantity, "Quantity", {
        required: false,
        min: 1,
        max: 1000000,
      }),
    });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors = validate(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: formData.companyName,
          contactName: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          quantity: formData.quantity || undefined,
          message: "Enquiry from homepage welcome popup",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Something went wrong. Please try again.");
      }
      setSubmitted(true);
      // Seen + submitted — never nag this visitor again.
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      setTimeout(() => setOpen(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit enquiry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={dismiss}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-popup-title"
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-[460px] overflow-y-auto rounded-md bg-white shadow-float animate-scale-in"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="bg-dark px-7 pb-6 pt-8 text-center text-inv">
          <span className="inline-block rounded-full bg-em px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
            Bulk Gifting Enquiry
          </span>
          <h2
            id="enquiry-popup-title"
            className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-white"
          >
            Planning corporate gifts?
          </h2>
        </div>

        <div className="px-7 pb-7 pt-5">
          {submitted ? (
            <div className="py-8 text-center">
              <p className="text-lg font-semibold text-em">Thank you! 🎉</p>
              <p className="mt-1 text-sm text-ink-2">
                Our gifting expert will reach out to you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Company *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                    aria-invalid={!!fieldErrors.companyName}
                    className={inputClass(fieldErrors.companyName)}
                    placeholder="TechCorp India"
                  />
                  <FieldError message={fieldErrors.companyName} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Your Name *</label>
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleChange}
                    required
                    aria-invalid={!!fieldErrors.contactName}
                    className={inputClass(fieldErrors.contactName)}
                    placeholder="Priya Sharma"
                  />
                  <FieldError message={fieldErrors.contactName} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    aria-invalid={!!fieldErrors.email}
                    className={inputClass(fieldErrors.email)}
                    placeholder="priya@techcorp.com"
                  />
                  <FieldError message={fieldErrors.email} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    aria-invalid={!!fieldErrors.phone}
                    className={inputClass(fieldErrors.phone)}
                    placeholder="+91 98765 43210"
                  />
                  <FieldError message={fieldErrors.phone} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-ink">
                    Approx. Quantity <span className="text-ink-3">(optional)</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min={1}
                    step={1}
                    value={formData.quantity}
                    onChange={handleChange}
                    aria-invalid={!!fieldErrors.quantity}
                    className={inputClass(fieldErrors.quantity)}
                    placeholder="250"
                  />
                  <FieldError message={fieldErrors.quantity} />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-em w-full disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Get My Free Quote"}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="w-full text-center text-[12px] text-ink-3 underline-offset-2 transition hover:text-ink hover:underline"
              >
                No thanks, I&apos;ll just browse
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
