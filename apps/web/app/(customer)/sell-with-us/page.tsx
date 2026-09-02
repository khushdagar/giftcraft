import type { Metadata } from 'next';
import SellWithUsClient from './sell-with-us-client';
import { withPageSeo } from '@/lib/page-seo';

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/sell-with-us', baseMetadata);
}

const baseMetadata: Metadata = {
  // Root template appends "· GIVOO"
  title: 'Sell With Us — Become a GIVOO Vendor',
  description:
    'Manufacture or distribute gifting products? Partner with GIVOO to reach corporate buyers across India. Apply as a vendor.',
  alternates: { canonical: '/sell-with-us' },
};

export default function SellWithUsPage() {
  return <SellWithUsClient />;
}
