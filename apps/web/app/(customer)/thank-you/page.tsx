import type { Metadata } from 'next';
import ThankYouClient from './thank-you-client';

// Landing page after a contact-form or enquiry-popup submission. Kept out of
// search (robots noindex + robots.txt) — it only makes sense after a form.
export const metadata: Metadata = {
  title: 'Thank You — We’ll Be in Touch',
  description: 'Your enquiry has reached the GIVOO team. A gifting expert will reply within 24 hours.',
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return <ThankYouClient />;
}
