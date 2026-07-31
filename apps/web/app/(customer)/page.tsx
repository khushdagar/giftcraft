import { HomePageWrapper } from '@/components/home/home-page-wrapper';
import { HomeHero } from '@/components/home/hero';
import { TrustStrip } from '@/components/home/trust-strip';
import { ShopByOccasion } from '@/components/home/shop-by-occasion';
import { TrendingProducts } from '@/components/home/trending-products';
import { HowItWorks } from '@/components/home/how-it-works';
import { Testimonials } from '@/components/home/testimonials';
import { CustomerReviews } from '@/components/home/customer-reviews';
import { CuratedCollections } from '@/components/home/curated-collections';
import { CTASection } from '@/components/home/cta-section';
import { Footer } from '@/components/layout/footer';

export default function HomePage() {
  return (
    <HomePageWrapper>
      <div className="bg-[#F5F1EB] min-h-screen overflow-x-hidden">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=optional');
        `}</style>

        <HomeHero />
        <TrustStrip />
        <ShopByOccasion />
        <TrendingProducts />
        <HowItWorks />
        <CuratedCollections />
        <CustomerReviews />
        {/* <Testimonials /> */}
        <CTASection />
      </div>
    </HomePageWrapper>
  );
}
