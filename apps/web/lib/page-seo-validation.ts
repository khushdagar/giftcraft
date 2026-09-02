import { normalizeSeoPath } from '@/lib/page-seo';

/** App trees where SEO tags are pointless — nothing there is indexable. */
const RESERVED = ['/api', '/_next', '/admin', '/dashboard', '/login', '/vendor'];

export interface PageSeoInput {
  path: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  noIndex: boolean | null;
  noFollow: boolean | null;
}

function text(value: unknown): string | null {
  const v = (value ?? '').toString().trim();
  return v || null;
}

function triState(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function parsePageSeoBody(body: any): { data: PageSeoInput } | { error: string } {
  const path = normalizeSeoPath(body?.path ?? '');
  if (!path || !path.startsWith('/')) return { error: 'Page path is required' };
  if (RESERVED.some((p) => path === p || path.startsWith(`${p}/`))) {
    return { error: `${path} is not a public page — SEO tags there would never be seen` };
  }

  const canonicalUrl = text(body?.canonicalUrl);
  if (canonicalUrl && !/^https?:\/\//i.test(canonicalUrl)) {
    return { error: 'Canonical URL must be a full https:// URL' };
  }
  const ogImageUrl = text(body?.ogImageUrl);
  if (ogImageUrl && !/^https?:\/\//i.test(ogImageUrl) && !ogImageUrl.startsWith('/')) {
    return { error: 'og:image must be a full https:// URL or a site path' };
  }

  return {
    data: {
      path,
      metaTitle: text(body?.metaTitle),
      metaDescription: text(body?.metaDescription),
      canonicalUrl,
      ogTitle: text(body?.ogTitle),
      ogDescription: text(body?.ogDescription),
      ogImageUrl,
      noIndex: triState(body?.noIndex),
      noFollow: triState(body?.noFollow),
    },
  };
}
