import { Suspense } from 'react';
import type { Metadata } from 'next';
import BoxClient from './box-client';
import { withPageSeo } from '@/lib/page-seo';

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/box', baseMetadata);
}

const baseMetadata: Metadata = {
  // Root template appends "· GIVOO"
  title: 'Build Your Pack — Pick Products, Packaging & Branding',
  description:
    'Assemble a custom corporate gift box: choose products, packaging and add-ons with live per-unit pricing as you build.',
  alternates: { canonical: '/box' },
};

export default function BoxPage() {
  return (
    <Suspense>
      <BoxClient />
    </Suspense>
  );
}
