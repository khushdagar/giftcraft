'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageCircle, CheckCircle2 } from 'lucide-react';
import { formatPostDate } from '@/lib/blog';

interface CommentItem {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

/** First letter of the name, for the avatar circle. */
function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/**
 * Public comment thread. Anyone can post, but a comment stays invisible until a
 * super_admin approves it — so a fresh submission shows a "waiting for review"
 * note rather than appearing in the list.
 */
export function BlogComments({ postId }: { postId: string }) {
  const queryClient = useQueryClient();

  const [authorName, setAuthorName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: comments = [], isLoading } = useQuery<CommentItem[]>({
    queryKey: ['blog-comments', postId],
    queryFn: async () => {
      const res = await fetch(`/api/blog/comments?postId=${postId}`);
      if (!res.ok) throw new Error('Failed to load comments');
      return (await res.json()).data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/blog/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, authorName, email, body, website }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not post your comment');
      return json;
    },
    onSuccess: () => {
      setSubmitted(true);
      setBody('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['blog-comments', postId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (authorName.trim().length < 2) return setError('Please enter your name');
    if (!email.includes('@')) return setError('Please enter a valid email');
    if (body.trim().length < 4) return setError('Please write a comment');
    submit.mutate();
  };

  return (
    <section className="mx-auto mt-16 max-w-7xl border-t border-bdr pt-10">
      <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-ink">
        <MessageCircle className="h-5 w-5 text-em" />
        Comments
        {comments.length > 0 && <span className="text-ink-3">({comments.length})</span>}
      </h2>

      {/* Thread */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-ink-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading comments…
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-ink-3">No comments yet. Start the conversation below.</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="rounded-md border-2 border-bdr bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-em-50 text-sm font-bold text-em">
                    {initial(c.authorName)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{c.authorName}</p>
                    <p className="text-xs text-ink-3">{formatPostDate(new Date(c.createdAt))}</p>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-2">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Form */}
      <div className="mt-8 rounded-md border-2 border-bdr bg-white p-5 md:p-6">
        {submitted ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-em" />
            <div>
              <p className="text-sm font-bold text-ink">Thanks — your comment is in.</p>
              <p className="mt-1 text-sm text-ink-2">
                It will appear here once our team has reviewed it.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-3 text-sm font-semibold text-em hover:underline"
              >
                Write another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <h3 className="text-base font-bold text-ink">Leave a comment</h3>
            <p className="mt-1 text-xs text-ink-3">
              Your email is never published. Comments are reviewed before they appear.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
                autoComplete="name"
                aria-label="Your name"
                className="rounded-md border-2 border-bdr bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition focus:border-em"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Your email (not published)"
                maxLength={120}
                autoComplete="email"
                aria-label="Your email"
                className="rounded-md border-2 border-bdr bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition focus:border-em"
              />
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Share your thoughts…"
              maxLength={2000}
              aria-label="Your comment"
              className="mt-3 w-full resize-y rounded-md border-2 border-bdr bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition focus:border-em"
            />

            {/* Honeypot — hidden from people, irresistible to bots. */}
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
            />

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submit.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-em px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Post comment
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
