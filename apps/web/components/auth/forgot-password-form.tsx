"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import { validateEmail } from "@/lib/validation";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailProblem = validateEmail(email);
    setEmailError(emailProblem);
    if (emailProblem) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="mt-6 rounded-md border border-bdr bg-canvas p-5">
        <p className="text-sm font-normal text-ink">Check your inbox</p>
        <p className="mt-1.5 text-sm text-ink-2">
          If an account exists for <span className="font-normal text-ink">{email}</span>, we&apos;ve
          sent a password reset link. It&apos;s valid for 1 hour — check spam if you don&apos;t see it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-normal text-ink">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(null);
          }}
          onBlur={() => setEmailError(validateEmail(email))}
          aria-invalid={!!emailError}
          className={emailError ? "border-red-400" : ""}
          placeholder="you@company.com"
          required
        />
        <FieldError message={emailError ?? undefined} />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <Button
        type="submit"
        size="xl"
        disabled={loading}
        className="w-full rounded-2xl bg-em font-normal text-white hover:bg-em-600"
      >
        {loading ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
