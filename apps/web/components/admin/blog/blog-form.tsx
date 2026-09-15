'use client';

import { compressAndUpload } from '@/hooks/use-compressed-upload';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Upload, X, Trash2, Plus, LibraryBig, Check, AlertCircle, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { MediaLibraryModal } from '@/components/admin/media-library-modal';
import { slugify, parseTags, autoExcerpt, readingMinutes, stripHtml, extractFaqs } from '@/lib/blog';

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
  categoryName: string;
  authorName: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImageUrl: string;
  noIndex: boolean;
}

const EMPTY: BlogPostFormData = {
  title: '', slug: '', excerpt: '', content: '', coverImageUrl: '', coverImageAlt: '',
  status: 'draft', publishedAt: '', isFeatured: false, tags: [], categoryName: '', authorName: '',
  metaTitle: '', metaDescription: '', canonicalUrl: '', ogImageUrl: '', noIndex: false,
};

const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://givoo.in';

/** Sentinel value for the dropdown's "add one" row — never sent to the API. */
const NEW_CATEGORY = '__new__';

/** Quiet period after the last keystroke before the draft is autosaved. */
const AUTOSAVE_DELAY_MS = 4000;

type Autosave =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved'; at: Date }
  /** Only backed up in this browser — the post is live, or not saveable yet. */
  | { state: 'local'; at: Date }
  | { state: 'error'; error: string };

const backupKey = (id: string | undefined) => `givoo:blog-backup:${id ?? 'new'}`;
const timeLabel = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
  authors,
}: {
  mode: 'create' | 'edit';
  post?: BlogPostFormData;
  /** Names already in use — suggestions only; any new name creates a category. */
  categories: string[];
  /** Author entities from /admin/blog/authors. The first is the default byline. */
  authors: Array<{ name: string; role: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<BlogPostFormData>(post ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  // Swaps the dropdown for a free-text box so a new category can be named.
  const [creatingCategory, setCreatingCategory] = useState(false);
  // Once the user edits the slug by hand, stop deriving it from the title.
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const coverRef = useRef<HTMLInputElement>(null);

  // A new post gets an id from its first autosave; later saves update it.
  const [postId, setPostId] = useState(post?.id);
  const postIdRef = useRef(post?.id);
  // Status as stored on the server. Autosave only writes to drafts, so
  // half-finished edits never go live on a published post.
  const [storedStatus, setStoredStatus] = useState<BlogPostFormData['status']>(post?.status ?? 'draft');
  const [autosave, setAutosave] = useState<Autosave>({ state: 'idle' });
  const [backup, setBackup] = useState<{ form: BlogPostFormData; savedAt: string } | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const savedJson = useRef(JSON.stringify(post ?? EMPTY));
  const inflight = useRef<Promise<void> | null>(null);
  const savingRef = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;

  const formJson = useMemo(() => JSON.stringify(form), [form]);
  const dirty = formJson !== savedJson.current;

  const set = <K extends keyof BlogPostFormData>(key: K, value: BlogPostFormData[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  // The post's own category may not be in the list yet (it could be the only
  // post using it), so fold it in rather than silently dropping the selection.
  const categoryOptions = useMemo(() => {
    const names = new Set(categories);
    if (form.categoryName) names.add(form.categoryName);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [categories, form.categoryName]);

  const wordCount = useMemo(() => stripHtml(form.content).split(/\s+/).filter(Boolean).length, [form.content]);
  const minutes = useMemo(() => (form.content ? readingMinutes(form.content) : 0), [form.content]);
  // Same extractor the public page uses to emit FAQPage JSON-LD, so the author
  // can see whether their FAQ section will be picked up before publishing.
  const faqCount = useMemo(() => extractFaqs(form.content).length, [form.content]);

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

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const data = await compressAndUpload(file, { folder: 'blog' });
      set('coverImageUrl', data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (coverRef.current) coverRef.current.value = '';
    }
  };

  const clearBackup = () => {
    try {
      localStorage.removeItem(backupKey(undefined));
      if (postIdRef.current) localStorage.removeItem(backupKey(postIdRef.current));
    } catch { /* storage unavailable */ }
  };

  /** Writes the post to the server, creating it on the first save. */
  const persist = async (snapshot: BlogPostFormData, status: BlogPostFormData['status']) => {
    const id = postIdRef.current;
    const res = await fetch(id ? `/api/admin/blog/${id}` : '/api/admin/blog', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...snapshot,
        status,
        slug: slugify(snapshot.slug || snapshot.title),
        // datetime-local gives local time; send a real ISO instant.
        publishedAt: snapshot.publishedAt ? new Date(snapshot.publishedAt).toISOString() : '',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');
    if (!id) {
      postIdRef.current = data.data.id;
      setPostId(data.data.id);
      setSlugTouched(true);
      // Reloading the tab should reopen this post, not a blank "new" form.
      window.history.replaceState(null, '', `/admin/blog/${data.data.id}/edit`);
    }
    savedJson.current = JSON.stringify(snapshot);
    setStoredStatus(status);
    clearBackup();
  };

  // Offer to restore edits that never reached the server (closed tab, crash).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(backupKey(post?.id));
      if (!raw) return;
      const saved = JSON.parse(raw) as { form: BlogPostFormData; savedAt: string };
      if (JSON.stringify(saved.form) !== savedJson.current) setBackup(saved);
      else localStorage.removeItem(backupKey(post?.id));
    } catch { /* storage unavailable or corrupt */ }
    // Mount only — later changes are this session's own edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave: back up every change locally, and save drafts to the server.
  useEffect(() => {
    if (formJson === savedJson.current) return;
    const timer = setTimeout(() => {
      const snapshot = formRef.current;
      try {
        localStorage.setItem(
          backupKey(postIdRef.current),
          JSON.stringify({ form: snapshot, savedAt: new Date().toISOString() })
        );
      } catch { /* storage unavailable */ }

      const canSaveDraft =
        snapshot.status === 'draft' && storedStatus === 'draft' &&
        !!snapshot.title.trim() && !!stripHtml(snapshot.content);
      if (!canSaveDraft) {
        setAutosave({ state: 'local', at: new Date() });
        return;
      }
      if (savingRef.current || inflight.current) return;

      setAutosave({ state: 'saving' });
      inflight.current = persist(snapshot, 'draft')
        .then(() => {
          setAutosave({ state: 'saved', at: new Date() });
          // Edits made while the request was out need their own save.
          if (formRef.current !== snapshot) setRetryTick((t) => t + 1);
        })
        .catch((err) => setAutosave({ state: 'error', error: err instanceof Error ? err.message : 'Autosave failed' }))
        .finally(() => { inflight.current = null; });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // persist/storedStatus are read at fire time; re-arming on them would double-save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formJson, retryTick]);

  // Warn before closing the tab with changes that aren't on the server.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

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
    savingRef.current = true;
    try {
      // Let a running autosave finish, or a new post would be created twice.
      await inflight.current;
      const isNew = !postIdRef.current;
      await persist(form, status);

      toast.success(isNew ? 'Post created' : 'Post saved');
      router.push('/admin/blog');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleDelete = async () => {
    if (!postId) return;
    if (!confirm(`Delete "${form.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/${postId}`, { method: 'DELETE' });
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
        {backup && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <History className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              Unsaved changes from {new Date(backup.savedAt).toLocaleString()} were found in this browser.
            </span>
            <Button type="button" size="sm" onClick={() => { setForm(backup.form); setBackup(null); }}>
              Restore
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setBackup(null);
                try { localStorage.removeItem(backupKey(post?.id)); } catch { /* storage unavailable */ }
              }}
            >
              Discard
            </Button>
          </div>
        )}

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
          <RichTextEditor
            value={form.content}
            onChange={(html) => set('content', html)}
            placeholder="Write your post…"
            uploadFolder="blog"
            maxHeight="70vh"
          />
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

          {/* FAQ structured data is derived from the body — surface the result here. */}
          <div
            className={`rounded-md border p-3 text-xs ${
              faqCount > 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-gray-200 bg-gray-50 text-gray-600'
            }`}
          >
            <span className="font-medium">FAQ schema:</span>{' '}
            {faqCount > 0
              ? `${faqCount} question${faqCount === 1 ? '' : 's'} detected — FAQPage structured data is added to the page automatically.`
              : 'none yet. Use Insert → FAQ section in the editor and add your questions; FAQPage structured data is generated from them automatically.'}
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
      {/* Scrolls on its own so every option is reachable without scrolling the post. */}
      <div className="space-y-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
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

          <Field label="Author" hint="The byline shown on the post, linked to the author's profile page. Manage authors from the blog list.">
            <select
              value={form.authorName || authors[0]?.name || ''}
              onChange={(e) => set('authorName', e.target.value)}
              className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
            >
              {authors.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name} — {a.role}
                </option>
              ))}
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
            <p className={`flex items-start gap-1.5 text-[11px] ${autosave.state === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
              {autosave.state === 'saving' && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving draft…</>}
              {autosave.state === 'saved' && <><Check className="h-3.5 w-3.5 text-emerald-600" /> Draft saved at {timeLabel(autosave.at)}</>}
              {autosave.state === 'error' && <><AlertCircle className="h-3.5 w-3.5 shrink-0" /> Autosave failed: {autosave.error}</>}
              {autosave.state === 'local' && (
                <span>
                  Changes backed up in this browser at {timeLabel(autosave.at)}.{' '}
                  {form.status === 'draft' && storedStatus === 'draft'
                    ? 'Add a title and content to autosave the draft.'
                    : 'Click Save to apply them — autosave never changes a live post.'}
                </span>
              )}
              {autosave.state === 'idle' && (storedStatus === 'draft' ? 'Drafts save automatically while you edit.' : '')}
            </p>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {postId ? 'Save changes' : 'Create post'}
            </Button>
            {form.status !== 'published' && (
              <Button type="button" variant="outline" disabled={saving} onClick={(e) => handleSubmit(e, 'published')}>
                Save &amp; publish
              </Button>
            )}
            {postId && (
              <Button type="button" variant="outline" disabled={deleting} onClick={handleDelete}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete post
              </Button>
            )}
          </div>
        </Section>

        <Section title="Cover image" hint="Also the preview image when the post is shared on WhatsApp, LinkedIn, etc. Landscape, 1200×630 works best.">

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
            <button type="button" onClick={() => coverRef.current?.click()} disabled={uploading}
              className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-200 text-gray-500 transition hover:border-gray-400 hover:text-gray-700 disabled:cursor-wait">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <span className="text-xs font-medium">{uploading ? 'Uploading…' : 'Upload cover image'}</span>
              <span className="text-[11px] text-gray-400">JPG or PNG · max 5MB</span>
            </button>
          )}
          {!form.coverImageUrl && (
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setLibraryOpen(true)}>
              <LibraryBig className="h-4 w-4" />
              Choose from library
            </Button>
          )}
          <input ref={coverRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
        </Section>

        <Section title="Organisation">
          <Field
            label="Category"
            hint="Mirrors the shop categories. Add a new name for anything the catalogue doesn't cover — it only shows on the blog once a post uses it."
          >
            <select
              value={creatingCategory ? NEW_CATEGORY : form.categoryName}
              onChange={(e) => {
                if (e.target.value === NEW_CATEGORY) {
                  setCreatingCategory(true);
                  set('categoryName', '');
                } else {
                  setCreatingCategory(false);
                  set('categoryName', e.target.value);
                }
              }}
              className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="">Uncategorised</option>
              {/* An existing post can hold a category no other post uses. */}
              {categoryOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
              <option value={NEW_CATEGORY}>+ New category…</option>
            </select>

            {creatingCategory && (
              <div className="mt-2 flex gap-2">
                <Input
                  autoFocus
                  value={form.categoryName}
                  onChange={(e) => set('categoryName', e.target.value.slice(0, 60))}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  placeholder="New category name"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setCreatingCategory(false); set('categoryName', ''); }}
                >
                  Cancel
                </Button>
              </div>
            )}
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

      {/* Pick an already-uploaded image for the cover. Sits inside the form;
          every control in the modal is type="button" and its search box
          swallows Enter, so nothing here can submit the post. */}
      {libraryOpen && (
        <MediaLibraryModal
          multiple={false}
          title="Choose a cover image"
          onClose={() => setLibraryOpen(false)}
          onConfirm={([picked]) => {
            if (!picked) return;
            setForm((p) => ({
              ...p,
              coverImageUrl: picked.url,
              coverImageAlt: p.coverImageAlt || picked.altText || '',
            }));
          }}
        />
      )}
    </form>
  );
}
