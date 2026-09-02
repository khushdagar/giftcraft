import { Suspense } from 'react';
import type { Metadata } from 'next';
import BoxClient from './box-client';
import { withPageSeo } from '@/lib/page-seo';
import { pageOpenGraph } from '@/lib/site';

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/box', baseMetadata);
}

// Root template appends "· GIVOO"
const TITLE = 'Build Your Pack — Pick Products, Packaging & Branding';
const DESCRIPTION =
  'Assemble a custom corporate gift box: choose products, packaging and add-ons with live per-unit pricing as you build.';

const baseMetadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/box' },
  openGraph: pageOpenGraph('/box', TITLE, DESCRIPTION),
};

export default function BoxPage() {
  return (
    <Suspense>
      <BoxClient />
    </Suspense>
  );
}
