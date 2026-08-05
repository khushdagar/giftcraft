"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import {
  collectErrors,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from "@/lib/validation";

export function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const validate = (data: typeof form) =>
    collectErrors({
      name: validateName(data.name, "Full name"),
      email: validateEmail(data.email),
      phone: validatePhone(data.phone),
      password: validatePassword(data.password),
    });

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
    setFieldErrors((p) => ({ ...p, [key]: undefined }));
  };

  const blur = (key: keyof typeof form) => () => {
    setFieldErrors((p) => ({ ...p, [key]: validate(form)[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Failed to create account.");
        return;
      }

      // Account created — sign the user straight in with their new credentials.
      const signInRes = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (!signInRes || signInRes.error) {
        // Account exists but auto-login failed — send them to login.
        router.push("/login");
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
        <label htmlFor="name" className="mb-1.5 block text-sm font-normal text-ink">
          Full name
        </label>
        <Input
          id="name"
          autoComplete="name"
          maxLength={100}
          value={form.name}
          onChange={update("name")}
          onBlur={blur("name")}
          aria-invalid={!!fieldErrors.name}
          className={fieldErrors.name ? "border-red-400" : ""}
          placeholder="Your Name"
          required
        />
        <FieldError message={fieldErrors.name} />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-normal text-ink">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update("email")}
          onBlur={blur("email")}
          aria-invalid={!!fieldErrors.email}
          className={fieldErrors.email ? "border-red-400" : ""}
          placeholder="you@company.com"
          required
        />
        <FieldError message={fieldErrors.email} />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-normal text-ink">
          Mobile number
        </label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={14}
          value={form.phone}
          onChange={(e) => {
            const value = e.target.value.replace(/[^\d+\s-]/g, "");
            setForm((p) => ({ ...p, phone: value }));
            setFieldErrors((p) => ({ ...p, phone: undefined }));
          }}
          onBlur={blur("phone")}
          aria-invalid={!!fieldErrors.phone}
          className={fieldErrors.phone ? "border-red-400" : ""}
          placeholder="Enter Phone Number"
          required
        />
        <FieldError message={fieldErrors.phone} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-normal text-ink">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          onBlur={blur("password")}
          aria-invalid={!!fieldErrors.password}
          className={fieldErrors.password ? "border-red-400" : ""}
          placeholder="At least 8 characters, with a number"
          minLength={8}
          required
        />
        <FieldError message={fieldErrors.password} />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <Button type="submit" size="xl" disabled={loading} className="w-full rounded-2xl bg-em font-normal text-white hover:bg-em-600">
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
