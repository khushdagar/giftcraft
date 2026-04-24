'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Placeholder API call
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

  return (
    <div className="min-h-screen bg-canvas py-12 px-4">
      <div className="container-gc-w max-w-5xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="overline text-ink-3">CONTACT US</p>
          <h1 className="t-title mt-2 text-ink">Get in Touch</h1>
          <p className="text-ink-2 mt-4 text-lg">
            Have questions? Our team is here to help you build the perfect gift pack.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Left: Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border-2 border-bdr bg-white p-6 space-y-4">
              {success && (
                <div className="rounded-md bg-em-50 text-em-700 p-4 text-sm">
                  ✓ Message sent! We'll get back to you within 24 hours.
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-ink-3 block mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Your name"
                  className="w-full px-3 py-2 rounded-md border border-bdr text-sm disabled:opacity-50"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-3 block mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="you@company.com"
                  className="w-full px-3 py-2 rounded-md border border-bdr text-sm disabled:opacity-50"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-3 block mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  placeholder="Your company"
                  className="w-full px-3 py-2 rounded-md border border-bdr text-sm disabled:opacity-50"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-3 block mb-2">
                  Message *
                </label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Tell us about your gifting needs..."
                  rows={5}
                  className="w-full px-3 py-2 rounded-md border border-bdr text-sm disabled:opacity-50"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="em"
                className="w-full rounded-md"
              >
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </form>

          {/* Right: Contact Info */}
          <div className="space-y-4">
            {/* Address */}
            <div className="rounded-md border-2 border-bdr bg-white p-5">
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-em flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-ink-3 uppercase">Address</p>
                  <p className="text-sm text-ink mt-1">
                    Arts Shala, New Delhi<br />
                    India
                  </p>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="rounded-md border-2 border-bdr bg-white p-5">
              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-em flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-ink-3 uppercase">Email</p>
                  <a
                    href="mailto:hello@giftcraft.in"
                    className="text-sm text-em hover:underline"
                  >
                    hello@giftcraft.in
                  </a>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="rounded-md border-2 border-bdr bg-white p-5">
              <div className="flex gap-3">
                <Phone className="w-5 h-5 text-em flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-ink-3 uppercase">Phone</p>
                  <a href="tel:+919876543210" className="text-sm text-em hover:underline">
                    +91 98765 43210
                  </a>
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="rounded-md border-2 border-em/30 bg-em-50 p-5">
              <div className="flex gap-3">
                <MessageCircle className="w-5 h-5 text-em flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-em-700 uppercase">WhatsApp</p>
                  <a
                    href="https://wa.me/919876543210"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-em hover:underline"
                  >
                    Chat with us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
