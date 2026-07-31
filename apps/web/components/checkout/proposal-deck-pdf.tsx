import fs from "fs";
import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

/**
 * Proposal Deck — a landscape, slide-style PDF generated from a saved Quote.
 *
 * Replaces the manually-built "Curated Merchandise & Gifting Ideas" deck: the
 * slides are derived entirely from the products the customer picked in the
 * builder, so no per-quote design work is needed.
 *
 * Slide order:
 *   1. Cover            — product-image collage + auto title/subtitle
 *   2. What's Inside    — one card per Category present in the pack
 *   3..N. Product slide — OPTION n, brand/price, keyFeatures bullets, image
 *   N+1. Packaging & Add-ons — the box (left) and add-ons (right), if any
 *   N+2. Pricing Summary — table of every product at unit price incl. GST
 *   N+3. Fulfilment      — quantity, branding, packaging, next steps
 *
 * All data arrives pre-resolved from the route (images already downloaded to
 * data URIs) so this component stays pure and never performs I/O.
 */

// ── Font ───────────────────────────────────────────────────────────────────
// The PDF built-ins (Helvetica et al.) have no ₹ glyph, so every price would
// render as a broken box. Inter ships the Indian Rupee sign and matches the
// clean grotesque of the reference deck. Registered once per process; failures
// are swallowed so a missing file degrades to Helvetica rather than 500-ing the
// download.
const FONT_DIR = path.join(process.cwd(), "public", "fonts");
const FONT = "Inter";

// GIVOO logo (514×235 png in /public). react-pdf can't resolve a bare
// filesystem path as an Image src, so files are read once into buffers.
// Null (file missing) simply omits the logo rather than failing the render.
type PngSrc = { data: Buffer; format: "png" } | null;
const pngCache = new Map<string, PngSrc>();
function loadPng(name: string): PngSrc {
  if (!pngCache.has(name)) {
    try {
      pngCache.set(name, {
        data: fs.readFileSync(path.join(process.cwd(), "public", name)),
        format: "png",
      });
    } catch {
      pngCache.set(name, null);
    }
  }
  return pngCache.get(name)!;
}
const givooLogo = () => loadPng("givoo_logo.png");
// Pre-faded copy (logo blended ~7% toward white). Drawn at FULL opacity as the
// page watermark — PDF-level alpha on images renders inconsistently across
// viewers, so the fade is baked into the bitmap instead.
const givooWatermark = () => loadPng("givoo_logo_watermark.png");

let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  fontsReady = true;
  try {
    Font.register({
      family: FONT,
      fonts: [
        { src: path.join(FONT_DIR, "Inter_400Regular.ttf"), fontWeight: 400 },
        { src: path.join(FONT_DIR, "Inter_500Medium.ttf"), fontWeight: 500 },
        { src: path.join(FONT_DIR, "Inter_600SemiBold.ttf"), fontWeight: 600 },
        { src: path.join(FONT_DIR, "Inter_700Bold.ttf"), fontWeight: 700 },
      ],
    });
    // Headings are set tight; react-pdf's default hyphenation would break words
    // like "Gifting" mid-title. Return the word unchanged to disable it.
    Font.registerHyphenationCallback((word) => [word]);
  } catch {
    /* falls back to Helvetica */
  }
}

// ── Palette ────────────────────────────────────────────────────────────────
// Deliberately restrained: this document goes to a client's procurement team,
// so it follows the reference deck (near-black text, warm neutral blocks, a
// single mint accent) rather than the vibrant Bento styling of the storefront.
const INK = "#222222";
const INK_2 = "#44443E";
const INK_3 = "#5C5852";
const HAIRLINE = "#E4E4DE";
const NEUTRAL = "#F0EEEA"; // image / card background block
const PEACH = "#FBE3C7"; // cover block
const MINT = "#D6F3E4"; // accent chip + callout
const MINT_INK = "#0F7A4F";

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 10,
    color: INK,
    backgroundColor: "#FFFFFF",
  },

  // ── Cover ────────────────────────────────────────────────────────────────
  cover: { flexDirection: "row", height: "100%" },
  coverArt: {
    width: "42%",
    backgroundColor: PEACH,
    padding: 26,
    justifyContent: "center",
  },
  coverBody: {
    width: "58%",
    paddingHorizontal: 54,
    justifyContent: "center",
  },
  coverTitle: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 30,
    lineHeight: 1.2,
    letterSpacing: -0.6,
    marginBottom: 26,
  },
  coverSub: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 12,
    lineHeight: 1.55,
    color: INK_2,
  },
  coverMeta: { marginTop: 30, fontSize: 9, color: INK_3, lineHeight: 1.6 },

  // GIVOO × client-logo lockup at the top of the cover body.
  lockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 26,
  },
  // Cover logo (514×235 source → keep the ~2.2:1 aspect).
  coverLogo: { width: 74, height: 34, objectFit: "contain" },
  // Small GIVOO logo pinned to the top-right of every content slide.
  slideLogo: {
    position: "absolute",
    top: 22,
    right: 30,
    width: 56,
    height: 26,
    objectFit: "contain",
  },
  lockupX: { fontSize: 11, color: INK_3 },
  lockupLogoBox: { width: 92, height: 26, justifyContent: "center" },
  lockupLogo: { width: "100%", height: "100%", objectFit: "contain" },

  // Full-page diagonal GIVOO watermark, painted before (i.e. behind) content.
  watermarkWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  watermarkLogo: {
    width: 480,
    height: 220,
    objectFit: "contain",
    transform: "rotate(-22deg)",
  },
  // Fallback when the logo file is missing.
  watermarkText: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 150,
    letterSpacing: 10,
    color: INK,
    opacity: 0.03,
    transform: "rotate(-22deg)",
  },

  // Collage — the cover art block adapts to how many products were picked.
  collageRow: { flexDirection: "row", gap: 10 },
  // No `flex` here — inside the vertically-centred cover block a flexed column
  // would stretch to full height and push its tiles to the top.
  collageCol: { gap: 10 },
  collageTile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  collageImg: { objectFit: "contain", width: "100%", height: "100%" },

  // ── Generic slide chrome ─────────────────────────────────────────────────
  slide: { paddingVertical: 48, paddingHorizontal: 54, height: "100%" },
  h1: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  lead: { fontSize: 10.5, lineHeight: 1.6, color: INK_2, maxWidth: "82%" },

  // ── Slide 2: category cards ──────────────────────────────────────────────
  cardRow: { flexDirection: "row", gap: 14, marginTop: 34 },
  card: { flex: 1, backgroundColor: NEUTRAL, borderRadius: 6, padding: 16 },
  cardTitle: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 12,
    lineHeight: 1.35,
    marginBottom: 8,
  },
  cardBody: { fontSize: 9.5, lineHeight: 1.55, color: INK_2 },
  cardBullet: { flexDirection: "row", marginTop: 5 },
  cardBulletDot: { width: 10, fontSize: 9.5, color: INK_2 },
  cardBulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.45, color: INK_2 },

  // ── Product slides ───────────────────────────────────────────────────────
  productSlide: { flexDirection: "row", height: "100%" },
  productBody: {
    width: "56%",
    paddingHorizontal: 48,
    paddingVertical: 44,
    justifyContent: "center",
  },
  productArt: {
    width: "44%",
    backgroundColor: NEUTRAL,
    padding: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  productImg: { objectFit: "contain", width: "100%", height: "100%" },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: MINT,
    color: INK,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
    fontSize: 7.5,
    letterSpacing: 0.9,
    marginBottom: 12,
  },
  productName: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 23,
    lineHeight: 1.2,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  productMeta: { fontSize: 10, color: MINT_INK, marginBottom: 18 },
  productMetaStrong: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 10,
    color: MINT_INK,
  },
  // "(inclusive of GST …)" note after the price.
  productMetaNote: { fontSize: 8.5, color: INK_3 },
  featuresLabel: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 11,
    marginBottom: 9,
  },
  bulletRow: { flexDirection: "row", marginBottom: 5 },
  bulletDot: { width: 11, fontSize: 9.5, color: INK_2 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.5, color: INK_2 },
  // Bold branding call-out below the Key Features list.
  brandingChip: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    backgroundColor: MINT,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  brandingChipLabel: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 9.5,
    color: INK,
  },
  brandingChipValue: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 9.5,
    color: MINT_INK,
  },
  imgFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  imgFallbackText: { fontSize: 9, color: INK_3 },

  // ── Pricing table — itemised GST table, same layout as the proforma invoice ─
  table: { marginTop: 26, borderTop: 1.5, borderTopColor: INK },
  tHead: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottom: 1,
    borderBottomColor: HAIRLINE,
    alignItems: "flex-end",
  },
  tRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottom: 1,
    borderBottomColor: HAIRLINE,
    alignItems: "center",
  },
  tGrandRow: {
    flexDirection: "row",
    paddingVertical: 11,
    paddingHorizontal: 10,
    backgroundColor: NEUTRAL,
    borderBottom: 1.5,
    borderBottomColor: INK,
    alignItems: "center",
  },
  tHeadCell: { fontFamily: FONT, fontWeight: 700, fontSize: 8.5, color: INK_2 },
  tCell: { fontSize: 8.5, color: INK_2 },
  tCellStrong: { fontFamily: FONT, fontWeight: 700, fontSize: 8.5, color: INK },
  cHsn: { fontSize: 7, color: INK_3, marginTop: 2 },
  // Column widths (sum ≈ 100%). Numeric columns right-aligned like the invoice.
  cItem: { width: "23%", paddingRight: 6 },
  cQty: { width: "7%", textAlign: "right" },
  cRate: { width: "12%", textAlign: "right" },
  cTaxable: { width: "14%", textAlign: "right" },
  cGstPct: { width: "8%", textAlign: "right" },
  cTax: { width: "11%", textAlign: "right" },
  cTaxWide: { width: "22%", textAlign: "right" },
  cTotal: { width: "14%", textAlign: "right" },

  // Per-pack price call-out above the table.
  perPackChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    backgroundColor: MINT,
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginTop: 2,
  },
  perPackLabel: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 10.5,
    color: INK,
  },
  perPackValue: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 10.5,
    color: MINT_INK,
  },
  perPackNote: {
    fontSize: 8.5,
    color: INK_2,
    alignSelf: "center",
    marginLeft: 6,
  },

  // ── Packaging & Add-ons slide ────────────────────────────────────────────
  paRow: { flexDirection: "row", gap: 30, marginTop: 28, flex: 1 },
  paCol: { flex: 1 },
  paBoxArt: {
    backgroundColor: NEUTRAL,
    borderRadius: 6,
    height: 225,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  paName: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  addonDesc: { fontSize: 8.5, lineHeight: 1.45, color: INK_2, marginTop: 2 },

  // Heading row of the Pricing Summary slide — per-pack chip right beside the h1.
  summaryHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  // ── Fulfilment slide ─────────────────────────────────────────────────────
  gridRow: { flexDirection: "row", gap: 26, marginTop: 26 },
  gridCell: { flex: 1 },
  stepNum: { fontSize: 9, color: INK_3, marginBottom: 6 },
  // A zero-height View draws no border in react-pdf, so the rule is a filled
  // block instead.
  stepRule: { height: 1.5, backgroundColor: MINT_INK, marginBottom: 10 },
  stepTitle: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 12,
    marginBottom: 6,
  },
  stepBody: { fontSize: 9.5, lineHeight: 1.55, color: INK_2 },

  // ── Footer (all slides except the cover) ─────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 22,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: INK_3,
  },
});

// ── Types ──────────────────────────────────────────────────────────────────

export interface DeckProduct {
  id: string;
  name: string;
  brand?: string | null;
  /** Unit price incl. GST and branding, already computed by the route. */
  unitPrice: number;
  keyFeatures: string[];
  /** Human-readable branding method, e.g. "Laser Engraving". */
  brandingLabel?: string | null;
  categoryName: string;
  /** data: URI, or null when the image was missing / failed to download. */
  imageData?: string | null;
  variantValue?: string | null;
}

export interface DeckCategory {
  name: string;
  description?: string | null;
  productNames: string[];
}

/** The selected gift box, with its price already GST-inclusive. */
export interface DeckPackaging {
  name: string;
  size?: string | null;
  /** Per-pack price incl. GST, computed by the route. */
  price: number;
  imageData?: string | null;
}

/** One add-on line (incl. the sleeve pseudo-add-on), price GST-inclusive. */
export interface DeckAddon {
  name: string;
  /** Per-pack price incl. GST, computed by the route. */
  price: number;
  description?: string | null;
  imageData?: string | null;
}

/**
 * One line of the itemised GST table — identical shape to the proforma
 * invoice's rows (see components/orders/invoice-pdf.tsx). Built in the route
 * from the quote payload with the same maths, so the two documents agree.
 * `quantity`/`unitPrice` are null for charges that aren't sold by the unit
 * (shipping, gateway fee).
 */
export interface DeckInvoiceRow {
  name: string;
  hsn: string;
  quantity: number | null;
  unitPrice: number | null; // exclusive of GST
  taxable: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface DeckInvoice {
  /** Same state → CGST + SGST columns; different state → one IGST column. */
  isIntraState: boolean;
  rows: DeckInvoiceRow[];
  totals: {
    quantity: number;
    unitPrice: number;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
}

export interface ProposalDeckPDFProps {
  companyName?: string | null;
  quoteRef: string;
  validUntil: Date;
  totalUnits: number;
  packQuantity: number;
  packagingName?: string | null;
  products: DeckProduct[];
  categories: DeckCategory[];
  /** Selected box for the Packaging & Add-ons slide, if any. */
  packaging?: DeckPackaging | null;
  /** Add-ons for the Packaging & Add-ons slide (may include the sleeve). */
  addons?: DeckAddon[];
  /** Client logo as a data: URI (from the builder's logo upload), if any. */
  clientLogo?: string | null;
  /** Itemised proforma table for the Pricing Summary slide, if available. */
  invoice?: DeckInvoice | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Paise-accurate formatting for the proforma breakdown lines. */
const rupees2 = (n: number) =>
  `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dateIN = (d: Date) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** Slide footer — quote reference on the left, page marker on the right. */
function Footer({ quoteRef }: { quoteRef: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>GIVOO · Proposal {quoteRef}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

/**
 * Faint diagonal GIVOO logo watermark. Rendered as the FIRST child of a page
 * so all content (including opaque colour blocks) paints over it. Falls back
 * to the text wordmark if the logo file is missing.
 */
function Watermark() {
  const mark = givooWatermark();
  return (
    <View style={styles.watermarkWrap}>
      {mark ? (
        <Image src={mark} style={styles.watermarkLogo} />
      ) : (
        <Text style={styles.watermarkText}>GIVOO</Text>
      )}
    </View>
  );
}

/** Small GIVOO logo pinned to the top-right of a content slide. */
function SlideLogo() {
  const logo = givooLogo();
  if (!logo) return null;
  return <Image src={logo} style={styles.slideLogo} />;
}

/**
 * Cover collage — shows EVERY selected product (capped at 6 tiles so a huge
 * pack can't shrink each image into a postage stamp). Layout adapts to count:
 *   1 → one large tile · 2 → two stacked · 3 → one large + two small
 *   4–6 → a 2-column grid, tile height scaled so the block stays ~320pt tall
 */
function Collage({ images }: { images: string[] }) {
  const usable = images.slice(0, 6);

  if (usable.length === 0) {
    return (
      <View style={[styles.collageTile, { height: 300 }]}>
        <Text style={styles.imgFallbackText}>Your selected products</Text>
      </View>
    );
  }

  if (usable.length === 1) {
    return (
      <View style={[styles.collageTile, { height: 320 }]}>
        <Image src={usable[0]} style={styles.collageImg} />
      </View>
    );
  }

  if (usable.length === 2) {
    return (
      <View style={styles.collageCol}>
        {usable.map((src, i) => (
          <View key={i} style={[styles.collageTile, { height: 155 }]}>
            <Image src={src} style={styles.collageImg} />
          </View>
        ))}
      </View>
    );
  }

  if (usable.length === 3) {
    return (
      <View style={styles.collageRow}>
        <View style={[styles.collageTile, { flex: 1.35, height: 320 }]}>
          <Image src={usable[0]} style={styles.collageImg} />
        </View>
        <View style={[styles.collageCol, { flex: 1 }]}>
          <View style={[styles.collageTile, { height: 155 }]}>
            <Image src={usable[1]} style={styles.collageImg} />
          </View>
          <View style={[styles.collageTile, { height: 155 }]}>
            <Image src={usable[2]} style={styles.collageImg} />
          </View>
        </View>
      </View>
    );
  }

  // 4–6 images: rows of two; a trailing odd image spans the full row width.
  const rows: string[][] = [];
  for (let i = 0; i < usable.length; i += 2) rows.push(usable.slice(i, i + 2));
  const tileH = Math.floor((320 - (rows.length - 1) * 10) / rows.length);

  return (
    <View style={styles.collageCol}>
      {rows.map((row, r) => (
        <View key={r} style={styles.collageRow}>
          {row.map((src, c) => (
            <View
              key={c}
              style={[styles.collageTile, { flex: 1, height: tileH }]}
            >
              <Image src={src} style={styles.collageImg} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function ProductArt({ src, name }: { src?: string | null; name: string }) {
  return (
    <View style={styles.productArt}>
      {src ? (
        <Image src={src} style={styles.productImg} />
      ) : (
        <View style={styles.imgFallback}>
          <Text style={styles.imgFallbackText}>{name}</Text>
        </View>
      )}
    </View>
  );
}

// ── Document ───────────────────────────────────────────────────────────────

export function ProposalDeckPDF({
  companyName,
  quoteRef,
  validUntil,
  totalUnits,
  packQuantity,
  packagingName,
  products,
  categories,
  packaging,
  addons = [],
  clientLogo,
  invoice,
}: ProposalDeckPDFProps) {
  registerFonts();

  const forWhom = companyName?.trim() || "Your Team";
  const categoryCount = categories.length;

  // Distinct branding methods across the pack, for the fulfilment slide.
  const brandingMethods = Array.from(
    new Set(products.map((p) => p.brandingLabel).filter(Boolean) as string[]),
  );

  const coverImages = products
    .map((p) => p.imageData)
    .filter((src): src is string => !!src);

  return (
    <Document
      title={`GIVOO Proposal — ${forWhom}`}
      author="GIVOO by Arts Shala"
      subject="Curated Merchandise & Gifting Proposal"
    >
      {/* ── 1. Cover ───────────────────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Watermark />
        <View style={styles.cover}>
          <View style={styles.coverArt}>
            <Collage images={coverImages} />
          </View>
          <View style={styles.coverBody}>
            {/* GIVOO × client lockup */}
            <View style={styles.lockup}>
              {givooLogo() ? (
                <Image src={givooLogo()!} style={styles.coverLogo} />
              ) : null}
              {clientLogo ? (
                <>
                  <Text style={styles.lockupX}>×</Text>
                  <View style={styles.lockupLogoBox}>
                    <Image src={clientLogo} style={styles.lockupLogo} />
                  </View>
                </>
              ) : null}
            </View>
            <Text style={styles.coverTitle}>
              Curated Merchandise &amp; Gifting Ideas for {forWhom}
            </Text>
            <Text style={styles.coverSub}>
              A product proposal presenting premium, brand-worthy gifting
              solutions across {categoryCount}{" "}
              {categoryCount === 1
                ? "category"
                : "carefully selected categories"}{" "}
              — designed to suit your budget and occasion.
            </Text>
            <View style={styles.coverMeta}>
              <Text>Proposal {quoteRef}</Text>
              <Text>
                Prepared {dateIN(new Date())} · Valid until {dateIN(validUntil)}
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ── 2. What's Inside ───────────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Watermark />
        <SlideLogo />
        <View style={styles.slide}>
          <Text style={styles.h1}>What&apos;s Inside This Proposal</Text>
          <Text style={styles.lead}>
            We&apos;ve shortlisted {products.length}{" "}
            {products.length === 1 ? "product" : "products"} across{" "}
            {categoryCount} {categoryCount === 1 ? "category" : "categories"},
            keeping quality, brand-worthiness, and pricing in mind. Each option
            includes specs, key features, and pricing so you can see exactly
            what you&apos;re getting.
          </Text>

          {/* Cards are laid out in rows of three so a 4–6 product pack still
              reads cleanly instead of squeezing every category onto one line. */}
          {Array.from({ length: Math.ceil(categories.length / 3) }).map(
            (_, rowIdx) => (
              <View key={rowIdx} style={styles.cardRow}>
                {categories.slice(rowIdx * 3, rowIdx * 3 + 3).map((cat, i) => (
                  <View key={cat.name} style={styles.card}>
                    <Text style={styles.cardTitle}>
                      Category {rowIdx * 3 + i + 1}: {cat.name}
                    </Text>
                    {/* Falls back to a neutral line so a category with no
                        description in the admin doesn't leave a bare card. */}
                    <Text style={styles.cardBody}>
                      {cat.description?.trim() ||
                        `${cat.productNames.length} handpicked ${
                          cat.productNames.length === 1 ? "option" : "options"
                        }, selected for quality and brand-worthiness.`}
                    </Text>
                    {cat.productNames.map((n) => (
                      <View key={n} style={styles.cardBullet}>
                        <Text style={styles.cardBulletDot}>•</Text>
                        <Text style={styles.cardBulletText}>{n}</Text>
                      </View>
                    ))}
                  </View>
                ))}
                {/* Pad the final row so 1–2 trailing cards keep their width. */}
                {categories.slice(rowIdx * 3, rowIdx * 3 + 3).length < 3 &&
                  Array.from({
                    length:
                      3 - categories.slice(rowIdx * 3, rowIdx * 3 + 3).length,
                  }).map((__, p) => (
                    <View key={`pad-${p}`} style={{ flex: 1 }} />
                  ))}
              </View>
            ),
          )}
        </View>
        <Footer quoteRef={quoteRef} />
      </Page>

      {/* ── 3..N. One slide per product ────────────────────────────────── */}
      {products.map((product, idx) => {
        // Alternate which side the image sits on so the deck doesn't read as
        // the same slide repeated.
        const imageFirst = idx % 2 === 1;
        const art = (
          <ProductArt key="art" src={product.imageData} name={product.name} />
        );
        const body = (
          <View key="body" style={styles.productBody}>
            <Text style={styles.chip}>OPTION {idx + 1}</Text>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productMeta}>
              {product.brand ? (
                <Text style={styles.productMetaStrong}>
                  Brand: {product.brand} |{" "}
                </Text>
              ) : null}
              <Text style={styles.productMetaStrong}>
                Price: {rupees(product.unitPrice)}
              </Text>
              <Text> a piece</Text>
              {product.variantValue ? (
                <Text> | {product.variantValue}</Text>
              ) : null}
              <Text style={styles.productMetaNote}>
                {"  "}(all-inclusive of GST)
              </Text>
            </Text>

            <Text style={styles.featuresLabel}>Key Features</Text>
            {product.keyFeatures.length > 0 ? (
              product.keyFeatures.slice(0, 8).map((f, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{f}</Text>
                </View>
              ))
            ) : (
              <View style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  Premium, brand-ready product — full specification shared on
                  request.
                </Text>
              </View>
            )}

            {product.brandingLabel ? (
              <View style={styles.brandingChip}>
                <Text style={styles.brandingChipLabel}>Branding: </Text>
                <Text style={styles.brandingChipValue}>
                  {product.brandingLabel}
                </Text>
              </View>
            ) : null}
          </View>
        );

        return (
          <Page
            key={product.id}
            size="A4"
            orientation="landscape"
            style={styles.page}
          >
            <Watermark />
            <View style={styles.productSlide}>
              {imageFirst ? [art, body] : [body, art]}
            </View>
            <SlideLogo />
            <Footer quoteRef={quoteRef} />
          </Page>
        );
      })}

      {/* ── N+1. Packaging & Add-ons — box left, add-ons right ─────────── */}
      {packaging || addons.length > 0 ? (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <Watermark />
          <SlideLogo />
          <View style={styles.slide}>
            <Text style={styles.h1}>Packaging &amp; Add-ons</Text>
            <Text style={styles.lead}>
              Every pack arrives fully assembled
              {packaging ? " in the box below" : ""}
              {addons.length > 0
                ? ", finished with the add-ons included in this proposal"
                : ""}
              .
            </Text>

            <View style={styles.paRow}>
              {/* Left — the box */}
              <View style={styles.paCol}>
                <Text style={styles.chip}>THE BOX</Text>
                {packaging ? (
                  <>
                    <View style={styles.paBoxArt}>
                      {packaging.imageData ? (
                        <Image
                          src={packaging.imageData}
                          style={styles.productImg}
                        />
                      ) : (
                        <View style={styles.imgFallback}>
                          <Text style={styles.imgFallbackText}>
                            {packaging.name}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.paName}>{packaging.name}</Text>
                    <Text style={styles.productMeta}>
                      <Text style={styles.productMetaStrong}>
                        {rupees(packaging.price)}
                      </Text>
                      <Text> per pack</Text>
                      {packaging.size ? (
                        <Text> | Size: {packaging.size}</Text>
                      ) : null}
                      <Text style={styles.productMetaNote}>
                        {"  "}(all-inclusive of GST)
                      </Text>
                    </Text>
                  </>
                ) : (
                  <Text style={styles.stepBody}>
                    No box selected for this proposal.
                  </Text>
                )}
              </View>

              {/* Right — add-ons */}
              <View style={styles.paCol}>
                <Text style={styles.chip}>ADD-ONS</Text>
                {addons.length > 0 ? (
                  /* Same design as the box: image tile, then name and price
                     below. With several add-ons the tiles shrink to fit. */
                  addons.map((a, i) => (
                    <View key={i} style={i > 0 ? { marginTop: 16 } : undefined}>
                      <View
                        style={[
                          styles.paBoxArt,
                          addons.length > 1
                            ? { height: addons.length === 2 ? 100 : 64 }
                            : {},
                        ]}
                      >
                        {a.imageData ? (
                          <Image src={a.imageData} style={styles.productImg} />
                        ) : (
                          <View style={styles.imgFallback}>
                            <Text style={styles.imgFallbackText}>{a.name}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.paName}>{a.name}</Text>
                      <Text style={styles.productMeta}>
                        <Text style={styles.productMetaStrong}>
                          {rupees(a.price)}
                        </Text>
                        <Text> per pack</Text>
                        <Text style={styles.productMetaNote}>
                          {"  "}(all-inclusive of GST)
                        </Text>
                      </Text>
                      {a.description ? (
                        <Text style={styles.addonDesc}>{a.description}</Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.stepBody}>
                    No add-ons included in this proposal.
                  </Text>
                )}
              </View>
            </View>
          </View>
          <Footer quoteRef={quoteRef} />
        </Page>
      ) : null}

      {/* ── N+2. Pricing Summary ───────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Watermark />
        <SlideLogo />
        <View style={styles.slide}>
          {/* Heading + per-pack price on one row — the number a buyer actually
              budgets with sits right beside the title. */}
          <View style={styles.summaryHead}>
            <Text style={[styles.h1, { marginBottom: 0 }]}>
              Pricing Summary
            </Text>
            {invoice && packQuantity > 0 ? (
              <View style={[styles.perPackChip, { marginTop: 0 }]}>
                <Text style={styles.perPackLabel}>Per Pack Price: </Text>
                <Text style={styles.perPackValue}>
                  {rupees2(invoice.totals.total / packQuantity)}
                </Text>
                <Text style={styles.perPackNote}>
                  · all-inclusive of GST · {packQuantity}{" "}
                  {packQuantity === 1 ? "pack" : "packs"}
                </Text>
              </View>
            ) : null}
          </View>
          {invoice ? (
            /* Itemised GST table — identical rows and totals to the proforma
               invoice, built from the same quote snapshot. */
            <View style={styles.table}>
              <View style={styles.tHead}>
                <Text style={[styles.tHeadCell, styles.cItem]}>Item</Text>
                <Text style={[styles.tHeadCell, styles.cQty]}>Qty</Text>
                <Text style={[styles.tHeadCell, styles.cRate]}>Unit Price</Text>
                <Text style={[styles.tHeadCell, styles.cTaxable]}>
                  Taxable Value
                </Text>
                <Text style={[styles.tHeadCell, styles.cGstPct]}>GST %</Text>
                {invoice.isIntraState ? (
                  <>
                    <Text style={[styles.tHeadCell, styles.cTax]}>CGST</Text>
                    <Text style={[styles.tHeadCell, styles.cTax]}>SGST</Text>
                  </>
                ) : (
                  <Text style={[styles.tHeadCell, styles.cTaxWide]}>IGST</Text>
                )}
                <Text style={[styles.tHeadCell, styles.cTotal]}>Total</Text>
              </View>

              {invoice.rows.map((r, i) => (
                <View key={i} style={styles.tRow}>
                  <View style={styles.cItem}>
                    <Text style={styles.tCellStrong}>{r.name}</Text>
                    <Text style={styles.cHsn}>HSN {r.hsn}</Text>
                  </View>
                  <Text style={[styles.tCell, styles.cQty]}>
                    {r.quantity ?? "—"}
                  </Text>
                  <Text style={[styles.tCell, styles.cRate]}>
                    {r.unitPrice != null ? rupees2(r.unitPrice) : "—"}
                  </Text>
                  <Text style={[styles.tCell, styles.cTaxable]}>
                    {rupees2(r.taxable)}
                  </Text>
                  <Text style={[styles.tCell, styles.cGstPct]}>
                    {r.gstRate}%
                  </Text>
                  {invoice.isIntraState ? (
                    <>
                      <Text style={[styles.tCell, styles.cTax]}>
                        {rupees2(r.cgst)}
                      </Text>
                      <Text style={[styles.tCell, styles.cTax]}>
                        {rupees2(r.sgst)}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.tCell, styles.cTaxWide]}>
                      {rupees2(r.igst)}
                    </Text>
                  )}
                  <Text style={[styles.tCellStrong, styles.cTotal]}>
                    {rupees2(r.total)}
                  </Text>
                </View>
              ))}

              {/* Grand total — every column summed except GST % */}
              <View style={styles.tGrandRow}>
                <Text style={[styles.tCellStrong, styles.cItem]}>
                  Grand Total
                </Text>
                <Text style={[styles.tCellStrong, styles.cQty]}>—</Text>
                <Text style={[styles.tCellStrong, styles.cRate]}>
                  {rupees2(invoice.totals.unitPrice)}
                </Text>
                <Text style={[styles.tCellStrong, styles.cTaxable]}>
                  {rupees2(invoice.totals.taxable)}
                </Text>
                <Text style={[styles.tCell, styles.cGstPct]}>—</Text>
                {invoice.isIntraState ? (
                  <>
                    <Text style={[styles.tCellStrong, styles.cTax]}>
                      {rupees2(invoice.totals.cgst)}
                    </Text>
                    <Text style={[styles.tCellStrong, styles.cTax]}>
                      {rupees2(invoice.totals.sgst)}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.tCellStrong, styles.cTaxWide]}>
                    {rupees2(invoice.totals.igst)}
                  </Text>
                )}
                <Text style={[styles.tCellStrong, styles.cTotal]}>
                  {rupees2(invoice.totals.total)}
                </Text>
              </View>
            </View>
          ) : (
            /* No pricing snapshot on the quote — fall back to unit prices only. */
            <View style={styles.table}>
              <View style={styles.tHead}>
                <Text style={[styles.tHeadCell, { width: "70%" }]}>
                  Product
                </Text>
                <Text
                  style={[
                    styles.tHeadCell,
                    { width: "30%", textAlign: "right" },
                  ]}
                >
                  Unit Price (Incl GST and Branding)
                </Text>
              </View>
              {products.map((p) => (
                <View key={p.id} style={styles.tRow}>
                  <Text style={[styles.tCell, { width: "70%" }]}>{p.name}</Text>
                  <Text
                    style={[
                      styles.tCellStrong,
                      { width: "30%", textAlign: "right" },
                    ]}
                  >
                    {rupees(p.unitPrice)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <Footer quoteRef={quoteRef} />
      </Page>

      {/* ── N+3. Fulfilment & Customization ────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Watermark />
        <SlideLogo />
        <View style={styles.slide}>
          <Text style={styles.h1}>Fulfilment &amp; Customization</Text>

          <View style={styles.gridRow}>
            <View style={styles.gridCell}>
              <Text style={styles.stepNum}>01</Text>
              <View style={styles.stepRule} />
              <Text style={styles.stepTitle}>Total Quantity</Text>
              <Text style={styles.stepBody}>
                {totalUnits} units across {products.length}{" "}
                {products.length === 1 ? "product" : "products"} ({packQuantity}{" "}
                {packQuantity === 1 ? "pack" : "packs"}).
              </Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.stepNum}>02</Text>
              <View style={styles.stepRule} />
              <Text style={styles.stepTitle}>Customization / Branding</Text>
              <Text style={styles.stepBody}>
                All items carry your branding
                {brandingMethods.length > 0
                  ? ` via ${brandingMethods.join(" / ")}`
                  : ""}
                , depending upon the chosen product. Branding cost is already
                included in the unit prices shown.
              </Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCell}>
              <Text style={styles.stepNum}>03</Text>
              <View style={styles.stepRule} />
              <Text style={styles.stepTitle}>Packaging</Text>
              <Text style={styles.stepBody}>
                {packagingName
                  ? `${packagingName} — included with every pack.`
                  : "No packaging included in this proposal."}
              </Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.stepNum}>04</Text>
              <View style={styles.stepRule} />
              <Text style={styles.stepTitle}>Next Steps</Text>
              <Text style={styles.stepBody}>
                Confirm your preferred options to proceed. Samples can be
                arranged for any product before the order is finalised. This
                proposal is valid until {dateIN(validUntil)}.
              </Text>
            </View>
          </View>
        </View>
        <Footer quoteRef={quoteRef} />
      </Page>
    </Document>
  );
}
