import type { Metadata } from 'next';
import { CompareContent } from '@/components/compare/compare-content';
import { withPageSeo } from '@/lib/page-seo';

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/compare', baseMetadata);
}

const baseMetadata: Metadata = {
  // Root template appends "· GIVOO"
  title: 'Compare Products',
  description: 'Compare shortlisted gifting products side by side — pricing, MOQ, lead time, branding and more.',
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return <CompareContent />;
}
