import { redirect } from 'next/navigation';

// Curated Packs now live under the Products admin behind a segmented toggle
// ("Products | Curated Packs"). Keep this route as a redirect so old links and
// bookmarks still land on the merged list.
export default function AdminGiftPacksPage() {
  redirect('/admin/products?view=packs');
}
