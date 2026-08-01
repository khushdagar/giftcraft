import { permanentRedirect } from 'next/navigation';

// The pack detail now lives on the standard product page (a pack is a Product).
// 308 permanent redirect so search engines transfer the old URL's equity.
export default function PackBundleRedirect({
  params,
}: {
  params: { collection: string; pack: string };
}) {
  permanentRedirect(`/products/${params.pack}`);
}
