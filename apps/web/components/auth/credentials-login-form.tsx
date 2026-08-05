"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import { validateEmail, validateRequired } from "@/lib/validation";

export function CredentialsLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Login only checks shape — never password strength, which would leak rules
  // and block users with older passwords.
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailProblem = validateEmail(email);
    const passwordProblem = validateRequired(password, "Password");
    setEmailError(emailProblem);
    setPasswordError(passwordProblem);
    if (emailProblem || passwordProblem) return;

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        setError("Invalid email or password.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-normal text-ink">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordError(null);
          }}
          aria-invalid={!!passwordError}
          className={passwordError ? "border-red-400" : ""}
          placeholder="••••••••"
          required
        />
        <FieldError message={passwordError ?? undefined} />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <Button
        type="submit"
        size="xl"
        disabled={loading}
        className="w-full rounded-2xl bg-em font-normal text-white hover:bg-em-600"
      >
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
