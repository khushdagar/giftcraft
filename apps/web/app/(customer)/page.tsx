import { HomePageWrapper } from '@/components/home/home-page-wrapper';
import { HomeHero } from '@/components/home/hero';
import { TrustStrip } from '@/components/home/trust-strip';
import { ShopByOccasion } from '@/components/home/shop-by-occasion';
import { TrendingProducts } from '@/components/home/trending-products';
import { HowItWorks } from '@/components/home/how-it-works';
import { CustomerReviews } from '@/components/home/customer-reviews';
import { CuratedCollections } from '@/components/home/curated-collections';
import { CTASection } from '@/components/home/cta-section';
import {
  getFeaturedProducts,
  getHomeOccasions,
  getHomeCollections,
  getFeaturedReviews,
} from '@/lib/home-data';

// Homepage content (products, occasions, collections, reviews) is fetched
// server-side so it is present in the initial HTML for search engines; the
// client components hydrate React Query from this data with zero refetch flash.
export const revalidate = 3600;

export default async function HomePage() {
  const [featuredProducts, occasions, collections, reviews] = await Promise.all([
    getFeaturedProducts(6),
    getHomeOccasions(),
    getHomeCollections(),
    getFeaturedReviews(),
  ]);

  return (
    <HomePageWrapper>
      <div className="bg-[#F5F1EB] min-h-screen overflow-x-hidden">
        <HomeHero />
        <TrustStrip />
        <ShopByOccasion initialData={occasions} />
        <TrendingProducts initialData={featuredProducts} />
        <HowItWorks />
        <CuratedCollections initialData={collections} />
        <CustomerReviews initialData={reviews} />
        <CTASection />
      </div>
    </HomePageWrapper>
  );
}
