import { prisma } from '@/lib/prisma';

// Editable copy for the two hub pages beneath /curated-packs — the grids of
// budget bands and of occasions. The tiles come from their own tables; this is
// the heading, blurb, SEO and long-form content around them, with the same
// fields a single band or occasion page has, edited from
// /admin/budget-bands/page-content and /admin/occasions/page-content.

export type CuratedHub = 'budget' | 'occasions';

export interface CuratedHubContent {
  pageTitle: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  contentBelow: string;
  faqs: { question: string; answer: string }[];
}

export const HUB_PATH: Record<CuratedHub, string> = {
  budget: '/curated-packs/budget',
  occasions: '/curated-packs/occasions',
};

export const HUB_LABEL: Record<CuratedHub, string> = {
  budget: 'By Budget',
  occasions: 'By Occasion',
};

const DEFAULTS: Record<CuratedHub, CuratedHubContent> = {
  budget: {
    pageTitle: 'Corporate Gifting by Budget | Bulk Gift Packs · GIVOO',
    description:
      'Shop corporate gifts by budget — branded bulk packs from under ₹500 to premium hampers above ₹5,000. Transparent per-pack pricing, pay after mockup approval.',
    metaTitle: '',
    metaDescription: '',
    contentBelow: '',
    faqs: [],
  },
  occasions: {
    pageTitle: 'Corporate Gifts by Occasion | Bulk Gift Packs - GIVOO',
    description:
      'Shop corporate gifts by occasion — branded bulk packs for Diwali, onboarding, client & recognition gifting. Pay ₹0 until you approve your mockup.',
    metaTitle: '',
    metaDescription: '',
    contentBelow: '',
    faqs: [],
  },
};

export const hubSettingKey = (hub: CuratedHub) => `curatedPacks.${hub}Hub`;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Saved copy for a hub, with the defaults filling anything left blank. */
export async function getCuratedHubContent(hub: CuratedHub): Promise<CuratedHubContent> {
  const defaults = DEFAULTS[hub];
  let saved: Record<string, unknown> = {};
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: hubSettingKey(hub) } });
    if (row && typeof row.value === 'object' && row.value && !Array.isArray(row.value)) {
      saved = row.value as Record<string, unknown>;
    }
  } catch (error) {
    // The hub must still render on a settings read failure — the defaults are
    // a complete answer on their own.
    console.error('getCuratedHubContent failed:', error);
  }

  const faqs = Array.isArray(saved.faqs)
    ? (saved.faqs as unknown[])
        .map((f) => {
          const o = (f && typeof f === 'object' ? f : {}) as Record<string, unknown>;
          return { question: str(o.question), answer: str(o.answer) };
        })
        .filter((f) => f.question && f.answer)
    : [];

  return {
    pageTitle: str(saved.pageTitle) || defaults.pageTitle,
    description: str(saved.description) || defaults.description,
    metaTitle: str(saved.metaTitle),
    metaDescription: str(saved.metaDescription),
    contentBelow: str(saved.contentBelow),
    faqs,
  };
}
