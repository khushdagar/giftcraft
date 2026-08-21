/**
 * URL redirect helpers — shared by the admin API, the public rule feed and the
 * middleware that actually performs the redirect.
 *
 * Nothing here may import Prisma or any Node built-in: middleware runs in the
 * Edge runtime, so this file has to stay pure.
 */

export type RedirectStatus = 301 | 302 | 410;

export interface RedirectRule {
  /** Normalised path. A trailing "/*" makes it a prefix rule. */
  source: string;
  /** Path or absolute URL. Empty when status is 410. */
  destination: string;
  status: RedirectStatus;
}

/** Paths the site owns — a redirect here would break the app, not fix SEO. */
const RESERVED = ['/api', '/_next', '/admin', '/dashboard', '/login', '/vendor'];

/**
 * Bring a URL to the form we store and compare on:
 *   full URL → path, trailing slash dropped, query and hash dropped, lowercased.
 *
 * Lowercasing is safe because every route the storefront generates is already
 * lowercase, and it means a pasted "…/Corporate-Gifts" from a GSC export still
 * matches. Query strings are dropped on purpose: the rule matches the page, and
 * middleware re-attaches the visitor's own query to the destination.
 */
export function normalizeSource(input: string): string {
  let value = (input ?? '').toString().trim();
  if (!value) return '';

  // Accept a full URL pasted straight out of Search Console.
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      return '';
    }
  }

  value = (value.split('#')[0] ?? '').split('?')[0] ?? '';
  if (!value.startsWith('/')) value = `/${value}`;
  value = value.replace(/\/{2,}/g, '/');
  // Keep a "/*" suffix intact while stripping an ordinary trailing slash.
  const wildcard = value.endsWith('/*');
  if (wildcard) value = value.slice(0, -2);
  if (value.length > 1) value = value.replace(/\/+$/, '');

  return (value.toLowerCase() || '/') + (wildcard ? '/*' : '');
}

/** Same normalisation for the target, but absolute URLs are left untouched. */
export function normalizeDestination(input: string): string {
  const value = (input ?? '').toString().trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const wildcard = value.endsWith('/*');
  const path = normalizeSource(wildcard ? value.slice(0, -2) : value);
  return wildcard ? `${path}/*` : path;
}

export function parseStatus(input: unknown): RedirectStatus | null {
  const value = (input ?? '').toString().trim().toLowerCase();
  if (!value) return 301;
  if (['301', 'permanent', 'permanent (301)', 'p'].includes(value)) return 301;
  if (['302', '307', 'temporary', 'temporary (302)', 't', 'temp'].includes(value)) return 302;
  if (['410', 'gone', 'gone (410)', 'removed'].includes(value)) return 410;
  return null;
}

/**
 * Validate one rule in isolation. Cross-rule checks (chains, duplicates) need
 * the database and live in the API route.
 */
export function validateRule(
  source: string,
  destination: string,
  status: RedirectStatus
): string | null {
  if (!source) return 'Old URL is required';
  if (!source.startsWith('/')) return 'Old URL must be a path starting with /';
  if (source === '/' || source === '/*') return 'The homepage cannot be redirected';
  const bare = source.endsWith('/*') ? source.slice(0, -2) : source;
  if (RESERVED.some((p) => bare === p || bare.startsWith(`${p}/`))) {
    return `${bare} is an application route and cannot be redirected`;
  }

  if (status === 410) return null;

  if (!destination) return 'New URL is required (leave it blank only for "Gone (410)")';
  if (!destination.startsWith('/') && !/^https?:\/\//i.test(destination)) {
    return 'New URL must be a path starting with / or a full https:// URL';
  }
  if (destination === source) return 'Old and new URL are the same';
  if (source.endsWith('/*') && destination.endsWith('/*')) {
    const from = source.slice(0, -2);
    const to = destination.slice(0, -2);
    // /blog/* → /blog/sub/* would redirect its own target, forever.
    if (to === from || to.startsWith(`${from}/`)) {
      return 'A wildcard cannot point inside the path it matches — it would loop';
    }
  }
  return null;
}

/** Prefix rules are tried longest-first so /blog/news/* beats /blog/*. */
export function sortRules(rules: RedirectRule[]): RedirectRule[] {
  return [...rules].sort((a, b) => b.source.length - a.source.length);
}

/**
 * Find the rule for a request path, and work out where it goes.
 * Returns null when nothing matches — the request carries on untouched.
 */
export function matchRedirect(
  pathname: string,
  rules: { exact: Record<string, RedirectRule>; prefix: RedirectRule[] }
): { destination: string; status: RedirectStatus } | null {
  const path = normalizeSource(pathname);
  if (!path) return null;

  const exact = rules.exact[path];
  if (exact) {
    return { destination: exact.destination, status: exact.status };
  }

  for (const rule of rules.prefix) {
    const base = rule.source.slice(0, -2); // drop "/*"
    if (path !== base && !path.startsWith(`${base}/`)) continue;
    if (rule.status === 410) return { destination: '', status: 410 };
    // "/blog/* → /articles/*" keeps whatever followed the prefix.
    if (rule.destination.endsWith('/*')) {
      const rest = path.slice(base.length); // "" or "/something"
      return { destination: `${rule.destination.slice(0, -2)}${rest}`, status: rule.status };
    }
    return { destination: rule.destination, status: rule.status };
  }

  return null;
}
