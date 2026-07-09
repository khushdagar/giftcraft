import { redirect } from 'next/navigation';

// The pack detail now lives on the standard product page (a pack is a Product).
// Keep this old route working by redirecting to it.
export default function PackBundleRedirect({
  params,
}: {
  params: { collection: string; pack: string };
}) {
  redirect(`/products/${params.pack}`);
}
