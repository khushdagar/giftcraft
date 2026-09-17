import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { MockupStudio } from '@/components/admin/mockups/mockup-studio';

// Session-scoped admin page — must never be served from the render cache.
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Mockup Studio' };

export default async function AdminMockupsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-normal tracking-tight text-ink">Mockup Studio</h1>
        <p className="mt-1 text-sm text-ink-2">
          Pick a box and products, add the client logo and decide exactly which products carry it. The
          approved mockup brief is applied automatically — every result is also saved under Generated
          Images.
        </p>
      </div>
      <MockupStudio />
    </>
  );
}
