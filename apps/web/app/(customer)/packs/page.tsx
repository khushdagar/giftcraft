import { Button } from '@/components/ui/button';
import { Zap, Leaf, Star, Gift } from 'lucide-react';
import Link from 'next/link';

const CURATED_PACKS = [
  {
    id: 'welcome-kit',
    name: 'Welcome Kit',
    description: 'The perfect first day for new team members',
    icon: Gift,
    bg: 'bg-em-50',
    borderColor: 'border-em',
    textColor: 'text-em',
    products: ['Premium Flask', 'Notebook', 'Pen'],
    priceRange: '₹800–₹1,200',
  },
  {
    id: 'festival-pack',
    name: 'Festival Pack',
    description: 'Celebrate Diwali, Christmas, Holi with premium gifts',
    icon: Zap,
    bg: 'bg-gold-50',
    borderColor: 'border-gold',
    textColor: 'text-gold-700',
    products: ['Premium Hamper', 'Branded Mug', 'Eco Packaging'],
    priceRange: '₹1,500–₹2,500',
  },
  {
    id: 'eco-pack',
    name: 'Eco Pack',
    description: 'Sustainable gifting for environmentally conscious brands',
    icon: Leaf,
    bg: 'bg-sky-50',
    borderColor: 'border-sky-200',
    textColor: 'text-sky-700',
    products: ['Bamboo Utensils', 'Seed Paper', 'Jute Bag'],
    priceRange: '₹600–₹1,000',
  },
  {
    id: 'premium-pack',
    name: 'Premium Pack',
    description: 'Luxury gifts for VIPs, executives, and key clients',
    icon: Star,
    bg: 'bg-[#F5F3FF]',
    borderColor: 'border-[#EDE9FE]',
    textColor: 'text-[#8B5CF6]',
    products: ['Premium Leather Goods', 'Crystal Glass', 'Luxury Packaging'],
    priceRange: '₹3,000–₹5,000+',
  },
];

export const metadata = {
  title: 'Curated Gift Packs | GiftCraft',
  description: 'Explore our pre-designed gift pack templates. Mix and match, or customize from scratch.',
};

export default function PacksPage() {
  return (
    <div className="min-h-screen bg-canvas py-12 px-4">
      <div className="container-gc-w max-w-6xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="overline text-ink-3">CURATED PACKS</p>
          <h1 className="t-title mt-2 text-ink">Pre-Designed Gift Bundles</h1>
          <p className="text-ink-2 mt-4 text-lg">
            Start with one of our templates, or use them as inspiration for your own creation.
          </p>
        </div>

        {/* Packs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {CURATED_PACKS.map((pack) => {
            const Icon = pack.icon;
            return (
              <div
                key={pack.id}
                className={`rounded-md border-2 ${pack.borderColor} ${pack.bg} p-6 flex flex-col`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-ink">{pack.name}</h3>
                    <p className="text-sm text-ink-2 mt-1">{pack.description}</p>
                  </div>
                  <Icon className={`w-6 h-6 ${pack.textColor} flex-shrink-0`} />
                </div>

                {/* Products */}
                <div className="mb-4 space-y-1">
                  {pack.products.map((product) => (
                    <div key={product} className="flex items-center gap-2 text-sm">
                      <span className={`w-1.5 h-1.5 rounded-full ${pack.textColor} bg-current`}></span>
                      <span className="text-ink-2">{product}</span>
                    </div>
                  ))}
                </div>

                {/* Price & CTA */}
                <div className="mt-auto pt-4 border-t border-current/20">
                  <p className="text-sm font-semibold text-ink mb-3">{pack.priceRange}</p>
                  <Button
                    asChild
                    variant="em"
                    className="w-full rounded-md text-sm"
                  >
                    <Link href={`/builder?template=${pack.id}`}>Start with This Pack</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* DIY Section */}
        <div className="rounded-md border-2 border-indigo-200 bg-[#EEF2FF] p-8 text-center mb-12">
          <h2 className="text-2xl font-black text-indigo-900 mb-2">Design Your Own</h2>
          <p className="text-indigo-800 mb-6">
            Not seeing what you need? Mix and match from our entire catalog of 500+ products.
          </p>
          <Button asChild variant="em" size="lg" className="rounded-md">
            <Link href="/builder">Build from Scratch</Link>
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-md border-2 border-bdr bg-white p-6">
            <div className="text-2xl font-black text-em mb-2">500+</div>
            <p className="text-ink-2 text-sm">
              Products to choose from. All with instant pricing and availability.
            </p>
          </div>
          <div className="rounded-md border-2 border-bdr bg-white p-6">
            <div className="text-2xl font-black text-gold-700 mb-2">7–10 days</div>
            <p className="text-ink-2 text-sm">
              Quick turnaround. Most orders ship within a week of approval.
            </p>
          </div>
          <div className="rounded-md border-2 border-bdr bg-white p-6">
            <div className="text-2xl font-black text-em mb-2">Branded</div>
            <p className="text-ink-2 text-sm">
              All products include standard branding. Premium packaging optional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
