'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { slugify } from '@/lib/blog';

export interface AdminAuthor {
  id: string;
  name: string;
  slug: string;
  role: string;
  summary: string;
  bio: string[];
  credentials: string[];
  knowsAbout: string[];
  sameAs: string[];
}

/** The form keeps the array fields as plain text for easy editing. */
interface AuthorFormState {
  name: string;
  slug: string;
  role: string;
  summary: string;
  bio: string;         // paragraphs separated by a blank line
  credentials: string; // one per line
  knowsAbout: string;  // comma separated
  sameAs: string;      // one URL per line
}

const EMPTY: AuthorFormState = {
  name: '', slug: '', role: '', summary: '', bio: '', credentials: '', knowsAbout: '', sameAs: '',
};

function toForm(a: AdminAuthor): AuthorFormState {
  return {
    name: a.name,
    slug: a.slug,
    role: a.role,
    summary: a.summary,
    bio: a.bio.join('\n\n'),
    credentials: a.credentials.join('\n'),
    knowsAbout: a.knowsAbout.join(', '),
    sameAs: a.sameAs.join('\n'),
  };
}

function toPayload(f: AuthorFormState) {
  return {
    name: f.name.trim(),
    slug: slugify(f.slug || f.name),
    role: f.role.trim(),
    summary: f.summary.trim(),
    bio: f.bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    credentials: f.credentials.split('\n').map((l) => l.trim()).filter(Boolean),
    knowsAbout: f.knowsAbout.split(',').map((t) => t.trim()).filter(Boolean),
    sameAs: f.sameAs.split('\n').map((l) => l.trim()).filter(Boolean),
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function AuthorManager({
  initialAuthors,
  postCounts,
}: {
  initialAuthors: AdminAuthor[];
  postCounts: Record<string, number>;
}) {
  const router = useRouter();
  // null = closed, 'new' = creating, otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<AuthorFormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const set = <K extends keyof AuthorFormState>(key: K, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const openNew = () => { setForm(EMPTY); setEditing('new'); };
  const openEdit = (a: AdminAuthor) => { setForm(toForm(a)); setEditing(a.id); };
  const close = () => { setEditing(null); setForm(EMPTY); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Give the author a name');
    if (!form.role.trim()) return toast.error('Give the author a role');
    setSaving(true);
    try {
      const url = editing === 'new' ? '/api/admin/blog/authors' : `/api/admin/blog/authors/${editing}`;
      const res = await fetch(url, {
        method: editing === 'new' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPayload(form)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing === 'new' ? 'Author added' : 'Author saved');
      close();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: AdminAuthor) => {
    if (!confirm(`Delete author "${a.name}"? Their profile page stops existing.`)) return;
    setDeleting(a.id);
    try {
      const res = await fetch(`/api/admin/blog/authors/${a.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      toast.success('Author deleted');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const formCard = (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900">
        {editing === 'new' ? 'New author' : 'Edit author'}
      </h2>
      <div className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Role" hint="Shown under the name, e.g. “Content Lead, GIVOO”.">
            <Input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="Role or title" />
          </Field>
        </div>
        <Field label="Slug" hint={`Profile page URL: /blog/author/${slugify(form.slug || form.name) || '…'}`}>
          <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="Leave blank to derive from the name" />
        </Field>
        <Field label="Summary" hint="One sentence — used as the page's meta description and in the Person schema.">
          <Textarea rows={2} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
        </Field>
        <Field label="Bio" hint="Separate paragraphs with a blank line. Published verbatim on the profile page.">
          <Textarea rows={6} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
        </Field>
        <Field label="Credentials" hint="One per line — real, verifiable credentials only.">
          <Textarea rows={3} value={form.credentials} onChange={(e) => set('credentials', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Topics" hint="Comma separated — becomes Person.knowsAbout.">
            <Input value={form.knowsAbout} onChange={(e) => set('knowsAbout', e.target.value)} placeholder="Corporate gifting, GST, …" />
          </Field>
          <Field label="Profile links" hint="One full URL per line (LinkedIn etc.) — never placeholders.">
            <Textarea rows={2} value={form.sameAs} onChange={(e) => set('sameAs', e.target.value)} placeholder="https://www.linkedin.com/in/…" />
          </Field>
        </div>
        <div className="flex gap-2 border-t border-gray-100 pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing === 'new' ? 'Add author' : 'Save changes'}
          </Button>
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {editing === null && (
        <Button onClick={openNew} className="rounded-2xl bg-em px-6 py-2 font-normal hover:bg-em-600">
          <Plus className="mr-2 h-4 w-4" />
          Add author
        </Button>
      )}

      {editing === 'new' && formCard}

      <div className="space-y-3">
        {initialAuthors.map((a, i) => (
          <div key={a.id}>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                {a.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {a.name}
                  {i === 0 && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      Default byline
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {a.role} · {postCounts[a.name] ?? 0} post{(postCounts[a.name] ?? 0) === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button asChild variant="ghost" size="sm" title="View public profile page">
                  <Link href={`/blog/author/${a.slug}`} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(a)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(a)}
                  disabled={deleting === a.id}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  title="Delete"
                >
                  {deleting === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {editing === a.id && <div className="mt-3">{formCard}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
