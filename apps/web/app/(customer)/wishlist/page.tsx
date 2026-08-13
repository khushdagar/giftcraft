import type { Metadata } from 'next';
import { WishlistContent } from '@/components/wishlist/wishlist-content';

export const metadata: Metadata = {
  // Root template appends "· GIVOO"
  title: 'Wishlist',
  description: 'Products you shortlisted while browsing — add them all to the gift builder in one click.',
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return <WishlistContent />;
}
