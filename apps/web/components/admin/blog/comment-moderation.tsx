'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, X, Trash2, Loader2, ExternalLink } from 'lucide-react';

export type AdminComment = {
  id: string;
  authorName: string;
  email: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  postTitle: string;
  postSlug: string;
};

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
] as const;

const STATUS_STYLES: Record<AdminComment['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

/**
 * Moderation queue. Nothing a reader submits is public until it is approved
 * here, so Pending is the default tab.
 */
export function CommentModeration({ comments }: { comments: AdminComment[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<AdminComment['status']>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = comments.filter((c) => c.status === tab);
  const countFor = (status: AdminComment['status']) =>
    comments.filter((c) => c.status === status).length;

  const setStatus = async (id: string, status: AdminComment['status']) => {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/blog/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
      toast.success(status === 'approved' ? 'Comment published' : 'Comment rejected');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: AdminComment) => {
    if (!confirm(`Delete this comment from ${c.authorName}? This cannot be undone.`)) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/blog/comments?id=${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      toast.success('Comment deleted');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              tab === t.key
                ? 'border-ink bg-ink text-white'
                : 'border-bdr text-ink-2 hover:border-ink'
            }`}
          >
            {t.label}
            <span className={tab === t.key ? 'ml-1.5 opacity-70' : 'ml-1.5 text-ink-3'}>
              {countFor(t.key)}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-lg border-2 border-dashed border-bdr py-16 text-center">
          <p className="text-sm text-ink-2">No {tab} comments.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((c) => (
            <li key={c.id} className="rounded-lg border border-bdr bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {c.authorName}{' '}
                    <span className="font-normal text-ink-3">· {c.email}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-3">
                    {new Date(c.createdAt).toLocaleString('en-IN')} · on{' '}
                    <Link
                      href={`/blog/${c.postSlug}`}
                      target="_blank"
                      className="inline-flex items-center gap-0.5 hover:text-ink hover:underline"
                    >
                      {c.postTitle}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}
                >
                  {c.status}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-2">{c.body}</p>

              <div className="mt-3 flex items-center gap-2 border-t border-bdr pt-3">
                {c.status !== 'approved' && (
                  <button
                    onClick={() => setStatus(c.id, 'approved')}
                    disabled={busyId === c.id}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-em px-4 py-1.5 text-sm text-white transition hover:bg-em-600 disabled:opacity-50"
                  >
                    {busyId === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </button>
                )}
                {c.status !== 'rejected' && (
                  <button
                    onClick={() => setStatus(c.id, 'rejected')}
                    disabled={busyId === c.id}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-bdr px-4 py-1.5 text-sm text-ink-2 transition hover:border-ink hover:text-ink disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </button>
                )}
                <button
                  onClick={() => remove(c)}
                  disabled={busyId === c.id}
                  aria-label="Delete comment"
                  className="ml-auto rounded p-2 text-ink-3 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
