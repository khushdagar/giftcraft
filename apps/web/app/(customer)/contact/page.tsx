'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, MessageCircle, Clock, Users, Zap } from 'lucide-react';

const DEFAULT_CONTACT = {
  email: 'hello@giftcraft.in',
  phone: '+91 98765 43210',
  whatsapp: '919876543210',
};

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [contact, setContact] = useState(DEFAULT_CONTACT);

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
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess(true);
      setFormData({ name: '', email: '', company: '', message: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error:', error);
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

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-normal text-slate-700 block mb-2">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-normal text-slate-700 block mb-2">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@company.com"
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-normal text-slate-700 block mb-2">Company Name</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Your company"
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="text-sm font-normal text-slate-700 block mb-2">Message *</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your gifting needs, budget, timeline..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none transition-colors text-sm resize-none"
                    disabled={loading}
                  />
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
              <iframe
                title="GiftCraft Location"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3503.5236509933903!2d77.22085!3d28.613939!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfd288cf5a6c1%3A0x9a5a5a5a5a5a5a5a!2sNew%20Delhi%2C%20India!5e0!3m2!1sen!2sin!4v1234567890"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
