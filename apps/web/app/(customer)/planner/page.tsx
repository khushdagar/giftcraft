import type { Metadata } from 'next';
import PlannerClient from './planner-client';
import { withPageSeo } from '@/lib/page-seo';

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/planner', baseMetadata);
}

const baseMetadata: Metadata = {
  // Root template appends "· GIVOO"
  title: 'Gift Budget Planner — Find Gifts by Occasion & Budget',
  description:
    'Answer three quick questions — occasion, recipients, and budget — and get corporate gift recommendations that fit.',
  alternates: { canonical: '/planner' },
};

export default function PlannerPage() {
  return <PlannerClient />;
}
