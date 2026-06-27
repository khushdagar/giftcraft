"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-normal text-ink">
          Full name
        </label>
        <Input id="name" autoComplete="name" value={form.name} onChange={update("name")} placeholder="Priya Sharma" required />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-normal text-ink">
          Email
        </label>
        <Input id="email" type="email" autoComplete="email" value={form.email} onChange={update("email")} placeholder="you@company.com" required />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-normal text-ink">
          Mobile number
        </label>
        <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={update("phone")} placeholder="+91 98765 43210" required />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-normal text-ink">
          Password
        </label>
        <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={update("password")} placeholder="At least 8 characters" minLength={8} required />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <Button type="submit" size="xl" disabled={loading} className="w-full rounded-2xl bg-em font-normal text-white hover:bg-em-600">
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
