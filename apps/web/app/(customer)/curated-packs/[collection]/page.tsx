import { permanentRedirect } from 'next/navigation';

// Gift collections used to live at /curated-packs/<slug>. They are no longer a
// customer-facing rung — packs are browsed by budget and by occasion — so every
// old collection URL lands on the hub instead of 404ing. The real destinations,
// /curated-packs/budget and /curated-packs/occasions, are static segments and
// take precedence over this catch-all.
export default function LegacyCollectionRedirect() {
  permanentRedirect('/curated-packs');
}
