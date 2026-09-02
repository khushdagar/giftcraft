import type { Metadata } from 'next';
import ContactClient from './contact-client';
import { withPageSeo } from '@/lib/page-seo';

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/contact', baseMetadata);
}

const baseMetadata: Metadata = {
  // Root template appends "· GIVOO"
  title: 'Contact Us — Corporate Gifting Experts',
  description:
    'Talk to the GIVOO team about bulk corporate gifting — call, WhatsApp, or send a message and we respond within one business day.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return <ContactClient />;
}
