'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

const ARTICLE_TEASERS = [
  {
    id: 1,
    title: 'The Psychology of Corporate Gifting',
    description: 'Why thoughtful gifts strengthen client relationships and employee loyalty.',
    gradient: 'from-em-50 to-[#D1FAE5]',
  },
  {
    id: 2,
    title: 'Sustainable Packaging Trends 2026',
    description: 'Eco-friendly materials are no longer a premium feature — they are the standard.',
    gradient: 'from-sky-50 to-indigo-50',
  },
  {
    id: 3,
    title: 'Festival Gifting Guide: Diwali Edition',
    description: 'Premium hampers, themed collections, and cultural significance of corporate gifting.',
    gradient: 'from-gold-50 to-[#FED7AA]',
  },
];

export const metadata = {
  title: 'Blog | GiftCraft',
  description: 'Insights on corporate gifting, trends, and best practices.',
};

export default function BlogPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3000);
  };

  return (
    <div className="min-h-screen bg-canvas py-12 px-4">
      <div className="container-gc-w max-w-4xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="overline text-ink-3">INSIGHTS</p>
          <h1 className="t-title mt-2 text-ink">The GiftCraft Blog</h1>
          <p className="text-ink-2 mt-4 text-lg">
            Trends, tips, and stories on the art of thoughtful corporate gifting.
          </p>
        </div>

        {/* Newsletter Signup */}
        <div className="rounded-md border-2 border-em/30 bg-em-50 p-8 mb-12">
          <div className="flex gap-4 items-center">
            <Mail className="w-6 h-6 text-em flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-black text-em mb-1">Subscribe to Our Newsletter</h3>
              <p className="text-sm text-em-700 mb-3">
                Monthly insights on gifting trends, product launches, and case studies.
              </p>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-3 py-2 rounded-md border border-em bg-white text-sm"
                />
                <Button type="submit" variant="em" className="rounded-md text-sm">
                  Subscribe
                </Button>
              </form>
              {subscribed && (
                <p className="text-xs text-em-700 mt-2">
                  ✓ Thanks! Check your email for a welcome gift code.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mb-12">
          <p className="overline text-ink-3 mb-6">Coming Soon</p>
          <p className="text-ink-2 mb-8">
            We're building out our content library. In the meantime, here's a sneak peek at what's coming:
          </p>
        </div>

        {/* Article Teasers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ARTICLE_TEASERS.map((article) => (
            <div
              key={article.id}
              className={`rounded-md border-2 border-bdr overflow-hidden group cursor-pointer bg-gradient-to-br ${article.gradient}`}
            >
              {/* Placeholder image */}
              <div className="w-full h-40 bg-gradient-to-br opacity-60 group-hover:opacity-70 transition" />

              {/* Content */}
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">
                  Coming
                </p>
                <h3 className="font-black text-ink mb-2 group-hover:text-em transition">
                  {article.title}
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed">{article.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-ink-2 mb-6">
            Want to share your gifting story? We'd love to feature your company's journey.
          </p>
          <Button asChild variant="outline" size="lg" className="rounded-md">
            <a href="mailto:hello@giftcraft.in">Get in Touch</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
