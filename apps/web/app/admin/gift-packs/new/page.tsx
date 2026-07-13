import { redirect } from 'next/navigation';

// Curated packs are now created inside a collection. Redirect old bookmarks to
// the Curated Collections list, where a collection is opened first.
export default function NewGiftPackPage() {
  redirect('/admin/products?view=packs');
}
