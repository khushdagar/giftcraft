import { HomePageWrapper } from '@/components/home/home-page-wrapper';
import { HomeHero } from '@/components/home/hero';
import { TrustStrip } from '@/components/home/trust-strip';
import { ShopByOccasion } from '@/components/home/shop-by-occasion';
import { ShopByCategory } from '@/components/home/shop-by-category';
import { TrendingProducts } from '@/components/home/trending-products';
import { TrendingPacks } from '@/components/home/trending-packs';
import { HowItWorks } from '@/components/home/how-it-works';
import { CustomerReviews } from '@/components/home/customer-reviews';
import { CuratedCollections } from '@/components/home/curated-collections';
import { HomeSeoContent } from '@/components/home/home-seo-content';
import { CTASection } from '@/components/home/cta-section';
import { withPageSeo } from '@/lib/page-seo';
import {
  getFeaturedProducts,
  getHomePackOccasions,
  getHomeCategories,
  getFeaturedReviews,
} from '@/lib/home-data';

// Homepage content (products, occasions, categories, reviews) is fetched
// server-side so it is present in the initial HTML for search engines; the
// client components hydrate React Query from this data with zero refetch flash.
export const revalidate = 3600;

// Homepage defaults — an override saved for "/" in /admin/seo still wins.
export function generateMetadata() {
  return withPageSeo('/', {
    // Title is used as-is (no brand suffix is appended)
    title: "GIVOO — India's First Self-Serve Bulk Corporate Gifting Platform",
    description:
      'Browse & Build branded gift packs for employees & clients, get instant bulk pricing with GST, and pay ₹0 until you approve your mockup. Delivered in 10–15 days.',
    alternates: { canonical: '/' },
  });
}

export default async function HomePage() {
  const [featuredProducts, occasions, categories, reviews] = await Promise.all([
    getFeaturedProducts(12),
    getHomePackOccasions(),
    getHomeCategories(),
    getFeaturedReviews(),
  ]);

  return (
    <HomePageWrapper>
      <div className="bg-[#F5F1EB] min-h-screen overflow-x-hidden">
        <HomeHero />
        {/* <TrustStrip /> */}
        <ShopByOccasion initialData={occasions} />
        <TrendingProducts initialData={featuredProducts} />
        <TrendingPacks />
        <ShopByCategory initialData={categories} />
        <HowItWorks />
        <CuratedCollections />
        <CustomerReviews initialData={reviews} />
        <HomeSeoContent categories={categories} />
        <CTASection />
      </div>
    </HomePageWrapper>
  );
}
