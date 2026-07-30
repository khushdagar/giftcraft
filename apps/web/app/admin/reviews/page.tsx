import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Star } from 'lucide-react';
import { ReviewActions } from './components/review-actions';

export const dynamic = 'force-dynamic';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-em-50 text-em-700',
  rejected: 'bg-recessed text-ink-2',
};

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const statusFilter = searchParams.status;
  const validFilter = ['pending', 'approved', 'rejected'].includes(statusFilter || '')
    ? statusFilter
    : undefined;

  const [reviews, pendingCount] = await Promise.all([
    prisma.review.findMany({
      where: validFilter ? { status: validFilter as any } : undefined,
      include: {
        product: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.count({ where: { status: 'pending' } }),
  ]);

  const filters = [
    { label: 'All', value: undefined },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-normal tracking-tight text-ink">Reviews</h1>
            <p className="mt-1 text-sm text-ink-2">
              {reviews.length} review{reviews.length === 1 ? '' : 's'}
              {validFilter ? ` (${validFilter})` : ' total'}
              {pendingCount > 0 && !validFilter && ` — ${pendingCount} awaiting approval`}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {filters.map((f) => {
            const active = validFilter === f.value;
            return (
              <Link
                key={f.label}
                href={f.value ? `/admin/reviews?status=${f.value}` : '/admin/reviews'}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? 'bg-dark text-white'
                    : 'border border-bdr text-ink-2 hover:bg-elevated'
                }`}
              >
                {f.label}
                {f.value === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="border border-bdr rounded-lg overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-elevated border-b border-bdr">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Product</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Review</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">By</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Status</th>
              <th className="px-6 py-4 text-right text-xs font-normal text-ink-2 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bdr">
            {reviews.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-ink-2">
                  No reviews {validFilter ? `with status "${validFilter}"` : 'yet'}. Customer
                  reviews appear here for moderation before going live.
                </td>
              </tr>
            )}
            {reviews.map((review) => (
              <tr key={review.id} className="hover:bg-canvas">
                <td className="px-6 py-4 align-top">
                  <Link
                    href={`/products/${review.product.slug}`}
                    target="_blank"
                    className="text-sm font-medium text-ink hover:underline"
                  >
                    {review.product.name}
                  </Link>
                  <p className="mt-1 text-xs text-ink-2">
                    {new Date(review.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </td>
                <td className="px-6 py-4 align-top">
                  <span className="inline-flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= review.rating ? 'fill-gold text-gold' : 'fill-bdr text-bdr'
                        }`}
                      />
                    ))}
                  </span>
                  {review.title && (
                    <p className="mt-1 text-sm font-medium text-ink">{review.title}</p>
                  )}
                  <p className="mt-1 max-w-md text-xs text-ink-2 line-clamp-3">
                    {review.comment}
                  </p>
                </td>
                <td className="px-6 py-4 align-top">
                  <p className="text-sm text-ink">{review.user?.name || 'User'}</p>
                  <p className="text-xs text-ink-2">{review.user?.email}</p>
                  {review.isVerifiedBuyer && (
                    <span className="mt-1 inline-block rounded-full bg-em-50 px-2 py-0.5 text-[11px] font-medium text-em">
                      Verified Buyer
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 align-top">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-normal capitalize ${
                      statusColors[review.status] || 'bg-recessed text-ink-2'
                    }`}
                  >
                    {review.status}
                  </span>
                </td>
                <td className="px-6 py-4 align-top">
                  <div className="flex justify-end">
                    <ReviewActions reviewId={review.id} currentStatus={review.status} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
