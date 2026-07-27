'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Megaphone, Users, Send, Eye } from 'lucide-react';

interface OfferForm {
  subject: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
}

const EMPTY: OfferForm = {
  subject: '',
  headline: '',
  body: '',
  ctaLabel: '',
  ctaUrl: '',
  imageUrl: '',
};

export default function AdminOffersPage() {
  const [form, setForm] = useState<OfferForm>(EMPTY);
  const [testEmail, setTestEmail] = useState('');

  const { data: recipientData } = useQuery({
    queryKey: ['offer-recipients'],
    queryFn: async () => {
      const res = await fetch('/api/admin/offers/send');
      if (!res.ok) throw new Error('Failed to load recipients');
      const json = await res.json();
      return json.data as { recipientCount: number };
    },
  });

  const recipientCount = recipientData?.recipientCount ?? null;

  const set = (key: keyof OfferForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const sendMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const res = await fetch('/api/admin/offers/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send');
      return json.data as {
        test?: boolean;
        recipientCount: number;
        sent: number;
        skipped?: number;
        failed?: number;
      };
    },
    onSuccess: (data) => {
      if (data.test) {
        toast.success('Test email sent. Check your inbox.');
      } else {
        toast.success(
          `Offer sent to ${data.sent} of ${data.recipientCount} customers` +
            (data.failed ? ` (${data.failed} failed)` : '')
        );
      }
    },
    onError: (err: any) => toast.error(err.message || 'Something went wrong'),
  });

  const canSubmit = form.subject.trim() && form.headline.trim() && form.body.trim();

  const handleSend = () => {
    if (!canSubmit) {
      toast.error('Subject, headline and body are required');
      return;
    }
    if (recipientCount === 0) {
      toast.error('No customers have opted into marketing emails yet');
      return;
    }
    if (
      !confirm(
        `Send this offer to ${recipientCount ?? 'all opted-in'} customer(s)? This cannot be undone.`
      )
    )
      return;
    sendMutation.mutate(form);
  };

  const handleTest = () => {
    if (!canSubmit) {
      toast.error('Subject, headline and body are required');
      return;
    }
    if (!testEmail.trim()) {
      toast.error('Enter a test email address');
      return;
    }
    sendMutation.mutate({ ...form, testEmail: testEmail.trim() });
  };

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div className="border-b border-bdr pb-6">
        <div className="flex items-center gap-2 text-ink">
          <Megaphone className="h-6 w-6" />
          <h1 className="text-3xl font-normal tracking-tight">Offers & Promotions</h1>
        </div>
        <p className="mt-1 text-sm text-ink-2">
          Compose a promotional email and send it to customers who opted into marketing.
        </p>
      </div>

      {/* Recipient summary */}
      <div className="flex items-center gap-3 rounded-lg border border-bdr bg-surface px-4 py-3">
        <Users className="h-5 w-5 text-ink-2" />
        <p className="text-sm text-ink">
          {recipientCount === null ? (
            'Loading audience…'
          ) : (
            <>
              <span className="font-semibold">{recipientCount}</span> customer
              {recipientCount === 1 ? '' : 's'} opted into marketing emails.
            </>
          )}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Compose form */}
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-normal text-ink">Email Subject</label>
            <Input
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              placeholder="e.g. 🎉 Diwali Special — 15% off corporate gift packs"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-normal text-ink">Headline</label>
            <Input
              value={form.headline}
              onChange={(e) => set('headline', e.target.value)}
              placeholder="Big bold headline shown at the top of the email"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-normal text-ink">Body</label>
            <Textarea
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder="Write your offer. Leave a blank line between paragraphs."
              className="h-40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-normal text-ink">Button Label (optional)</label>
              <Input
                value={form.ctaLabel}
                onChange={(e) => set('ctaLabel', e.target.value)}
                placeholder="Shop Now"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-normal text-ink">Button URL (optional)</label>
              <Input
                value={form.ctaUrl}
                onChange={(e) => set('ctaUrl', e.target.value)}
                placeholder="https://giftcraft.in/catalog"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-normal text-ink">Banner Image URL (optional)</label>
            <Input
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="https://…/banner.jpg"
            />
          </div>

          {/* Test send */}
          <div className="rounded-lg border border-bdr bg-surface p-4">
            <p className="mb-2 text-sm font-medium text-ink">Send a test first</p>
            <div className="flex gap-2">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@company.com"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 rounded-2xl"
                onClick={handleTest}
                disabled={sendMutation.isPending}
              >
                <Eye className="mr-1 h-4 w-4" /> Test
              </Button>
            </div>
          </div>

          <Button
            type="button"
            className="w-full rounded-2xl bg-em py-3 font-normal hover:bg-em-600"
            onClick={handleSend}
            disabled={sendMutation.isPending || !canSubmit}
          >
            <Send className="mr-2 h-4 w-4" />
            {sendMutation.isPending
              ? 'Sending…'
              : `Send to ${recipientCount ?? ''} customer${recipientCount === 1 ? '' : 's'}`}
          </Button>
        </div>

        {/* Live preview */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-2">Preview</p>
          <div className="rounded-lg border border-bdr bg-white p-6">
            <h2 className="mb-2 text-2xl font-extrabold text-navy-800">
              {form.headline || 'Your headline appears here'}
            </h2>
            <p className="mb-3 text-sm text-gray-500">Hi there,</p>
            {form.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.imageUrl}
                alt="banner"
                className="mb-4 max-h-48 w-full rounded-xl object-cover"
              />
            )}
            <div className="space-y-3 text-[15px] leading-relaxed text-gray-700">
              {(form.body || 'Your offer text will appear here.').split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {form.ctaLabel && form.ctaUrl && (
              <div className="mt-5">
                <span className="inline-block rounded-xl bg-orange-500 px-7 py-3 font-bold text-white">
                  {form.ctaLabel}
                </span>
              </div>
            )}
            <hr className="my-6 border-gray-200" />
            <p className="text-xs text-gray-400">
              You're receiving this because you opted in to offers from GIVOO. Manage your email
              preferences.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
