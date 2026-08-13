"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";

// Mirrors the register/reset API rules so users aren't rejected server-side.
function validateNewPassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
    return "Password must contain both letters and a number";
  return null;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const passwordProblem = validateNewPassword(password);
    const confirmProblem = confirm === password ? null : "Passwords don't match";
    setPasswordError(passwordProblem);
    setConfirmError(confirmProblem);
    if (passwordProblem || confirmProblem) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mt-6 rounded-md border border-bdr bg-canvas p-5">
        <p className="text-sm font-normal text-ink">Password updated</p>
        <p className="mt-1.5 text-sm text-ink-2">
          Your password has been changed. Taking you to sign in…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-normal text-ink">
          New password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordError(null);
          }}
          onBlur={() => setPasswordError(validateNewPassword(password))}
          aria-invalid={!!passwordError}
          className={passwordError ? "border-red-400" : ""}
          placeholder="At least 8 characters, letters & a number"
          required
        />
        <FieldError message={passwordError ?? undefined} />
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-normal text-ink">
          Confirm new password
        </label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setConfirmError(null);
          }}
          aria-invalid={!!confirmError}
          className={confirmError ? "border-red-400" : ""}
          placeholder="••••••••"
          required
        />
        <FieldError message={confirmError ?? undefined} />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <Button
        type="submit"
        size="xl"
        disabled={loading}
        className="w-full rounded-2xl bg-em font-normal text-white hover:bg-em-600"
      >
        {loading ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}
