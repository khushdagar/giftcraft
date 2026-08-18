import { permanentRedirect } from 'next/navigation';

// Gift collections are no longer a customer-facing rung — curated packs are
// browsed by budget and by occasion. Every old collection URL lands on the hub
// so the link keeps working and its equity transfers.
export default function CollectionRedirect() {
  permanentRedirect('/curated-packs');
}
