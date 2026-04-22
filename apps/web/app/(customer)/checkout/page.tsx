"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Mail, Package, CreditCard, FileText, Truck, Eye, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupees } from "@/lib/utils";

const STATES = ["Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "Uttar Pradesh", "Gujarat", "West Bengal", "Haryana"];

const TIMELINE = [
  { icon: Mail, t: "Order confirmed", d: "Receipt sent to your email" },
  { icon: FileText, t: "Mockups within 48 hrs", d: "Our design team prepares visuals" },
  { icon: Eye, t: "You review & approve", d: "2 free revisions included" },
  { icon: CreditCard, t: "Pay balance", d: "After mockup approval" },
  { icon: Package, t: "Production starts", d: "7–14 day lead time" },
  { icon: CheckCircle2, t: "Quality check", d: "We inspect each unit" },
  { icon: Truck, t: "Delivered to your door", d: "Tracking shared via WhatsApp" },
];

export default function CheckoutPage() {
  const [path, setPath] = useState<"mockup" | "lock" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="bg-canvas py-20">
        <div className="container-gc max-w-3xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-em-50 text-em">
            <Check className="h-10 w-10" />
          </div>
          <p className="overline text-em-700">Order Placed · #GC-2026-0142</p>
          <h1 className="mt-3 t-display">
            Thank you, <span className="italic-em">Priya.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-ink-2">
            We&apos;ve received your order. A receipt is on its way to your inbox and
            our design team will send mockups within 48 hours.
          </p>
          <div className="mt-10 rounded-gc bg-white p-8 text-left shadow-card">
            <h2 className="mb-6 font-display text-xl">What happens next</h2>
            <div className="space-y-5">
              {TIMELINE.map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-em-50 text-em">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{s.t}</p>
                    <p className="text-sm text-ink-2">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="em" size="lg"><Link href="/dashboard/orders">Track order</Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/">Back to home</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-canvas pb-24">
      <div className="border-b border-bdr bg-white">
        <div className="container-gc-w py-8">
          <p className="overline text-ink-3">Checkout</p>
          <h1 className="t-title">
            Almost <span className="italic-em">there.</span>
          </h1>
        </div>
      </div>

      <div className="container-gc-w grid grid-cols-1 gap-8 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Billing */}
          <Section title="Billing details">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Company name" required><Input placeholder="Arts Shala Pvt Ltd" /></Field>
              <Field label="GSTIN" hint="15 digits"><Input placeholder="07AAACA1234A1Z5" /></Field>
              <Field label="PAN"><Input placeholder="AAACA1234A" /></Field>
              <Field label="PO Number (optional)"><Input placeholder="PO-2026-142" /></Field>
              <Field label="Address" className="sm:col-span-2"><Input placeholder="Building, street, area" /></Field>
              <Field label="City"><Input placeholder="New Delhi" /></Field>
              <Field label="State">
                <select className="flex h-10 w-full rounded-md border border-bdr-2 bg-white px-3 text-sm">
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Pincode" required><Input placeholder="110001" /></Field>
              <Field label="Country"><Input value="India" disabled /></Field>
            </div>
          </Section>

          {/* Contact */}
          <Section title="Contact person">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" required><Input placeholder="Priya Sharma" /></Field>
              <Field label="Designation"><Input placeholder="HR Manager" /></Field>
              <Field label="Email" required><Input type="email" placeholder="priya@company.in" /></Field>
              <Field label="Phone" required><Input placeholder="+91 98765 43210" /></Field>
            </div>
          </Section>

          {/* Path selection */}
          <Section title="How would you like to proceed?">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                onClick={() => setPath("mockup")}
                className={`relative rounded-gc border-2 p-5 text-left transition ${path === "mockup" ? "border-em bg-em-50" : "border-bdr hover:border-em/50"}`}
              >
                <span className="absolute right-3 top-3 rounded-gc-p bg-gold-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-700">Recommended</span>
                <Eye className="mb-3 h-6 w-6 text-em" />
                <p className="font-display text-lg">Confirm & Get Mockups</p>
                <p className="mt-1 text-sm text-ink-2">₹0 now. Approve mockups, then pay. Zero risk.</p>
              </button>
              <button
                onClick={() => setPath("lock")}
                className={`rounded-gc border-2 p-5 text-left transition ${path === "lock" ? "border-em bg-em-50" : "border-bdr hover:border-em/50"}`}
              >
                <CreditCard className="mb-3 h-6 w-6 text-em" />
                <p className="font-display text-lg">Lock Prices (10%)</p>
                <p className="mt-1 text-sm text-ink-2">Reserve production slot and freeze prices with a 10% advance.</p>
              </button>
            </div>

            {path === "lock" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-3">Payment method</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {["UPI", "Net Banking", "Cards", "EMI", "Bank Transfer"].map((m) => (
                    <button key={m} className="rounded-gc-s border border-bdr-2 bg-white p-3 text-sm font-medium hover:border-em">
                      {m}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </Section>

          <Button
            variant="em" size="xl" className="w-full"
            disabled={!path}
            onClick={() => setSubmitted(true)}
          >
            {path === "lock" ? "Pay 10% & Lock Prices" : path === "mockup" ? "Confirm & Get Mockups" : "Pick a path above"}
          </Button>
        </div>

        {/* Order summary */}
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <div className="rounded-gc bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">Order summary</h3>
              <Link href="/builder" className="text-xs font-semibold text-em">Edit</Link>
            </div>
            <div className="mt-4 rounded-gc-s bg-em-50 p-3 text-xs text-em-700">
              <p className="font-semibold">Welcome Kit × 50 packs</p>
              <p>Notebook · Flask · Pen · Mug · Thank-you card</p>
            </div>
            <div className="mt-4 space-y-1.5 text-sm">
              <Row label="Subtotal" value={54500} />
              <Row label="Packaging" value={1250} />
              <Row label="Add-ons" value={1000} />
              <Row label="Shipping" value={750} />
              <Row label="GST (18%)" value={10350} />
              <Row label="Razorpay fee (2.36%)" value={1615} />
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-bdr pt-3">
              <span className="text-xs font-bold uppercase tracking-wider">Total</span>
              <span className="font-display text-xl font-semibold tabnum">{formatRupees(69465)}</span>
            </div>
            {path === "lock" && (
              <div className="mt-4 rounded-gc-s bg-gold-50 p-3 text-xs text-gold-700">
                <p className="font-semibold">Due now (10%)</p>
                <p className="mt-1 text-lg font-semibold tabnum">{formatRupees(6947)}</p>
                <p className="mt-1 text-[11px]">Balance on mockup approval.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-gc bg-white p-6 shadow-card">
      <h2 className="mb-5 font-display text-xl">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, required, hint, className, children }: {
  label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold text-ink-2">
        {label} {required && <span className="text-err">*</span>}
        {hint && <span className="ml-1 font-normal italic text-ink-3">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-2">{label}</span>
      <span className="tabnum">{formatRupees(value)}</span>
    </div>
  );
}
