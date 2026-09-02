import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { BlogForm } from '@/components/admin/blog/blog-form';
import { blogCategoryOptions } from '@/lib/blog-categories';
import { getAuthors } from '@/lib/authors';

export const dynamic = 'force-dynamic';

export default async function NewBlogPostPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') redirect('/');

  const categories = await blogCategoryOptions();
  const authors = (await getAuthors()).map((a) => ({ name: a.name, role: a.role }));

  return (
    <>
      <div className="mb-6">
        <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
          <ChevronLeft className="h-4 w-4" />
          Back to posts
        </Link>
        <h1 className="mt-2 text-3xl font-normal tracking-tight text-ink">New Post</h1>
      </div>

      <BlogForm mode="create" categories={categories} authors={authors} />
    </>
  );
}
