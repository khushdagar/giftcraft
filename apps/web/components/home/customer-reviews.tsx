'use client';

import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Star, BadgeCheck } from 'lucide-react';

interface ReviewCard {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  authorName: string;
  role: string; // "Verified Buyer · Product" for real reviews, job title for seeds
  productSlug: string | null; // real reviews link to their product page
  isReal: boolean;
}

// Seed reviews shown while the platform collects real ones. As customers post
// reviews and they get approved in /admin/reviews, real reviews take these
// slots automatically (real ones always come first).
const SEED_REVIEWS: ReviewCard[] = [
  {
    id: 'seed-1',
    rating: 5,
    title: 'Diwali hampers our team still talks about',
    comment:
      'Ordered 300 branded hampers for Diwali. The builder showed the exact per-box price upfront and delivery landed three days early. Zero follow-up calls needed.',
    authorName: 'Priya Sharma',
    role: 'Head of HR, Gurugram',
    productSlug: null,
    isReal: false,
  },
  {
    id: 'seed-2',
    rating: 5,
    title: 'Onboarding kits made easy',
    comment:
      'We send welcome kits to every new joiner across four cities. GIVOO let us set it up once and the branding quality on the bottles and diaries is genuinely premium.',
    authorName: 'Rajesh Menon',
    role: 'People Operations, Bengaluru',
    productSlug: null,
    isReal: false,
  },
  {
    id: 'seed-3',
    rating: 4,
    title: 'Transparent pricing, no surprises',
    comment:
      'The GST breakup and payment fee are shown as clear line items before you pay. Our finance team approved the PO the same day — that never happens.',
    authorName: 'Ananya Desai',
    role: 'Procurement Manager, Mumbai',
    productSlug: null,
    isReal: false,
  },
  {
    id: 'seed-4',
    rating: 5,
    title: 'Client gifting sorted for the year',
    comment:
      'Curated packs with our logo, individual delivery to 80 client addresses, and a tracking sheet for each. Our account managers just share the unboxing photos now.',
    authorName: 'Vikram Nair',
    role: 'Founder, Pune',
    productSlug: null,
    isReal: false,
  },
  {
    id: 'seed-5',
    rating: 5,
    title: 'Great eco-friendly range',
    comment:
      'Picked the eco collection — cork diaries and plantable pencils. Recipients loved that it matched our sustainability messaging, and MOQs were reasonable.',
    authorName: 'Sneha Kulkarni',
    role: 'Brand Manager, Hyderabad',
    productSlug: null,
    isReal: false,
  },
  {
    id: 'seed-6',
    rating: 4,
    title: 'Fast turnaround on a tight deadline',
    comment:
      'Needed 150 gift boxes in ten days for our annual day. Support confirmed the timeline before payment and the boxes arrived with two days to spare.',
    authorName: 'Arjun Bhatia',
    role: 'Admin Head, Noida',
    productSlug: null,
    isReal: false,
  },
];

function GoldStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${
            s <= rating ? 'fill-[#fbbc04] text-[#fbbc04]' : 'fill-bdr text-bdr'
          }`}
        />
      ))}
    </span>
  );
}

function Card({ review }: { review: ReviewCard }) {
  const body = (
    <div className="flex flex-col rounded-gc-s bg-white p-6 shadow-card transition-shadow hover:shadow-hover">
      <div className="flex items-center justify-between gap-2">
        <GoldStars rating={review.rating} />
        {review.isReal && (
          <span className="inline-flex items-center gap-1 rounded-full bg-em-50 px-2 py-0.5 text-[11px] font-medium text-em">
            <BadgeCheck className="h-3 w-3" /> Verified
          </span>
        )}
      </div>

      {review.title && (
        <h3 className="mt-3 text-base font-semibold leading-snug text-ink">
          {review.title}
        </h3>
      )}
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2 line-clamp-4">
        “{review.comment}”
      </p>

      <div className="mt-5 flex items-center gap-3 border-t border-bdr pt-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-em-50 text-sm font-semibold text-em">
          {review.authorName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{review.authorName}</p>
          <p className="truncate text-xs text-ink-3">{review.role}</p>
        </div>
      </div>
    </div>
  );

  return review.isReal && review.productSlug ? (
    <Link href={`/products/${review.productSlug}`} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

// One endlessly upward-scrolling column. Content is rendered twice; the track
// animates from 0 to -50% so the loop is seamless. Pauses while hovered.
function MarqueeColumn({
  reviews,
  duration,
}: {
  reviews: ReviewCard[];
  duration: number;
}) {
  return (
    <div className="reviews-marquee-track flex flex-col hover:[animation-play-state:paused]"
      style={{ animationDuration: `${duration}s` }}
    >
      {[0, 1].map((half) => (
        <div key={half} className="flex flex-col gap-5 pb-5" aria-hidden={half === 1}>
          {reviews.map((review) => (
            <Card key={`${half}-${review.id}`} review={review} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CustomerReviews({ initialData }: { initialData?: ReviewCard[] }) {
  const reduceMotion = useReducedMotion();

  const { data: realReviews } = useQuery<ReviewCard[]>({
    queryKey: ['featured-reviews'],
    queryFn: async () => {
      const res = await fetch('/api/reviews/featured');
      if (!res.ok) throw new Error('Failed to load reviews');
      const json = await res.json();
      return (json.data || []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        authorName: r.authorName,
        // Under the name we show who they are (company/designation),
        // never the product title — the card itself links to the product.
        role: r.authorCompany || (r.isVerifiedBuyer ? 'Verified Buyer' : 'Verified Customer'),
        productSlug: r.productSlug,
        isReal: true,
      }));
    },
    // Server-rendered on the homepage so real review copy is in the HTML.
    initialData,
    staleTime: 60 * 1000,
  });

  // Real approved reviews first; seed reviews fill the remaining slots.
  const cards = [...(realReviews || []), ...SEED_REVIEWS].slice(0, 6);

  const average =
    Math.round((cards.reduce((s, c) => s + c.rating, 0) / cards.length) * 10) / 10;

  // Round-robin into 3 columns so real reviews spread across the wall.
  const columns: [ReviewCard[], ReviewCard[], ReviewCard[]] = [[], [], []];
  cards.forEach((card, i) => columns[(i % 3) as 0 | 1 | 2].push(card));

  return (
    <section className="bg-[#F5F1EB] py-20">
      <style>{`
        @keyframes reviews-scroll-up {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        .reviews-marquee-track {
          animation: reviews-scroll-up linear infinite;
          will-change: transform;
        }
      `}</style>

      <div className="container">
        <div className="text-center">
          <p className="overline text-ink-3">CUSTOMER REVIEWS</p>
          <h2 className="mt-2 text-5xl md:text-6xl font-serif font-normal">
            Rated {average.toFixed(1)}{' '}
            <span className="italic text-[#800020]">by gifting teams.</span>
          </h2>
          <div className="mt-4 flex items-center justify-center gap-2">
            <GoldStars rating={Math.round(average)} />
            <span className="text-sm text-ink-2">from teams across India</span>
          </div>
        </div>

        {reduceMotion ? (
          /* Reduced motion: calm static grid, no auto-scroll. */
          <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((review) => (
              <Card key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div
            className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-5 overflow-hidden md:grid-cols-2 lg:grid-cols-3"
            style={{
              height: 560,
              maskImage:
                'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
            }}
          >
            {/* Mobile shows one column, tablets two, desktop three — each drifts
                upward at its own pace for an organic wall effect. */}
            <MarqueeColumn reviews={columns[0]} duration={34} />
            <div className="hidden md:block">
              <MarqueeColumn reviews={columns[1]} duration={44} />
            </div>
            <div className="hidden lg:block">
              <MarqueeColumn reviews={columns[2]} duration={38} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
