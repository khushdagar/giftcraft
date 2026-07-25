'use client';

import { compressAndUpload } from '@/hooks/use-compressed-upload';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Upload, X, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from './rich-text-editor';
import { slugify, parseTags, autoExcerpt, readingMinutes, stripHtml } from '@/lib/blog';

export interface BlogCategoryOption {
  id: string;
  name: string;
}

export interface BlogPostFormData {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  coverImageAlt: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt: string; // ISO or ''
  isFeatured: boolean;
  tags: string[];
  categoryId: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImageUrl: string;
  noIndex: boolean;
}

const EMPTY: BlogPostFormData = {
  title: '', slug: '', excerpt: '', content: '', coverImageUrl: '', coverImageAlt: '',
  status: 'draft', publishedAt: '', isFeatured: false, tags: [], categoryId: '',
  metaTitle: '', metaDescription: '', canonicalUrl: '', ogImageUrl: '', noIndex: false,
};

const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://giftcraft.in';

/** `<input type="datetime-local">` needs `YYYY-MM-DDTHH:mm` in LOCAL time. */
function toLocalInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, counter, children }: { label: string; hint?: string; counter?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700">{label}</label>
        {counter && <span className="text-[11px] text-gray-400">{counter}</span>}
      </div>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

export function BlogForm({
  mode,
  post,
  categories,
}: {
  mode: 'create' | 'edit';
  post?: BlogPostFormData;
  categories: BlogCategoryOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<BlogPostFormData>(post ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState<'cover' | 'og' | null>(null);
  const [tagInput, setTagInput] = useState('');
  // Once the user edits the slug by hand, stop deriving it from the title.
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const coverRef = useRef<HTMLInputElement>(null);
  const ogRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof BlogPostFormData>(key: K, value: BlogPostFormData[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const wordCount = useMemo(() => stripHtml(form.content).split(/\s+/).filter(Boolean).length, [form.content]);
  const minutes = useMemo(() => (form.content ? readingMinutes(form.content) : 0), [form.content]);

  // What Google will actually show, falling back the same way the page does.
  const seoTitle = form.metaTitle || form.title || 'Untitled post';
  const seoDesc = form.metaDescription || form.excerpt || (form.content ? autoExcerpt(form.content) : '');

  const onTitleChange = (title: string) => {
    setForm((p) => ({ ...p, title, slug: slugTouched ? p.slug : slugify(title) }));
  };

  const addTag = () => {
    const next = parseTags(tagInput);
    if (next.length === 0) return;
    set('tags', Array.from(new Set([...form.tags, ...next])));
    setTagInput('');
  };

  const upload = async (file: File, target: 'cover' | 'og') => {
    setUploading(target);
    try {
      const data = await compressAndUpload(file, { folder: 'blog' });
      set(target === 'cover' ? 'coverImageUrl' : 'ogImageUrl', data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
      if (target === 'cover' && coverRef.current) coverRef.current.value = '';
      if (target === 'og' && ogRef.current) ogRef.current.value = '';
    }
  };

  // Accepts both the form's submit event and the "Save & publish" click.
  const handleSubmit = async (
    e: { preventDefault: () => void },
    overrideStatus?: BlogPostFormData['status']
  ) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Give the post a title');
    if (!stripHtml(form.content)) return toast.error('The post has no content');

    const status = overrideStatus ?? form.status;
    setSaving(true);
    try {
      const payload = {
        ...form,
        status,
        slug: slugify(form.slug || form.title),
        // datetime-local gives local time; send a real ISO instant.
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : '',
      };
      const url = mode === 'create' ? '/api/admin/blog' : `/api/admin/blog/${post?.id}`;
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      toast.success(mode === 'create' ? 'Post created' : 'Post saved');
      router.push('/admin/blog');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!post?.id) return;
    if (!confirm(`Delete "${form.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      toast.success('Post deleted');
      router.push('/admin/blog');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      {/* ── Main column ─────────────────────────────────────── */}
      <div className="min-w-0 space-y-5">
        <Section title="Content">
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="The Psychology of Corporate Gifting"
              className="text-base"
            />
          </Field>

          <Field label="Slug" hint={`${SITE}/blog/${form.slug || 'your-post'}`}>
            <Input
              value={form.slug}
              onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }}
              onBlur={(e) => set('slug', slugify(e.target.value))}
              placeholder="the-psychology-of-corporate-gifting"
            />
          </Field>

          <Field
            label="Excerpt"
            hint="Shown on the blog listing. Leave blank and we'll take the first 160 characters of the post."
            counter={`${form.excerpt.length}/500`}
          >
            <Textarea
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value.slice(0, 500))}
              placeholder="Why thoughtful gifts strengthen client relationships…"
              className="min-h-20"
            />
          </Field>
        </Section>

        <Section title="Body" hint={form.content ? `${wordCount} words · ~${minutes} min read` : undefined}>
          <RichTextEditor value={form.content} onChange={(html) => set('content', html)} />
        </Section>

        <Section title="SEO" hint="Overrides the defaults taken from the title and excerpt.">
          {/* Google result preview */}
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Search result preview
            </p>
            <p className="truncate text-xs text-gray-600">
              {SITE}/blog/{form.slug || 'your-post'}
            </p>
            <p className="mt-0.5 truncate text-lg text-[#1a0dab]">{seoTitle}</p>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-gray-600">
              {seoDesc || 'Add an excerpt or meta description to control this text.'}
            </p>
          </div>

          <Field
            label="Meta title"
            counter={`${form.metaTitle.length}/70`}
            hint={form.metaTitle.length > 60 ? 'Over 60 characters may be truncated by Google.' : undefined}
          >
            <Input
              value={form.metaTitle}
              onChange={(e) => set('metaTitle', e.target.value.slice(0, 70))}
              placeholder={form.title || 'Defaults to the post title'}
            />
          </Field>

          <Field
            label="Meta description"
            counter={`${form.metaDescription.length}/200`}
            hint={form.metaDescription.length > 160 ? 'Over 160 characters may be truncated by Google.' : undefined}
          >
            <Textarea
              value={form.metaDescription}
              onChange={(e) => set('metaDescription', e.target.value.slice(0, 200))}
              placeholder="Defaults to the excerpt"
              className="min-h-16"
            />
          </Field>

          <Field label="Canonical URL" hint="Only set this if the post was first published elsewhere.">
            <Input
              value={form.canonicalUrl}
              onChange={(e) => set('canonicalUrl', e.target.value)}
              placeholder="https://original-source.com/article"
            />
          </Field>

          <Field label="Social share image" hint="Falls back to the cover image. 1200×630 recommended.">
            {form.ogImageUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.ogImageUrl} alt="" className="h-16 w-28 rounded-md border border-gray-200 object-cover" />
                <button type="button" onClick={() => set('ogImageUrl', '')} className="text-xs font-medium text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled={uploading === 'og'} onClick={() => ogRef.current?.click()}>
                {uploading === 'og' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload
              </Button>
            )}
            <input ref={ogRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'og')} />
          </Field>

          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={form.noIndex} onChange={(e) => set('noIndex', e.target.checked)} className="mt-0.5" />
            <span>
              <span className="font-medium">Hide from search engines</span>
              <span className="block text-gray-500">
                Adds <code>noindex</code> and keeps the post out of the sitemap. It stays reachable by direct link.
              </span>
            </span>
          </label>
        </Section>
      </div>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div className="space-y-5 lg:sticky lg:top-6">
        <Section title="Publish">
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as BlogPostFormData['status'])}
              className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="draft">Draft — only visible here</option>
              <option value="published">Published — live on the site</option>
              <option value="archived">Archived — taken down</option>
            </select>
          </Field>

          <Field
            label="Publish date"
            hint={
              form.status === 'published'
                ? 'Leave blank to publish immediately. A future date schedules the post — it stays hidden until then.'
                : 'Only applies once the status is Published.'
            }
          >
            <Input
              type="datetime-local"
              value={toLocalInput(form.publishedAt)}
              onChange={(e) => set('publishedAt', e.target.value)}
            />
          </Field>

          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />
            Feature at the top of the blog
          </label>

          <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create post' : 'Save changes'}
            </Button>
            {form.status !== 'published' && (
              <Button type="button" variant="outline" disabled={saving} onClick={(e) => handleSubmit(e, 'published')}>
                Save &amp; publish
              </Button>
            )}
            {mode === 'edit' && (
              <Button type="button" variant="outline" disabled={deleting} onClick={handleDelete}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete post
              </Button>
            )}
          </div>
        </Section>

        <Section title="Cover image">
          {form.coverImageUrl ? (
            <div className="space-y-3">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.coverImageUrl} alt="" className="aspect-video w-full rounded-md border border-gray-200 object-cover" />
                <button type="button" onClick={() => { set('coverImageUrl', ''); set('coverImageAlt', ''); }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow ring-1 ring-gray-200 hover:text-red-600"
                  aria-label="Remove cover image">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <Field label="Alt text" hint="Describe the image for screen readers and search engines.">
                <Input value={form.coverImageAlt} onChange={(e) => set('coverImageAlt', e.target.value)}
                  placeholder="A wrapped corporate gift box on a desk" />
              </Field>
            </div>
          ) : (
            <button type="button" onClick={() => coverRef.current?.click()} disabled={uploading === 'cover'}
              className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-200 text-gray-500 transition hover:border-gray-400 hover:text-gray-700 disabled:cursor-wait">
              {uploading === 'cover' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <span className="text-xs font-medium">{uploading === 'cover' ? 'Uploading…' : 'Upload cover image'}</span>
              <span className="text-[11px] text-gray-400">JPG or PNG · max 5MB</span>
            </button>
          )}
          <input ref={coverRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'cover')} />
        </Section>

        <Section title="Organisation">
          <Field label="Category">
            <select
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Tags" hint="Press Enter or comma to add.">
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
                }}
                placeholder="diwali, sustainability"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}><Plus className="h-4 w-4" /></Button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                    {t}
                    <button type="button" onClick={() => set('tags', form.tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                      <X className="h-3 w-3 hover:text-red-600" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </Section>
      </div>
    </form>
  );
}
