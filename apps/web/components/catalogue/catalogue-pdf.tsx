import fs from 'fs';
import path from 'path';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  Svg,
  Path,
  Circle,
  Font,
} from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { registerFonts as registerInter, givooLogo } from '@/components/checkout/proposal-deck-pdf';
import {
  CATALOGUE_THEMES,
  CARDS_PER_PAGE,
  CONTENTS_ROWS_PER_PAGE,
  chunk,
  type CatalogueThemeKey,
} from '@/lib/catalogue';

/**
 * Product Catalogue — the approved A4 portrait design, and only that:
 *
 *   Cover      — "Product Catalogue" centred; photo across the bottom half
 *   Contents   — only when there are 2+ sections
 *   Sections   — the section (category) name as a heading, then three
 *                full-width cards per page: copy left, photo right, cart badge
 *   Thank you  — full-bleed photo, "Thank You", note, builder link, terms
 *
 * Every image arrives pre-downloaded as a data URI; this file never does I/O.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface CatalogueDocProduct {
  id: string;
  name: string;
  brand: string | null;
  sku: string;
  imageData: string | null;
  /** The photo's own backdrop colour, painted behind the photo column; null for cut-outs. */
  imageBg: string | null;
  /** Already formatted, e.g. "₹1,250". Null = not shown. */
  price: string | null;
  /** "From " when the price is the lowest tier of several, else "". */
  pricePrefix: string;
  moq: number;
  description: string | null;
  features: string[];
  /** Pill printed above the name — the branding method. */
  chips: string[];
  /** Hex colours of the product's colour variants. */
  colors: string[];
  badge: string | null;
  /** Deep link that drops the product into the gift builder. */
  builderUrl: string;
  /** The product's page on the storefront. */
  productUrl: string;
}

export interface CatalogueDocSection {
  title: string;
  products: CatalogueDocProduct[];
  /** 1-based page number of the section's first page (for the contents). */
  startPage: number;
}

export interface CatalogueDoc {
  title: string;
  closingNote: string | null;
  coverImageData: string | null;
  closingImageData: string | null;
  theme: CatalogueThemeKey;
  /** e.g. "September 2026". */
  monthLabel: string;
  showSku: boolean;
  showMoq: boolean;
  pricesShown: boolean;
  totalProducts: number;
  sections: CatalogueDocSection[];
}

// ── Fonts ──────────────────────────────────────────────────────────────────
// The storefront's own pairing (app/layout.tsx): DM Sans for everything,
// Playfair Display for display headings. Both ship as TTFs in /public/fonts.
const FONT_DIR = path.join(process.cwd(), 'public', 'fonts');
const fontFile = (name: string) => path.join(FONT_DIR, name);
const hasFonts = (names: string[]) => names.every((n) => fs.existsSync(fontFile(n)));

const DM_SANS = ['DMSans_400.ttf', 'DMSans_500.ttf', 'DMSans_600.ttf', 'DMSans_700.ttf'];
const PLAYFAIR = ['PlayfairDisplay_400.ttf', 'PlayfairDisplay_600.ttf', 'PlayfairDisplay_700.ttf'];

const FONT = hasFonts(DM_SANS) ? 'DM Sans' : 'Inter';
const DISPLAY = hasFonts(PLAYFAIR) ? 'Playfair Display' : FONT;

let fontsReady = false;
function registerCatalogueFonts() {
  if (fontsReady) return;
  fontsReady = true;
  registerInter(); // always available as the fallback family
  try {
    if (FONT === 'DM Sans') {
      Font.register({
        family: 'DM Sans',
        fonts: DM_SANS.map((file, i) => ({ src: fontFile(file), fontWeight: [400, 500, 600, 700][i]! })),
      });
    }
    if (DISPLAY === 'Playfair Display') {
      Font.register({
        family: 'Playfair Display',
        fonts: PLAYFAIR.map((file, i) => ({ src: fontFile(file), fontWeight: [400, 600, 700][i]! })),
      });
    }
    Font.registerHyphenationCallback((word) => [word]);
  } catch {
    /* falls back to Inter / Helvetica */
  }
}

// ── Palette & metrics ──────────────────────────────────────────────────────

// Website tokens (tailwind.config: ink / ink-2 / ink-3, em = brand burgundy).
const INK = '#222222';
const INK_2 = '#5C5852';
const INK_3 = '#8F8A82';
const BRAND = '#800020';
const PAGE_BG = '#F4F3F0';
const CARD = '#FFFFFF';
const PILL = '#2B2B2B';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const PAD_X = 28;
const HEADER_H = 36;
const FOOTER_H = 26;
const CONTENT_TOP = HEADER_H + 14;
const CONTENT_BOTTOM = FOOTER_H + 10;
const CONTENT_H = PAGE_H - CONTENT_TOP - CONTENT_BOTTOM;
const HEAD_FULL_H = 54; // section heading + its bottom margin (first page)
const HEAD_SLIM_H = 26; // "continued" line on later pages
const GRID_GAP = 12;
const ART_WIDTH = '44%';

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 10,
    color: INK,
    backgroundColor: PAGE_BG,
    paddingTop: CONTENT_TOP,
    paddingBottom: CONTENT_BOTTOM,
    paddingHorizontal: PAD_X,
  },
  bold: { fontFamily: FONT, fontWeight: 700 },
  eyebrow: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 7.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: INK_3,
  },
  link: { textDecoration: 'none', color: INK },

  header: {
    position: 'absolute',
    top: 0,
    left: PAD_X,
    right: PAD_X,
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerLogo: { width: 52, height: 24, objectFit: 'contain' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: PAD_X,
    right: PAD_X,
    height: FOOTER_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: INK_3 },

  // Cover — "Product Catalogue" centred in the top half, photo in the bottom
  // half (explicit point sizes).
  coverPage: { fontFamily: FONT, color: INK, padding: 0 },
  coverBlock: { height: PAGE_H / 2, paddingHorizontal: 40, paddingTop: 40, paddingBottom: 40 },
  coverTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  coverLogo: { width: 84, height: 38, objectFit: 'contain' },
  coverCentre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverTitle: {
    fontFamily: DISPLAY,
    fontWeight: 400,
    fontSize: 44,
    lineHeight: 1.1,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  coverPhotoBox: { width: PAGE_W, height: PAGE_H / 2, position: 'relative', overflow: 'hidden' },
  coverPhoto: { position: 'absolute', top: 0, left: 0, width: PAGE_W, height: PAGE_H / 2, objectFit: 'cover' },

  // Contents
  h1: { fontFamily: DISPLAY, fontWeight: 400, fontSize: 28, letterSpacing: -0.2, marginBottom: 8 },
  tocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  tocIndex: { width: 26, fontFamily: FONT, fontWeight: 700, fontSize: 9, color: INK_3 },
  tocTitle: { fontFamily: FONT, fontWeight: 700, fontSize: 12 },
  tocThumbs: { flexDirection: 'row', gap: 6, marginHorizontal: 12 },
  tocThumb: { width: 34, height: 34, objectFit: 'contain' },
  tocCount: { fontSize: 8.5, color: INK_3, width: 64, textAlign: 'right' },
  tocPage: { fontFamily: FONT, fontWeight: 700, fontSize: 9.5, width: 34, textAlign: 'right' },

  // Section heading — the category name, plain.
  sectionHead: { height: HEAD_FULL_H - 12, marginBottom: 12, justifyContent: 'flex-end' },
  sectionTitle: { fontFamily: DISPLAY, fontWeight: 400, fontSize: 26, letterSpacing: -0.3, color: INK },
  sectionSlim: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 16 },
  sectionSlimTitle: { fontFamily: FONT, fontWeight: 700, fontSize: 10.5 },

  // Cards — photo left, copy right, always.
  row: { flexDirection: 'row', gap: GRID_GAP },
  card: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  cardBody: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardArt: { width: ART_WIDTH, flexDirection: 'column' },
  cardImgBox: { flex: 1 },
  cardImg: { width: '100%', height: '100%', objectFit: 'contain' },
  imgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imgPlaceholderText: { fontSize: 7, color: INK_3 },

  cartWrap: { position: 'absolute', top: 8, right: 8 },
  cartCircle: { width: 22, height: 22, borderRadius: 999, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  cartPlus: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 11,
    height: 11,
    borderRadius: 999,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartPlusText: { fontFamily: FONT, fontWeight: 700, fontSize: 8.5, lineHeight: 1, color: '#FFFFFF', marginTop: -0.5 },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginBottom: 5 },
  pill: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 5.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#FFFFFF',
    backgroundColor: PILL,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  name: { fontFamily: FONT, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: -0.1, lineHeight: 1.2, color: BRAND },
  spec: { fontFamily: FONT, fontWeight: 600, fontSize: 9, color: INK, lineHeight: 1.35, marginTop: 4 },
  bullet: { flexDirection: 'row', marginTop: 1.5 },
  bulletDot: { width: 7, fontSize: 9, color: INK_2 },
  bulletText: { flex: 1, fontSize: 9, color: INK_2, lineHeight: 1.35 },
  sku: { fontSize: 6, color: INK_3, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 7 },
  priceLabel: { fontFamily: FONT, fontWeight: 700, fontSize: 11, color: INK, marginRight: 4 },
  price: { fontFamily: FONT, fontWeight: 700, fontSize: 15, color: BRAND },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 3 },
  moq: { fontSize: 6, letterSpacing: 0.6, textTransform: 'uppercase', color: INK_3 },
  colors: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  colorsLabel: { fontSize: 6, letterSpacing: 0.4, textTransform: 'uppercase', color: INK_3, marginRight: 2 },
  dot: { width: 7, height: 7, borderRadius: 999, borderWidth: 0.5, borderColor: '#D8D3CB' },

  // Thank-you page — one page-sized frame in flow, layers absolute inside it.
  closingPage: { fontFamily: FONT, color: INK, padding: 0 },
  closingFrame: { width: PAGE_W, height: PAGE_H, position: 'relative' },
  closingImg: { position: 'absolute', top: 0, left: 0, width: PAGE_W, height: PAGE_H, objectFit: 'cover' },
  closingShade: { position: 'absolute', top: 0, left: 0, width: PAGE_W, height: PAGE_H, backgroundColor: '#000000', opacity: 0.45 },
  closingLayer: { position: 'absolute', top: 0, left: 0, width: PAGE_W, height: PAGE_H, padding: 40, justifyContent: 'space-between' },
  closingLogoChip: { alignSelf: 'flex-end', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  closingTitle: { fontFamily: DISPLAY, fontWeight: 400, fontSize: 50, letterSpacing: -0.5, textAlign: 'center' },
  closingText: { fontSize: 11, lineHeight: 1.55, textAlign: 'center', maxWidth: 380, marginTop: 12 },
});

/** Truncate a Text after N lines — react-pdf reads `maxLines` from STYLE, not a prop. */
const clamp = (lines: number): Style => ({ maxLines: lines });

// ── Small pieces ───────────────────────────────────────────────────────────

function Logo({ style }: { style: Style }) {
  const logo = givooLogo();
  if (!logo) return <Text style={[styles.bold, { fontSize: 14 }]}>GIVOO</Text>;
  return <Image src={logo} style={style} />;
}

/** Fixed header + footer for content pages. */
function Chrome({ doc }: { doc: CatalogueDoc }) {
  return (
    <>
      <View fixed style={styles.header}>
        <Text style={styles.eyebrow}>{doc.title}</Text>
        <Logo style={styles.headerLogo} />
      </View>
      <View fixed style={styles.footer}>
        <Text style={styles.footerText}>
          {doc.pricesShown
            ? 'Prices per unit, exclusive of GST   ·   Standard branding included'
            : 'Standard branding included'}
        </Text>
        <Text style={styles.footerText} render={({ pageNumber }) => String(pageNumber)} />
      </View>
    </>
  );
}

/** Cart-with-plus badge; tapping it opens the builder with the product added. */
function CartBadge({ url }: { url: string }) {
  return (
    <View style={styles.cartWrap}>
      <Link src={url} style={styles.link}>
        <View style={styles.cartCircle}>
          <Svg viewBox="0 0 24 24" width={12} height={12}>
            <Path
              d="M1 2h3.5l2.4 12.2a2 2 0 0 0 2 1.6h9.4a2 2 0 0 0 2-1.6L22 7H6"
              stroke="#FFFFFF"
              strokeWidth={2.6}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Circle cx={9.5} cy={20.5} r={1.8} fill="#FFFFFF" />
            <Circle cx={18.5} cy={20.5} r={1.8} fill="#FFFFFF" />
          </Svg>
        </View>
        <View style={styles.cartPlus}>
          <Text style={styles.cartPlusText}>+</Text>
        </View>
      </Link>
    </View>
  );
}

// ── Product card ───────────────────────────────────────────────────────────

function ProductCard({ p, doc }: { p: CatalogueDocProduct; doc: CatalogueDoc }) {
  const pills = [...(p.badge ? [p.badge] : []), ...p.chips].slice(0, 2);
  const bullets = p.features.slice(0, 6);

  return (
    <View style={styles.card}>
      <View style={[styles.cardArt, p.imageBg ? { backgroundColor: p.imageBg } : {}]}>
        <Link src={p.productUrl} style={[styles.link, styles.cardImgBox]}>
          <View style={styles.cardImgBox}>
            {p.imageData ? (
              <Image src={p.imageData} style={styles.cardImg} />
            ) : (
              <View style={styles.imgPlaceholder}>
                <Text style={styles.imgPlaceholderText}>Image coming soon</Text>
              </View>
            )}
          </View>
        </Link>
      </View>

      <View style={styles.cardBody}>
        {pills.length > 0 ? (
          <View style={styles.pills}>
            {pills.map((t, i) => (
              <Text key={i} style={[styles.pill, i === 0 && p.badge ? { backgroundColor: BRAND } : {}]}>
                {t}
              </Text>
            ))}
          </View>
        ) : null}
        <Link src={p.productUrl} style={styles.link}>
          <Text style={[styles.name, clamp(2)]}>{p.name}</Text>
        </Link>
        {doc.showSku ? <Text style={styles.sku}>SKU {p.sku}</Text> : null}
        {p.description ? <Text style={[styles.spec, clamp(2)]}>{p.description}</Text> : null}
        {bullets.length > 0 ? (
          <View style={{ marginTop: 4 }}>
            {bullets.map((f, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={[styles.bulletText, clamp(1)]}>{f}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {p.price ? (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{p.pricePrefix ? 'From :' : 'MRP :'}</Text>
            <Text style={styles.price}>{p.price}/-</Text>
          </View>
        ) : null}
        {doc.showMoq || p.colors.length > 0 ? (
          <View style={styles.meta}>
            {doc.showMoq ? <Text style={styles.moq}>MOQ {p.moq} pcs</Text> : null}
            {p.colors.length > 0 ? (
              <View style={styles.colors}>
                <Text style={styles.colorsLabel}>Colors:</Text>
                {p.colors.slice(0, 6).map((hex, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: hex }]} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <CartBadge url={p.builderUrl} />
    </View>
  );
}

// ── Pages ──────────────────────────────────────────────────────────────────

/**
 * Cover. With a cover photo: title block in the top half, photo across the
 * bottom half. Without one: a single theme-coloured page with the title
 * centred — nothing else.
 */
function CoverPage({ doc }: { doc: CatalogueDoc }) {
  const theme = CATALOGUE_THEMES[doc.theme];
  const hasPhoto = !!doc.coverImageData;
  return (
    <Page size="A4" style={[styles.coverPage, { backgroundColor: theme.block }]}>
      <View style={[styles.coverBlock, hasPhoto ? {} : { height: PAGE_H }]}>
        <View style={styles.coverTop}>
          <Logo style={styles.coverLogo} />
          <Text style={[styles.eyebrow, { color: theme.ink }]}>{doc.monthLabel}</Text>
        </View>
        <View style={styles.coverCentre}>
          <Text style={[styles.coverTitle, { color: theme.ink }]}>Product Catalogue</Text>
        </View>
      </View>

      {hasPhoto ? (
        <View style={styles.coverPhotoBox}>
          <Image src={doc.coverImageData!} style={styles.coverPhoto} />
        </View>
      ) : null}
    </Page>
  );
}

function ContentsPages({ doc }: { doc: CatalogueDoc }) {
  const pages = chunk(doc.sections, CONTENTS_ROWS_PER_PAGE);
  let index = 0;
  return (
    <>
      {pages.map((rows, pi) => (
        <Page key={pi} size="A4" style={styles.page}>
          <Chrome doc={doc} />
          <Text style={styles.h1}>{pi === 0 ? "What's inside" : 'Contents (continued)'}</Text>
          {rows.map((s) => {
            index += 1;
            const thumbs = s.products.map((p) => p.imageData).filter((d): d is string => !!d).slice(0, 4);
            return (
              <View key={s.title + index} style={styles.tocRow}>
                <Text style={styles.tocIndex}>{String(index).padStart(2, '0')}</Text>
                <Text style={[styles.tocTitle, { flex: 1 }]}>{s.title}</Text>
                {thumbs.length > 0 ? (
                  <View style={styles.tocThumbs}>
                    {thumbs.map((src, i) => (
                      <Image key={i} src={src} style={styles.tocThumb} />
                    ))}
                  </View>
                ) : null}
                <Text style={styles.tocCount}>
                  {s.products.length} {s.products.length === 1 ? 'product' : 'products'}
                </Text>
                <Text style={styles.tocPage}>p. {s.startPage}</Text>
              </View>
            );
          })}
        </Page>
      ))}
    </>
  );
}

function SectionPages({ doc, section }: { doc: CatalogueDoc; section: CatalogueDocSection }) {
  const pages = chunk(section.products, CARDS_PER_PAGE);

  return (
    <>
      {pages.map((pageProducts, pi) => {
        const first = pi === 0;
        const headH = first ? HEAD_FULL_H : HEAD_SLIM_H;
        // Three equal slots per page; a final page with one card still gets a
        // half-page card rather than a sliver, matching the approved sample.
        const slots = Math.max(2, Math.min(CARDS_PER_PAGE, pageProducts.length));
        const rowH = (CONTENT_H - headH - GRID_GAP * (slots - 1)) / slots;

        return (
          <Page key={pi} size="A4" style={styles.page}>
            <Chrome doc={doc} />

            {first ? (
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, clamp(1)]}>{section.title}</Text>
              </View>
            ) : (
              <View style={[styles.sectionSlim, { marginBottom: HEAD_SLIM_H - 16 }]}>
                <Text style={styles.sectionSlimTitle}>{section.title}</Text>
                <Text style={styles.footerText}>
                  continued · {pi + 1} of {pages.length}
                </Text>
              </View>
            )}

            {pageProducts.map((p, ri) => (
              <View
                key={p.id}
                style={[styles.row, { height: rowH, marginBottom: ri < pageProducts.length - 1 ? GRID_GAP : 0 }]}
              >
                <ProductCard p={p} doc={doc} />
              </View>
            ))}
          </Page>
        );
      })}
    </>
  );
}

function ThankYouPage({ doc }: { doc: CatalogueDoc }) {
  const theme = CATALOGUE_THEMES[doc.theme];
  const onPhoto = !!doc.closingImageData;
  const fg = onPhoto ? '#FFFFFF' : INK;
  const fg2 = onPhoto ? '#FFFFFF' : INK_2;

  return (
    <Page size="A4" style={[styles.closingPage, { backgroundColor: theme.block }]}>
      <View style={styles.closingFrame}>
        {onPhoto ? <Image src={doc.closingImageData!} style={styles.closingImg} /> : null}
        {onPhoto ? <View style={styles.closingShade} /> : null}
        <View style={styles.closingLayer}>
          <View style={styles.closingLogoChip}>
            <Logo style={styles.coverLogo} />
          </View>

          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.closingTitle, { color: fg }]}>Thank You</Text>
            {doc.closingNote && doc.closingNote.trim().toLowerCase() !== 'thank you' ? (
              <Text style={[styles.closingText, { color: fg2 }]}>{doc.closingNote}</Text>
            ) : null}
          </View>

          {/* Bottom slot kept empty so the title stays vertically centred. */}
          <View />
        </View>
      </View>
    </Page>
  );
}

// ── Document ───────────────────────────────────────────────────────────────

export function CataloguePDF({ doc }: { doc: CatalogueDoc }) {
  registerCatalogueFonts();
  return (
    <Document title={doc.title} author="GIVOO" subject="Product catalogue">
      <CoverPage doc={doc} />
      {doc.sections.length > 1 ? <ContentsPages doc={doc} /> : null}
      {doc.sections.map((s, i) => (
        <SectionPages key={`${s.title}-${i}`} doc={doc} section={s} />
      ))}
      <ThankYouPage doc={doc} />
    </Document>
  );
}
