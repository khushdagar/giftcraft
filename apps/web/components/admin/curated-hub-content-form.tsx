'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { RichTextField } from '@/components/admin/rich-text-field';
import { FaqRepeaterField, type FaqEntry } from '@/components/admin/faq-repeater-field';
import type { CuratedHub, CuratedHubContent } from '@/lib/curated-hub-content';

interface CuratedHubContentFormProps {
  hub: CuratedHub;
  /** Where the form lives in admin — the back link and post-save destination. */
  backHref: string;
  backLabel: string;
  /** Public URL of the page being edited, shown for orientation. */
  pagePath: string;
  pageLabel: string;
  initial: CuratedHubContent;
}

// Same fields as a single budget band / occasion page, for the hub page above
// them: heading, blurb, content below the grid, FAQs and SEO metadata.
export function CuratedHubContentForm({
  hub,
  backHref,
  backLabel,
  pagePath,
  pageLabel,
  initial,
}: CuratedHubContentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pageTitle: initial.pageTitle,
    description: initial.description,
    metaTitle: initial.metaTitle,
    metaDescription: initial.metaDescription,
    contentBelow: initial.contentBelow,
  });
  const [faqs, setFaqs] = useState<FaqEntry[]>(initial.faqs);

  const uploadFolder = hub === 'budget' ? 'budget-bands' : 'occasions';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        pageTitle: formData.pageTitle || null,
        description: formData.description || null,
        metaTitle: formData.metaTitle || null,
        metaDescription: formData.metaDescription || null,
        contentBelow: formData.contentBelow || null,
        faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
      };

      const res = await fetch(`/api/admin/curated-hub-content/${hub}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      toast.success('Page content updated');
      router.push(backHref);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{pageLabel} page content</h1>
          <p className="mt-1 text-sm text-ink-2">{pagePath}</p>
        </div>
        <Button type="submit" variant="em" disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Details */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink">Details</h2>

            <label htmlFor="pageTitle" className="mb-1.5 block text-sm font-medium text-ink">
              Title <span className="font-normal text-ink-3">— shown as the H1 on this page</span>
            </label>
            <Input
              id="pageTitle"
              value={formData.pageTitle}
              onChange={(e) => setFormData((p) => ({ ...p, pageTitle: e.target.value }))}
              placeholder={pageLabel}
            />
            <p className="mt-1 text-xs text-ink-3">Leave blank to restore the default heading.</p>

            <label htmlFor="description" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-lg border border-bdr px-3 py-2 text-sm text-ink focus:border-em focus:outline-none"
            />
            <p className="mt-1 text-xs text-ink-3">Shown under the heading, above the tiles.</p>

            <label className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Content below tiles <span className="font-normal text-ink-3">— optional, shows under the grid</span>
            </label>
            <RichTextField
              value={formData.contentBelow}
              onChange={(html) => setFormData((p) => ({ ...p, contentBelow: html }))}
              placeholder="Gifting guide, tips, delivery timelines…"
              minHeight={160}
              uploadFolder={uploadFolder}
            />
          </div>

          {/* FAQs */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-ink">FAQs</h2>
            <p className="mb-3 text-xs text-ink-3">
              Shown below the grid and included as FAQ structured data for search engines.
            </p>
            <FaqRepeaterField value={faqs} onChange={setFaqs} uploadFolder={uploadFolder} />
          </div>
        </div>

        <div className="space-y-6">
          {/* SEO */}
          <div className="rounded-xl border border-bdr bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink">SEO metadata</h2>

            <label htmlFor="metaTitle" className="mb-1.5 block text-sm font-medium text-ink">
              Meta title
            </label>
            <Input
              id="metaTitle"
              value={formData.metaTitle}
              onChange={(e) => setFormData((p) => ({ ...p, metaTitle: e.target.value }))}
              placeholder={formData.pageTitle || pageLabel}
            />

            <label htmlFor="metaDescription" className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Meta description
            </label>
            <textarea
              id="metaDescription"
              rows={3}
              value={formData.metaDescription}
              onChange={(e) => setFormData((p) => ({ ...p, metaDescription: e.target.value }))}
              placeholder="Leave blank to fall back to the description above."
              className="w-full rounded-lg border border-bdr px-3 py-2 text-sm text-ink focus:border-em focus:outline-none"
            />
            <p className="mt-1 text-xs text-ink-3">Used for the page &lt;title&gt;, meta description and social previews.</p>
          </div>
        </div>
      </div>
    </form>
  );
}
