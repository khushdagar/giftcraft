// Shared palette and escaping helpers for every outbound email.
// Kept dependency-free so the HTML builders can be unit-tested in isolation.
//
// The palette is a strict subset of the website's Tailwind theme
// (apps/web/tailwind.config.ts): Burgundy brand + the ivory/graphite neutral
// tier. No other hues — emails must look like the site, not like a template.

export const COLORS = {
  brand: '#800020',      // em.DEFAULT — Burgundy
  brandDark: '#6B001B',  // em.600
  brandTint: '#F6E6E9',  // em.100 — badge / callout backgrounds
  ink: '#222222',        // ink.DEFAULT — headings
  body: '#5C5852',       // ink.2 — body copy
  muted: '#8F8A82',      // ink.3 — labels, meta
  faint: '#8F8A82',
  border: '#DED7CA',     // gold.200 — hairlines
  surface: '#FAFAFA',    // elevated — cards
  recessed: '#EDE7DC',   // recessed — inset panels
  page: '#F5F1EB',       // canvas — page background
};

export const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

/**
 * Absolute URL to the GIVOO wordmark. Mail clients can't resolve relative
 * paths, so this must always be fully-qualified.
 */
export const LOGO_URL = `${(process.env.NEXT_PUBLIC_APP_URL || 'https://givoo.in').replace(/\/$/, '')}/givoo_logo.png`;

export const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
