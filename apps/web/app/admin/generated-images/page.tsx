import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generatedImageDownloadUrl } from '@/lib/generated-image-download';

// Session-scoped admin page — must never be served from the render cache.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 48;

export default async function AdminGeneratedImagesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const page = Math.max(1, Number(searchParams.page) || 1);
  const [total, images] = await Promise.all([
    prisma.generatedPackImage.count(),
    prisma.generatedPackImage.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-normal tracking-tight text-ink">Generated Images</h1>
        <p className="mt-1 text-sm text-ink-2">
          {total} AI pack image{total === 1 ? '' : 's'} created from the proposal builder — download
          any of them at any time.
        </p>
      </div>

      {images.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <p className="text-sm text-gray-500">No images generated yet.</p>
          <Link
            href="/admin/proposals/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Create a proposal
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="overflow-hidden rounded-lg border border-bdr bg-white">
              <a
                href={img.url}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-[5/4] bg-gray-50"
                title="Open full size"
              >
                <Image
                  src={img.url}
                  alt={img.packLabel || 'Generated pack image'}
                  fill
                  sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                  unoptimized
                  className="object-cover"
                />
              </a>
              <div className="space-y-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-ink">
                    {img.packLabel || 'Untitled pack'}
                  </p>
                  {img.logoUrl && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      Client logo
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-ink-2">
                  {[img.companyName, img.boxName].filter(Boolean).join(' · ') || '—'}
                </p>
                <p className="line-clamp-2 text-xs text-gray-500" title={img.productNames.join(', ')}>
                  {img.productNames.join(', ')}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs tabular-nums text-gray-400">
                    {img.createdAt.toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Kolkata',
                    })}
                  </span>
                  <a
                    href={generatedImageDownloadUrl(img.url, img.packLabel || 'pack')}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-ink-2">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/generated-images?page=${page - 1}`}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-100"
              >
                Previous
              </Link>
            )}
            {page < pages && (
              <Link
                href={`/admin/generated-images?page=${page + 1}`}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-100"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
