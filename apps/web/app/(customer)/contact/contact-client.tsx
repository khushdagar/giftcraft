'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, MessageCircle, Clock, Users, Zap } from 'lucide-react';
import { CONTACT_FALLBACK } from '@/lib/constants';
import { FieldError } from '@/components/ui/field-error';
import {
  collectErrors,
  validateEmail,
  validateName,
  validatePhone,
  validateText,
} from '@/lib/validation';

const DEFAULT_CONTACT = CONTACT_FALLBACK;

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState(DEFAULT_CONTACT);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});

  const validate = (data: typeof formData) =>
    collectErrors({
      name: validateName(data.name, 'Your name'),
      email: validateEmail(data.email),
      phone: validatePhone(data.phone),
      company: validateName(data.company, 'Company name', { required: false }),
      message: validateText(data.message, 'Message', { min: 10, max: 2000 }),
    });

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const blurField = (field: keyof typeof formData) => {
    const errors = validate(formData);
    setFieldErrors((prev) => ({ ...prev, [field]: errors[field] }));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Clear any previous confirmation, otherwise a second submission that
    // fails would show the old "Message sent!" banner next to the error.
    setSuccess(false);

    const errors = validate(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      // Saved as an Enquiry — shows up in /admin/enquiries alongside
      // product quick-quote leads (Product column stays empty for these).
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.company.trim() || formData.name.trim(),
          contactName: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          message: formData.message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send your message. Please try again.');
      }
      setSuccess(true);
      setFormData({ name: '', email: '', phone: '', company: '', message: '' });
      setFieldErrors({});
      // The confirmation stays put — it is the only record the visitor has that
      // the message went through, and it clears on the next submission anyway.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send your message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const contactMethods = [
    {
      icon: Mail,
      label: 'Email',
      value: contact.email,
      href: `mailto:${contact.email}`,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Phone,
      label: 'Phone',
      value: contact.phone,
      href: `tel:${contact.phone.replace(/\s+/g, '')}`,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: 'Chat with us',
      href: `https://wa.me/${contact.whatsapp}`,
      color: 'from-green-500 to-lime-500',
      bgColor: 'bg-green-50',
      external: true,
    },
  ];

  const reasons = [
    {
      icon: Zap,
      title: 'Quick Response',
      description: 'We reply within 24 hours',
      color: 'amber',
    },
    {
      icon: Users,
      title: 'Expert Team',
      description: 'Dedicated gifting specialists',
      color: 'rose',
    },
    {
      icon: Clock,
      title: '24/7 Support',
      description: 'Always here to help',
      color: 'violet',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-indigo-200 to-transparent rounded-full blur-3xl opacity-30"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-t from-amber-200 to-transparent rounded-full blur-3xl opacity-30"></div>
        </div>

        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="inline-block mb-4"
          >
            <span className="text-sm font-normal text-emerald-600 uppercase tracking-widest">Get in Touch</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-normal text-navy-900 mb-6 tracking-tight"
          >
            Let's Build Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Perfect Pack</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600 max-w-2xl mx-auto"
          >
            Have questions about corporate gifting? Our team of experts is ready to help you create something amazing.
          </motion.p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {/* Form and Contact Info Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {/* Contact Form - Spans 2 columns */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-2xl font-normal text-slate-900 mb-6">Send us a Message</h2>

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 p-4 flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0">✓</div>
                  <div>
                    <p className="font-normal text-emerald-700">Message sent!</p>
                    <p className="text-sm text-emerald-600">We'll get back to you within 24 hours.</p>
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="mb-6 rounded-xl bg-rose-50 border-2 border-rose-200 p-4 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-normal text-slate-700 block mb-2">Your Name *</label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={formData.name}
                      aria-invalid={!!fieldErrors.name}
                      onBlur={() => blurField('name')}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="John Doe"
                      className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors text-sm ${
                        fieldErrors.name ? 'border-red-400' : 'border-slate-200 focus:border-emerald-500'
                      }`}
                      disabled={loading}
                    />
                    <FieldError message={fieldErrors.name} />
                  </div>

                  <div>
                    <label className="text-sm font-normal text-slate-700 block mb-2">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      aria-invalid={!!fieldErrors.email}
                      onBlur={() => blurField('email')}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="you@company.com"
                      className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors text-sm ${
                        fieldErrors.email ? 'border-red-400' : 'border-slate-200 focus:border-emerald-500'
                      }`}
                      disabled={loading}
                    />
                    <FieldError message={fieldErrors.email} />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-normal text-slate-700 block mb-2">Phone *</label>
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      maxLength={14}
                      value={formData.phone}
                      aria-invalid={!!fieldErrors.phone}
                      onBlur={() => blurField('phone')}
                      onChange={(e) => updateField('phone', e.target.value.replace(/[^\d+\s-]/g, ''))}
                      placeholder="+91 98765 43210"
                      className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors text-sm ${
                        fieldErrors.phone ? 'border-red-400' : 'border-slate-200 focus:border-emerald-500'
                      }`}
                      disabled={loading}
                    />
                    <FieldError message={fieldErrors.phone} />
                  </div>

                  <div>
                    <label className="text-sm font-normal text-slate-700 block mb-2">Company Name</label>
                    <input
                      type="text"
                      maxLength={120}
                      value={formData.company}
                      aria-invalid={!!fieldErrors.company}
                      onBlur={() => blurField('company')}
                      onChange={(e) => updateField('company', e.target.value)}
                      placeholder="Your company"
                      className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors text-sm ${
                        fieldErrors.company ? 'border-red-400' : 'border-slate-200 focus:border-emerald-500'
                      }`}
                      disabled={loading}
                    />
                    <FieldError message={fieldErrors.company} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-normal text-slate-700 block mb-2">Message *</label>
                  <textarea
                    required
                    maxLength={2000}
                    value={formData.message}
                    aria-invalid={!!fieldErrors.message}
                    onBlur={() => blurField('message')}
                    onChange={(e) => updateField('message', e.target.value)}
                    placeholder="Tell us about your gifting needs, budget, timeline..."
                    rows={5}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors text-sm resize-none ${
                      fieldErrors.message ? 'border-red-400' : 'border-slate-200 focus:border-emerald-500'
                    }`}
                    disabled={loading}
                  />
                  <FieldError message={fieldErrors.message} />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-normal py-3 rounded-lg transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '📤 Sending...' : '✉️ Send Message'}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Contact Methods - Right Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-normal text-slate-900 mb-6">Reach Out Directly</h3>

            {contactMethods.map((method, idx) => {
              const Icon = method.icon;
              return (
                <motion.a
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  href={method.href}
                  target={method.external ? '_blank' : undefined}
                  rel={method.external ? 'noopener noreferrer' : undefined}
                  className={`${method.bgColor} rounded-xl p-5 border-2 border-slate-200 hover:border-slate-300 hover:shadow-md transition-all group cursor-pointer block`}
                  whileHover={{ y: -4 }}
                >
                  <div className={`flex items-center gap-3 mb-2`}>
                    <div className={`bg-gradient-to-br ${method.color} p-2 rounded-lg text-white`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-normal text-slate-600 uppercase tracking-wider">{method.label}</p>
                  </div>
                  <p className="font-normal text-slate-900 group-hover:text-emerald-600 transition-colors">{method.value}</p>
                </motion.a>
              );
            })}
          </motion.div>
        </div>

        {/* Map Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="mb-20"
        >
          <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="h-96 md:h-[500px] w-full">
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3500.250614971261!2d77.1969448!3d28.682148899999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfdd968808f37%3A0x7a6d7d7e86a10903!2sArts%20Shala!5e0!3m2!1sen!2sin!4v1785825915526!5m2!1sen!2sin" width="600" height="450" style={{ border: '0' }} allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" className="w-full h-full"></iframe>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
