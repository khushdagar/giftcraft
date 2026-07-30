'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, BadgeCheck, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  isVerifiedBuyer: boolean;
  authorName: string;
  createdAt: string;
}

interface OwnReview {
  rating: number;
  title: string | null;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ReviewsPayload {
  reviews: ReviewItem[];
  summary: { average: number; total: number; counts: Record<number, number> };
  ownReview: OwnReview | null;
}

function Stars({ rating, size = 'h-4 w-4' }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size} ${s <= rating ? 'fill-gold text-gold' : 'fill-bdr text-bdr'}`}
        />
      ))}
    </span>
  );
}

export function ProductReviews({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ReviewsPayload>({
    queryKey: ['reviews', slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/${slug}/reviews`);
      if (!res.ok) throw new Error('Failed to load reviews');
      const json = await res.json();
      return json.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/products/${slug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title, comment }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to submit review');
      return json;
    },
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const openForm = () => {
    // Pre-fill with the user's existing review when editing.
    if (data?.ownReview) {
      setRating(data.ownReview.rating);
      setTitle(data.ownReview.title || '');
      setComment(data.ownReview.comment);
    }
    setFormError(null);
    setOpen(true);
  };

  const handleSubmit = () => {
    setFormError(null);
    if (rating < 1) {
      setFormError('Please select a star rating');
      return;
    }
    if (comment.trim().length < 10) {
      setFormError('Please write at least 10 characters about the product');
      return;
    }
    submitMutation.mutate();
  };

  const summary = data?.summary;
  const reviews = data?.reviews || [];
  const ownReview = data?.ownReview;

  return (
    <div className="border-t border-bdr bg-white py-12">
      <div className="container-gc-w">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="overline text-ink-3">REVIEWS</p>
            <h2 className="mt-1 text-t-heading font-semibold tracking-tight text-ink">
              Ratings &amp; Reviews
            </h2>
          </div>
          {session ? (
            <button
              type="button"
              onClick={openForm}
              className="rounded-gc-p bg-em px-6 py-3 text-sm font-semibold text-white transition hover:bg-em-600"
            >
              {ownReview ? 'Edit your review' : 'Write a review'}
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-gc-p border-2 border-bdr px-6 py-3 text-sm font-semibold text-ink-2 transition hover:border-em hover:text-em"
            >
              Sign in to write a review
            </Link>
          )}
        </div>

        {/* Own review pending note */}
        {ownReview && ownReview.status === 'pending' && (
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Your review has been submitted and is awaiting approval. It will appear
            here once our team approves it.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-ink-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…
          </div>
        ) : !summary || summary.total === 0 ? (
          <div className="rounded-md border border-bdr bg-canvas px-6 py-12 text-center">
            <Stars rating={0} size="h-5 w-5" />
            <p className="mt-3 text-sm text-ink-2">
              No reviews yet. Be the first to share your experience with this product.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
            {/* Summary */}
            <div className="h-fit rounded-md border border-bdr bg-canvas p-6 lg:sticky lg:top-6">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black tabnum leading-none text-ink">
                  {summary.average.toFixed(1)}
                </span>
                <span className="pb-1 text-sm text-ink-2">/ 5</span>
              </div>
              <div className="mt-2">
                <Stars rating={Math.round(summary.average)} size="h-5 w-5" />
              </div>
              <p className="mt-1 text-sm text-ink-2">
                Based on {summary.total} review{summary.total === 1 ? '' : 's'}
              </p>

              <div className="mt-5 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary.counts[star] || 0;
                  const pct = summary.total ? (count / summary.total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs text-ink-2">
                      <span className="w-3 tabnum">{star}</span>
                      <Star className="h-3 w-3 fill-gold text-gold" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-recessed">
                        <div
                          className="h-full rounded-full bg-gold"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 text-right tabnum">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Review list */}
            <div className="divide-y divide-bdr">
              {reviews.map((review) => (
                <div key={review.id} className="py-5 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={review.rating} />
                    {review.title && (
                      <h3 className="text-sm font-semibold text-ink">{review.title}</h3>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">
                    {review.comment}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                    <span className="font-medium text-ink-2">{review.authorName}</span>
                    {review.isVerifiedBuyer && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-em-50 px-2 py-0.5 font-medium text-em">
                        <BadgeCheck className="h-3 w-3" /> Verified Buyer
                      </span>
                    )}
                    <span>
                      {new Date(review.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Write / edit review dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{ownReview ? 'Edit your review' : 'Write a review'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Star picker */}
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Your rating</p>
              <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHovered(s)}
                    aria-label={`Rate ${s} star${s === 1 ? '' : 's'}`}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        s <= (hovered || rating)
                          ? 'fill-gold text-gold'
                          : 'fill-bdr text-bdr'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="review-title" className="mb-2 block text-sm font-medium text-ink">
                Title <span className="text-ink-3">(optional)</span>
              </label>
              <input
                id="review-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g. Perfect for our Diwali hampers"
                className="w-full rounded-md border-2 border-bdr px-3 py-2 text-sm focus:border-em focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="review-comment" className="mb-2 block text-sm font-medium text-ink">
                Your review
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="How was the product quality, branding and delivery?"
                className="w-full rounded-md border-2 border-bdr px-3 py-2 text-sm focus:border-em focus:outline-none"
              />
            </div>

            {formError && <p className="text-sm text-err">{formError}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-gc-p border-2 border-bdr px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:border-bdr-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="inline-flex items-center gap-2 rounded-gc-p bg-em px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-em-600 disabled:opacity-50"
              >
                {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit review
              </button>
            </div>

            <p className="text-xs text-ink-3">
              Reviews are published after a quick moderation check by our team.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
