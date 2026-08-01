import type { Metadata } from 'next';
import PlannerClient from './planner-client';

export const metadata: Metadata = {
  // Root template appends "· GIVOO"
  title: 'Gift Budget Planner — Find Gifts by Occasion & Budget',
  description:
    'Answer three quick questions — occasion, recipients, and budget — and get corporate gift recommendations that fit.',
  alternates: { canonical: '/planner' },
};

export default function PlannerPage() {
  return <PlannerClient />;
}
