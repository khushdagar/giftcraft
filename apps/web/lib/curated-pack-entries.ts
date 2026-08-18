import { prisma } from '@/lib/prisma';

// The two doors into /curated-packs. Their names and URLs are fixed (the navbar
// and the routes are built on them), but the cover image and blurb are editable
// from /admin/settings/curated-packs — the rungs beneath them already carry
// their own artwork, so the top level shouldn't be the only thing stuck in code.

export interface CuratedPackEntry {
  slug: 'budget' | 'occasions';
  name: string;
  description: string;
  image: string | null;
  gradient: string;
}

const DEFAULTS: Record<'budget' | 'occasions', Omit<CuratedPackEntry, 'image'>> = {
  budget: {
    slug: 'budget',
    name: 'By Budget',
    description:
      'From under ₹500 to premium hampers — pick the per-pack rate that fits, branding already included.',
    gradient: 'linear-gradient(145deg, #D7AC55 0%, #9A6E2E 55%, #6F4D1E 100%)',
  },
  occasions: {
    slug: 'occasions',
    name: 'By Occasion',
    description:
      'Diwali, onboarding, client gifting, milestones — packs assembled for the moment you are gifting for.',
    gradient: 'linear-gradient(145deg, #3FA978 0%, #1F8A5C 45%, #134E36 100%)',
  },
};

const KEYS = [
  'curatedPacks.budgetImage',
  'curatedPacks.budgetDescription',
  'curatedPacks.occasionsImage',
  'curatedPacks.occasionsDescription',
];

/** Reads the saved overrides, falling back to the defaults for anything blank. */
export async function getCuratedPackEntries(): Promise<CuratedPackEntry[]> {
  let saved: Record<string, unknown> = {};
  try {
    const rows = await prisma.platformSetting.findMany({ where: { key: { in: KEYS } } });
    saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch (error) {
    // A settings read must never take the homepage down — the defaults are a
    // complete, correct answer on their own.
    console.error('getCuratedPackEntries failed:', error);
  }

  const str = (key: string) => {
    const v = saved[key];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };

  return (['budget', 'occasions'] as const).map((slug) => ({
    ...DEFAULTS[slug],
    description: str(`curatedPacks.${slug}Description`) ?? DEFAULTS[slug].description,
    image: str(`curatedPacks.${slug}Image`),
  }));
}
