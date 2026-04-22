"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRupees } from "@/lib/utils";

const STEPS = [
  { id: 1, name: "Products" },
  { id: 2, name: "Branding" },
  { id: 3, name: "Quantity & Delivery" },
  { id: 4, name: "Review & Order" },
];

const MINI_CATALOG = [
  { id: "flask-500", name: "Flask 500ml", price: 285, icon: "🧴" },
  { id: "notebook", name: "Notebook A5", price: 125, icon: "📓" },
  { id: "pen", name: "Pen Set", price: 450, icon: "🖋️" },
  { id: "mug", name: "Ceramic Mug", price: 345, icon: "☕" },
  { id: "tshirt", name: "T-Shirt", price: 385, icon: "👕" },
  { id: "chocolates", name: "Chocolate Box", price: 580, icon: "🍫" },
];

const PACKAGING = [
  { id: "white", name: "White Gift Box", price: 0, note: "Included" },
  { id: "kraft", name: "Kraft Craft Box", price: 25, note: "Eco" },
  { id: "premium", name: "Premium Rigid Box", price: 85, note: "Luxury" },
];

const ADDONS = [
  { id: "card", name: "Thank-you Card", price: 15 },
  { id: "ribbon", name: "Branded Ribbon", price: 10 },
  { id: "tag", name: "Hang Tag", price: 8 },
  { id: "seal", name: "Wax Seal", price: 25 },
  { id: "stuffing", name: "Tissue Stuffing", price: 5 },
];

export default function BuilderPage() {
  const [step, setStep] = useState(1);
  const [pack, setPack] = useState<string[]>([]);
  const [qty, setQty] = useState(50);
  const [pkg, setPkg] = useState("white");
  const [addons, setAddons] = useState<Record<string, boolean>>({});
  const [delivery, setDelivery] = useState<"single" | "individual">("single");
  const [hasLogo, setHasLogo] = useState(false);

  const toggle = (id: string) => setPack((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAddon = (id: string) => setAddons((a) => ({ ...a, [id]: !a[id] }));

  const subtotal = pack.reduce((s, id) => s + (MINI_CATALOG.find((m) => m.id === id)?.price ?? 0) * qty, 0);
  const pkgCost = (PACKAGING.find((p) => p.id === pkg)?.price ?? 0) * qty;
  const addonCost = Object.entries(addons).filter(([, v]) => v).reduce((s, [id]) => s + (ADDONS.find((a) => a.id === id)?.price ?? 0) * qty, 0);
  const shipping = Math.ceil(qty / 10) * 50;
  const preTax = subtotal + pkgCost + addonCost + shipping;
  const gst = preTax * 0.18;
  const razorpay = (preTax + gst) * 0.0236;
  const total = preTax + gst + razorpay;

  return (
    <div className="bg-canvas pb-32">
      {/* Step header */}
      <div className="sticky top-14 z-10 border-b border-bdr bg-canvas/95 backdrop-blur">
        <div className="container-gc-w py-5">
          <p className="overline text-ink-3">Gift Builder</p>
          <div className="mt-2 flex items-center justify-between">
            <h1 className="t-heading">
              {STEPS[step - 1]?.name} <span className="font-normal italic text-ink-3">· Step {step} of 4</span>
            </h1>
            <div className="hidden gap-1 sm:flex">
              {STEPS.map((s) => (
                <div key={s.id} className={`h-1.5 w-12 rounded-full transition-all ${s.id <= step ? "bg-em" : "bg-bdr-2"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-gc-w grid grid-cols-1 gap-8 py-8 lg:grid-cols-[1fr_340px]">
        {/* ══ Step content ══ */}
        <div>
          {/* STEP 1 — Products */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl">Pick products for your pack</h2>
                <Badge variant="gold">MOQ 25 · Currently {qty}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {MINI_CATALOG.map((p) => {
                  const inPack = pack.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className={`group relative overflow-hidden rounded-gc bg-white p-4 text-left shadow-card transition-all hover:-translate-y-1 hover:shadow-hover ${inPack ? "ring-2 ring-em" : ""}`}
                    >
                      <div className="flex aspect-square items-center justify-center rounded-gc-s bg-elevated text-4xl">{p.icon}</div>
                      <p className="mt-3 text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-ink-3 tabnum">{formatRupees(p.price)} from</p>
                      {inPack && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-em text-white">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 rounded-gc border-2 border-dashed border-bdr-2 bg-white p-6">
                <h3 className="font-display text-lg">Your pack · {pack.length} items</h3>
                {pack.length === 0 ? (
                  <p className="mt-1 text-sm text-ink-3">Start by picking items above.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pack.map((id) => {
                      const p = MINI_CATALOG.find((m) => m.id === id)!;
                      return (
                        <span key={id} className="inline-flex items-center gap-2 rounded-gc-p border border-bdr bg-elevated px-3 py-1.5 text-sm">
                          <span>{p.icon}</span> {p.name}
                          <button onClick={() => toggle(id)} className="text-ink-3 hover:text-err"><X className="h-3 w-3" /></button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Branding */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="rounded-gc bg-white p-6 shadow-card">
                <h3 className="font-display text-lg">Your logo</h3>
                <p className="mt-1 text-sm text-ink-2">PNG, SVG, or AI · min 300dpi</p>
                <label className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-gc border-2 border-dashed p-8 transition ${hasLogo ? "border-em bg-em-50" : "border-bdr-2 hover:border-em"}`}>
                  <Upload className={`h-5 w-5 ${hasLogo ? "text-em" : "text-ink-3"}`} />
                  <span className={hasLogo ? "font-semibold text-em-700" : "text-ink-2"}>
                    {hasLogo ? "company-logo.svg · uploaded" : "Click or drop to upload"}
                  </span>
                  <input type="file" className="hidden" onChange={() => setHasLogo(true)} />
                </label>
              </div>

              <div className="rounded-gc bg-white p-6 shadow-card">
                <h3 className="font-display text-lg">Packaging</h3>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {PACKAGING.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPkg(p.id)}
                      className={`rounded-gc border-2 p-4 text-left transition ${pkg === p.id ? "border-em bg-em-50" : "border-bdr hover:border-bdr-2"}`}
                    >
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="mt-1 text-xs text-ink-3">{p.price === 0 ? "Included" : `+${formatRupees(p.price)}/unit`}</p>
                      <Badge variant="gold" className="mt-2">{p.note}</Badge>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-gc bg-white p-6 shadow-card">
                <h3 className="font-display text-lg">Add-ons</h3>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ADDONS.map((a) => (
                    <label key={a.id} className={`flex cursor-pointer items-center justify-between rounded-gc-s border-2 p-3 transition ${addons[a.id] ? "border-em bg-em-50" : "border-bdr"}`}>
                      <span className="flex items-center gap-3">
                        <input type="checkbox" checked={!!addons[a.id]} onChange={() => toggleAddon(a.id)} className="h-4 w-4 accent-em" />
                        <span className="text-sm font-medium">{a.name}</span>
                      </span>
                      <span className="text-xs text-ink-3 tabnum">+{formatRupees(a.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Quantity & Delivery */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="rounded-gc bg-white p-6 shadow-card">
                <h3 className="font-display text-lg">Pack quantity</h3>
                <input
                  type="range" min={25} max={500} step={25}
                  value={qty} onChange={(e) => setQty(Number(e.target.value))}
                  className="mt-6 w-full accent-em"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-ink-3">25 packs</span>
                  <span className="font-display text-3xl tabnum">{qty} <span className="text-sm text-ink-3">packs</span></span>
                  <span className="text-xs text-ink-3">500 packs</span>
                </div>
              </div>

              <div className="rounded-gc bg-white p-6 shadow-card">
                <h3 className="font-display text-lg">Delivery</h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(["single", "individual"] as const).map((m) => (
                    <button key={m} onClick={() => setDelivery(m)} className={`rounded-gc border-2 p-4 text-left transition ${delivery === m ? "border-em bg-em-50" : "border-bdr"}`}>
                      <p className="text-sm font-semibold">{m === "single" ? "Single location" : "Individual (CSV)"}</p>
                      <p className="mt-1 text-xs text-ink-3">{m === "single" ? "All packs to one address" : "Upload recipient list"}</p>
                    </button>
                  ))}
                </div>
                <Label label="Preferred delivery date" className="mt-5">
                  <Input type="date" />
                </Label>
              </div>
            </motion.div>
          )}

          {/* STEP 4 — Review */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="rounded-gc bg-em-50 p-6 ring-1 ring-em/20">
                <h3 className="font-display text-xl text-em-700">Your gift pack, all together</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {pack.map((id) => {
                    const p = MINI_CATALOG.find((m) => m.id === id)!;
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 rounded-gc-p bg-white px-3 py-1.5 text-sm">
                        {p.icon} {p.name}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm text-em-700">× {qty} packs · delivered {delivery === "single" ? "to single location" : "individually"}</p>
              </div>

              <div className="rounded-gc bg-white p-6 shadow-card">
                <h3 className="font-display text-lg">Itemized total</h3>
                <Line label={`Products × ${qty}`} value={subtotal} />
                <Line label="Packaging" value={pkgCost} />
                <Line label="Add-ons" value={addonCost} />
                <Line label="Shipping" value={shipping} />
                <Line label="GST (18%)" value={gst} />
                <Line label="Razorpay fee (2.36%)" value={razorpay} note="passed through" />
                <div className="mt-3 flex items-center justify-between border-t border-bdr pt-3">
                  <span className="font-display text-lg">Grand Total</span>
                  <span className="font-display text-2xl font-semibold tabnum">{formatRupees(total)}</span>
                </div>
                <p className="mt-1 text-right text-xs text-ink-3 tabnum">
                  ~{formatRupees(total / Math.max(qty, 1))} per pack
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="em" size="xl" className="flex-1">
                  <Link href="/checkout">Place Order →</Link>
                </Button>
                <Button variant="outline" size="xl">Quote PDF</Button>
                <Button variant="outline" size="xl">WhatsApp Share</Button>
              </div>
            </motion.div>
          )}

          {/* Nav */}
          <div className="mt-10 flex items-center justify-between">
            <Button variant="outline" size="lg" disabled={step === 1} onClick={() => setStep(Math.max(1, step - 1))}>
              ← Back
            </Button>
            {step < 4 && (
              <Button variant="em" size="lg" disabled={step === 1 && pack.length === 0} onClick={() => setStep(step + 1)}>
                Next: {STEPS[step]?.name} →
              </Button>
            )}
          </div>
        </div>

        {/* ══ Sticky summary ══ */}
        <aside className="lg:sticky lg:top-36 lg:h-fit">
          <div className="rounded-gc bg-white p-5 shadow-card">
            <p className="overline text-ink-3">Your Pack</p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span>{pack.length} items</span><span className="tabnum">{formatRupees(subtotal)}</span></div>
              <div className="flex justify-between text-ink-3"><span>+ pkg</span><span className="tabnum">{formatRupees(pkgCost)}</span></div>
              <div className="flex justify-between text-ink-3"><span>+ addons</span><span className="tabnum">{formatRupees(addonCost)}</span></div>
              <div className="flex justify-between text-ink-3"><span>+ ship</span><span className="tabnum">{formatRupees(shipping)}</span></div>
              <div className="flex justify-between text-ink-3"><span>+ GST</span><span className="tabnum">{formatRupees(gst)}</span></div>
              <div className="flex justify-between text-ink-3"><span>+ RP fee</span><span className="tabnum">{formatRupees(razorpay)}</span></div>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-bdr pt-3">
              <span className="text-xs font-bold uppercase tracking-wider">Total</span>
              <span className="font-display text-xl font-semibold tabnum">{formatRupees(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Line({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-ink-2">
        {label}
        {note && <span className="ml-1.5 text-xs text-ink-3">· {note}</span>}
      </span>
      <span className="tabnum">{formatRupees(value)}</span>
    </div>
  );
}

function Label({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-semibold text-ink-2">{label}</span>
      {children}
    </label>
  );
}
