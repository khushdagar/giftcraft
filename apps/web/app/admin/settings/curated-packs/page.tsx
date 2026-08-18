import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCuratedPackEntries } from '@/lib/curated-pack-entries';
import { CuratedPacksSettings } from '@/components/admin/settings/curated-packs-settings';

export const dynamic = 'force-dynamic';

export default async function CuratedPacksSettingsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const entries = await getCuratedPackEntries();

  return (
    <CuratedPacksSettings
      initial={entries.map((e) => ({
        slug: e.slug,
        name: e.name,
        href: `/curated-packs/${e.slug}`,
        gradient: e.gradient,
        image: e.image ?? '',
        description: e.description,
      }))}
    />
  );
}
