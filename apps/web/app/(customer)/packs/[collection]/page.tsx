import { permanentRedirect } from 'next/navigation';

// Collection pages moved to /curated-packs/<slug>. 308 permanent redirect so
// search engines transfer the old URL's equity.
export default function CollectionRedirect({ params }: { params: { collection: string } }) {
  permanentRedirect(`/curated-packs/${params.collection}`);
}
