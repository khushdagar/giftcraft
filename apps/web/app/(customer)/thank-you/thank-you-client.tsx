'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Clock, MessageCircle, Phone, Sparkles } from 'lucide-react';
import { CONTACT_FALLBACK } from '@/lib/constants';

export default function ThankYouClient() {
  const reduced = useReducedMotion();
  const [contact, setContact] = useState(CONTACT_FALLBACK);

  // Same live contact details the contact page uses.
  useEffect(() => {
    let active = true;
    fetch('/api/settings/contact')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.email) setContact({ email: data.email, phone: data.phone, whatsapp: data.whatsapp });
      })
      .catch(() => {/* keep defaults */});
    return () => { active = false; };
  }, []);

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: reduced ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0 : 0.5, delay: reduced ? 0 : delay },
  });

  const steps = [
    {
      icon: Check,
      title: 'Enquiry received',
      description: 'Your details are with our gifting team right now.',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: Clock,
      title: 'Reply within 24 hours',
      description: 'A gifting expert will call or email you with ideas and pricing.',
      color: 'bg-amber-50 text-amber-600',
    },
    {
      icon: Sparkles,
      title: 'Your pack, your way',
      description: 'Pick products, add your branding and get a transparent quote.',
      color: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="relative overflow-hidden px-4 pb-24 pt-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-gradient-to-b from-emerald-200 to-transparent opacity-30 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-t from-amber-200 to-transparent opacity-30 blur-3xl" />
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ scale: reduced ? 1 : 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 18 }}
            className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200"
          >
            <Check className="h-10 w-10" strokeWidth={3} />
          </motion.div>

          <motion.span {...fadeUp(0.1)} className="inline-block text-sm font-normal uppercase tracking-widest text-emerald-600">
            Message sent
          </motion.span>
          <motion.h1
            {...fadeUp(0.2)}
            className="mb-6 mt-4 text-5xl font-normal tracking-tight text-navy-900 md:text-6xl"
          >
            Thank you!{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              We&apos;re on it.
            </span>
          </motion.h1>
          <motion.p {...fadeUp(0.3)} className="mx-auto max-w-2xl text-xl text-slate-600">
            Your enquiry has reached our team. A gifting expert will get back to you within 24 hours
            with ideas, pricing and next steps.
          </motion.p>

          <motion.div {...fadeUp(0.4)} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-normal text-white transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg"
            >
              Browse the catalogue <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-6 py-3 font-normal text-slate-700 transition-all hover:border-slate-300 hover:shadow-md"
            >
              Back to home
            </Link>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                {...fadeUp(0.5 + idx * 0.1)}
                className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${step.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mb-1 text-xs font-normal uppercase tracking-wider text-slate-500">
                  Step {idx + 1}
                </p>
                <h2 className="text-lg font-normal text-slate-900">{step.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{step.description}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          {...fadeUp(0.9)}
          className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-slate-200 bg-white p-6 sm:flex-row"
        >
          <div>
            <p className="font-normal text-slate-900">Need an answer sooner?</p>
            <p className="text-sm text-slate-600">Call or WhatsApp us — we&apos;re happy to help right away.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={`tel:${contact.phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-normal text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <Phone className="h-4 w-4" /> {contact.phone}
            </a>
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-normal text-green-700 transition-colors hover:bg-green-100"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
