import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { stripHtml } from '@/lib/strip-html';
import { resolveProductHsn, type ResolvedHsn } from '@/lib/quote-pricing';
import {
  ProposalDeckPDF,
  MultiProposalDeckPDF,
  type ProposalDeckPDFProps,
  type DeckOptionSummary,
  type DeckProduct,
  type DeckCategory,
  type DeckInvoice,
  type DeckInvoiceRow,
  type DeckPackaging,
  type DeckAddon,
} from '@/components/checkout/proposal-deck-pdf';

/**
 * Shared proposal-deck renderer.
 *
 * Both the quote deck (/api/quotes/[token]/deck) and the post-order deck
 * (/api/orders/[id]/deck) render the SAME document from the same builder-shaped
 * payload — the order route just reconstructs that payload from the saved order
 * so a confirmed buyer can still download their proposal.
 */

/** Human-readable labels for the PrintingTechnique enum. */
const BRANDING_LABELS: Record<string, string> = {
  screen_print: 'Screen Printing',
  uv_print: 'UV Printing',
  embroidery: 'Embroidery',
  laser_engraving: 'Laser Engraving',
  digital_print: 'Digital Printing',
  emboss: 'Embossing',
  none: '',
};

const UNCATEGORISED = 'Corporate Gifting';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Tax fallbacks — identical to lib/quote-pricing, so a product with no
 * ProductHsn row is taxed the same way in the deck as in the priced quote.
 */
const DEFAULT_HSN_CODE = '4820';
const DEFAULT_GST_RATE = 18;
/** Packaging and add-ons are always billed as printed paper goods at 18%. */
const PACKAGING_HSN_CODE = '4819';
const PACKAGING_GST_RATE = 18;

/**
 * Build the deck's itemised GST table from the payload — the SAME rows and
 * maths as @giftcraft/pricing, so the table's Grand Total is exactly the
 * `pricing.grandTotal` the client sees in the email, on the quote page and at
 * checkout. Products + packaging + add-ons are GST-exclusive lines; shipping
 * and the payment gateway fee are GST-INCLUSIVE amounts whose taxable value
 * comes from the snapshot (reverse-calculated only for legacy snapshots that
 * never stored the split). Returns null when there is no pricing snapshot.
 *
 * Tax identity is NEVER assumed: `taxById` carries each product's HSN code and
 * GST rate resolved from the database (the same source computePricing was fed),
 * because proposal payloads don't snapshot them. Defaulting to 18% here is what
 * used to make the deck disagree with the email on any 5%/12% product.
 */
function buildDeckInvoice(
  payload: any,
  taxById: Map<string, ResolvedHsn>
): DeckInvoice | null {
  const pricing = payload?.pricing;
  if (!pricing || !(Number(pricing.grandTotal) > 0)) return null;

  const packQuantity = Number(payload?.packQuantity) || 1;

  // Place of supply: same state → CGST + SGST, different state → IGST.
  const isIntraState = Number(pricing.igst || 0) <= 0;
  const splitGst = (gst: number) => {
    if (!isIntraState) return { cgst: 0, sgst: 0, igst: gst };
    const cgst = round2(gst / 2);
    return { cgst, sgst: round2(gst - cgst), igst: 0 };
  };

  /** A row whose GST amount is already decided by the caller. */
  const row = (
    name: string,
    hsn: string,
    quantity: number | null,
    taxable: number,
    gstRate: number,
    gst: number
  ): DeckInvoiceRow => ({
    name,
    hsn,
    quantity,
    unitPrice: quantity && quantity > 0 ? round2(taxable / quantity) : null,
    taxable: round2(taxable),
    gstRate,
    ...splitGst(round2(gst)),
    total: round2(taxable + gst),
  });

  /**
   * Spread a group's GST across its lines the way computePricing rounds it:
   * the GST for the WHOLE group is rounded once, then handed out per line with
   * the last line absorbing the remainder. Rounding each line independently
   * would drift a paisa or two off the amount actually charged.
   */
  const spreadGst = (
    lines: { taxable: number }[],
    rate: number
  ): number[] => {
    const groupTaxable = lines.reduce((s, l) => s + l.taxable, 0);
    const groupGst = round2((groupTaxable * rate) / 100);
    let allocated = 0;
    return lines.map((l, i) => {
      if (i === lines.length - 1) return round2(groupGst - allocated);
      const share = round2((l.taxable * rate) / 100);
      allocated = round2(allocated + share);
      return share;
    });
  };

  const rows: DeckInvoiceRow[] = [];

  // 1. Products — one row each; each pack holds one unit of every product.
  //    Grouped by HSN code so the GST rounding matches the priced quote.
  const productLines = (payload.products || []).map((p: any) => {
    const tax = taxById.get(String(p.id));
    const gstRate = Number(p.gstRate ?? tax?.gstRate ?? DEFAULT_GST_RATE);
    const qty = (Number(p.quantity) || 1) * packQuantity;
    return {
      name: p.name || 'Product',
      hsn: String(p.hsnCode || tax?.hsnCode || DEFAULT_HSN_CODE),
      qty,
      taxable: round2((Number(p.sellPrice) || 0) * qty),
      gstRate,
    };
  });
  // GST is rounded per HSN group, but the rows stay in pack order so the table
  // reads in the same sequence as the product slides.
  const productGroups = new Map<string, number[]>();
  for (let i = 0; i < productLines.length; i++) {
    const line = productLines[i];
    const key = `${line.hsn}|${line.gstRate}`;
    const group = productGroups.get(key);
    if (group) group.push(i);
    else productGroups.set(key, [i]);
  }
  const productGst: number[] = new Array(productLines.length).fill(0);
  for (const indices of productGroups.values()) {
    const lines = indices.map((i) => productLines[i]);
    const gsts = spreadGst(lines, lines[0]!.gstRate);
    indices.forEach((originalIndex, i) => {
      productGst[originalIndex] = gsts[i]!;
    });
  }
  productLines.forEach((line: any, i: number) => {
    rows.push(row(line.name, line.hsn, line.qty, line.taxable, line.gstRate, productGst[i]!));
  });

  // 2. Packaging & add-ons — priced per gift pack (HSN 4819, 18%), and taxed
  // as ONE group by the pricing engine. The order route has no per-item
  // breakdown, so it passes the stored totals directly.
  const packagingTotal = round2(
    payload.packagingTotal != null
      ? Number(payload.packagingTotal) || 0
      : (Number(payload.packaging?.price) || 0) * packQuantity
  );
  const addonsPerUnit =
    (payload.addons || []).reduce(
      (sum: number, a: any) => sum + (Number(a.price) || 0),
      0
    ) + (payload.sleeve ? 60 : 0);
  const addonsTotal = round2(
    payload.addonsTotal != null
      ? Number(payload.addonsTotal) || 0
      : addonsPerUnit * packQuantity
  );
  const packLines = [
    { name: 'Packaging', taxable: packagingTotal },
    { name: 'Add-ons', taxable: addonsTotal },
  ].filter((l) => l.taxable > 0);
  if (packLines.length > 0) {
    const gsts = spreadGst(packLines, PACKAGING_GST_RATE);
    packLines.forEach((l, i) => {
      rows.push(
        row(l.name, PACKAGING_HSN_CODE, packQuantity, l.taxable, PACKAGING_GST_RATE, gsts[i]!)
      );
    });
  }

  // 3. Shipping — quoted GST-INCLUSIVE, so its taxable half is the split the
  // pricing engine already stored (reverse-calculated for legacy snapshots).
  const shipping = round2(Number(pricing.shipping) || 0);
  if (shipping > 0) {
    const taxable =
      pricing.shippingTaxable != null
        ? round2(Number(pricing.shippingTaxable))
        : round2(shipping / 1.18);
    rows.push(row('Shipping', '996812', null, taxable, 18, round2(shipping - taxable)));
  }

  // 4. A negotiated discount reduces the amount payable after GST, exactly as
  // computePricing applies it — shown as its own line so the table still adds up.
  const discount = round2(Number(pricing.discount) || 0);
  if (discount > 0) {
    rows.push(row('Discount', '—', null, -discount, 0, 0));
  }

  // 5. Payment gateway fee — 2% + GST on it, taken straight from the snapshot
  // so the deck can never restate the fee the customer is actually charged.
  const gatewayFee = round2(Number(pricing.razorpayFee) || 0);
  if (gatewayFee > 0) {
    const base =
      pricing.razorpayFeeBase != null
        ? round2(Number(pricing.razorpayFeeBase))
        : round2(gatewayFee / 1.18);
    rows.push(row('Payment Gateway Fee', '997158', null, base, 18, round2(gatewayFee - base)));
  }

  // Grand total across every column except GST % (a rate can't be summed).
  const sum = (pick: (r: DeckInvoiceRow) => number) =>
    round2(rows.reduce((s, r) => s + pick(r), 0));

  // Safety net: the table must state the amount the customer was actually
  // quoted. Any residue is sub-rupee rounding — absorb it into the last row so
  // the column still adds up. A larger gap means the snapshot and the line
  // items genuinely disagree (a stale payload), which is logged, not hidden.
  const grandTotal = round2(Number(pricing.grandTotal) || 0);
  const drift = round2(grandTotal - sum((r) => r.total));
  if (drift !== 0) {
    if (Math.abs(drift) <= 1) {
      const last = rows[rows.length - 1]!;
      last.total = round2(last.total + drift);
      last.taxable = round2(last.taxable + drift);
    } else {
      console.error(
        `[proposal-deck] pricing snapshot (₹${grandTotal}) disagrees with itemised total (₹${sum(
          (r) => r.total
        )}) — check the quote payload`
      );
    }
  }

  return {
    isIntraState,
    rows,
    totals: {
      quantity: rows.reduce((s, r) => s + (r.quantity ?? 0), 0),
      unitPrice: sum((r) => r.unitPrice ?? 0),
      taxable: sum((r) => r.taxable),
      cgst: sum((r) => r.cgst),
      sgst: sum((r) => r.sgst),
      igst: sum((r) => r.igst),
      total: sum((r) => r.total),
    },
  };
}

/**
 * Turn the Key Features rich text into the deck's bullet lines.
 *
 * The field is authored as a bullet list in the admin (and may be plain text on
 * older records), so block-level tags become line breaks and everything else is
 * stripped. Empty lines and stray list markers are dropped.
 */
function toBullets(html: string | null | undefined): string[] {
  if (!html) return [];

  return html
    // Every block boundary becomes a line break.
    .replace(/<\/(li|p|div|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((line) => stripHtml(line).replace(/^[•\-–—*·]\s*/, '').trim())
    .filter((line) => line !== '');
}

/**
 * Download an image and return it as a data URI for @react-pdf/renderer.
 *
 * react-pdf throws if a remote image 404s or times out, which would fail the
 * whole document — so every fetch is bounded and failures degrade to `null`
 * (the deck renders a text placeholder in that tile instead).
 *
 * react-pdf only decodes JPEG and PNG, but a good share of the product library
 * is webp/avif, so anything else is transcoded to PNG via sharp first. If sharp
 * is unavailable in the running environment the transcode is skipped rather
 * than failing the request.
 */
async function toDataUri(url: string | undefined | null): Promise<string | null> {
  if (!url) return null;

  const absolute = url.startsWith('http')
    ? url
    : `${process.env.NEXT_PUBLIC_APP_URL || ''}${url.startsWith('/') ? '' : '/'}${url}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(absolute, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;

    const type = (res.headers.get('content-type') || '').split(';')[0]!.toLowerCase();
    if (!type.startsWith('image/')) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;

    if (/^image\/(jpeg|jpg|png)$/.test(type)) {
      return `data:${type};base64,${buffer.toString('base64')}`;
    }

    try {
      const sharp = (await import('sharp')).default;
      // Flatten onto white: webp/avif cut-outs are usually transparent, and the
      // deck sits them on a light block, so white matches the surrounding tile.
      const png = await sharp(buffer)
        .flatten({ background: '#FFFFFF' })
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      return `data:image/png;base64,${png.toString('base64')}`;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export interface DeckMeta {
  /** Shown on the cover, e.g. "#A1B2C3D4" or the order number. */
  reference: string;
  /** Cover date line — quote expiry, or the order date for a placed order. */
  validUntil: Date;
  /** Falls back to the address on the payload when null. */
  companyName?: string | null;
  /** True for a deck rebuilt from a placed order — switches validity wording. */
  placed?: boolean;
}

/**
 * Resolve one builder-shaped payload into the deck component's props (live
 * product copy + images, snapshot pricing). Shared by the single-pack deck and
 * the combined multi-option deck.
 * Throws when the payload carries no products.
 */
async function buildDeckProps(
  payload: any,
  meta: DeckMeta
): Promise<ProposalDeckPDFProps> {
  const payloadProducts: any[] = Array.isArray(payload?.products)
    ? payload.products
    : [];
  if (payloadProducts.length === 0) {
    throw new Error('NO_PRODUCTS');
  }

  const packQuantity = Number(payload?.packQuantity) || 1;

  // Deck content (features, images, category) is read live from the product
  // master rather than the payload snapshot, so an admin improving a product's
  // copy immediately improves every deck generated afterwards. Pricing still
  // comes from the snapshot so the deck can never contradict the quote/order.
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: payloadProducts.map((p) => p.id).filter(Boolean) } },
    select: {
      id: true,
      name: true,
      brand: true,
      keyFeatures: true,
      printingTechnique: true,
      images: {
        select: { url: true, isPrimary: true, sortOrder: true },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        take: 1,
      },
      categories: {
        select: { category: { select: { name: true, description: true, sortOrder: true } } },
        take: 1,
      },
    },
  });

  const byId = new Map(dbProducts.map((p) => [p.id, p]));

  // Tax identity comes from the ProductHsn table — the same source the quote
  // was priced from. Proposal payloads carry no HSN/GST (only order-derived
  // payloads snapshot them), so without this lookup the deck would fall back to
  // a flat 18% and overstate every 5%/12% product against the quoted price.
  const taxById = await resolveProductHsn(payloadProducts.map((p) => p.id));

  // Both the box and the add-ons are Products (Packaging / Add-on category)
  // and are looked up live so the slide reflects the current admin imagery,
  // while prices stay from the snapshot. The packaging snapshot id is
  // synthetic — `<productId>-<size>` (see lib/packaging-designs) — so the
  // size suffix is stripped before hitting the Product table.
  const payloadAddons: any[] = Array.isArray(payload?.addons) ? payload.addons : [];
  const packagingProductId = payload?.packaging?.id
    ? String(payload.packaging.id).replace(/-(small|medium|large)$/i, '')
    : null;
  const extraIds = [
    ...(packagingProductId ? [packagingProductId] : []),
    ...payloadAddons.map((a) => a.id).filter(Boolean),
  ];
  const extraProducts = extraIds.length
    ? await prisma.product.findMany({
        where: { id: { in: extraIds } },
        select: {
          id: true,
          descriptionShort: true,
          images: {
            select: { url: true },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
          },
        },
      })
    : [];
  const extraById = new Map(extraProducts.map((p) => [p.id, p]));
  const packagingProduct = packagingProductId
    ? extraById.get(packagingProductId)
    : null;

  // Resolve images in parallel — a slow CDN on one product shouldn't stack up
  // behind the others. The client's uploaded logo (builder Step 2) rides along.
  const [clientLogo, packagingImage, imageData, addonImages] = await Promise.all([
    toDataUri(payload?.logoUrl),
    toDataUri(packagingProduct?.images[0]?.url),
    Promise.all(payloadProducts.map((p) => toDataUri(byId.get(p.id)?.images[0]?.url))),
    Promise.all(
      payloadAddons.map((a) => toDataUri(extraById.get(a.id)?.images[0]?.url))
    ),
  ]);

  const products: DeckProduct[] = payloadProducts.map((p, idx) => {
    const db = byId.get(p.id);
    const gstRate = Number(p.gstRate ?? taxById.get(String(p.id))?.gstRate ?? DEFAULT_GST_RATE);
    const sellPrice = Number(p.sellPrice) || 0;
    const technique = db?.printingTechnique ?? p.printingTechnique ?? 'none';

    return {
      id: p.id || `item-${idx}`,
      name: db?.name || p.name || 'Product',
      brand: db?.brand ?? p.brand ?? null,
      // Unit price incl. GST and branding — branding is already inside the
      // sell price (CLAUDE.md Rule 1), so only GST is added here.
      unitPrice: sellPrice * (1 + gstRate / 100),
      keyFeatures: toBullets(db?.keyFeatures),
      brandingLabel: BRANDING_LABELS[technique] || null,
      categoryName: db?.categories[0]?.category.name || UNCATEGORISED,
      imageData: imageData[idx],
      // Joined for the deck's one-line summary, e.g. "Matte Black · 750 ml".
      variantValue:
        (p.variants || []).map((v: any) => v.value).join(' · ') || null,
    };
  });

  // Group products into the "What's Inside" cards, preserving the order in
  // which each category first appears in the pack.
  const categoryMap = new Map<string, DeckCategory>();
  for (const p of products) {
    const existing = categoryMap.get(p.categoryName);
    if (existing) {
      existing.productNames.push(p.name);
    } else {
      const db = byId.get(p.id);
      // Category descriptions are authored as rich text in the admin, so the
      // markup is stripped and the copy trimmed to fit a card.
      const raw = stripHtml(db?.categories[0]?.category.description || '').trim();
      categoryMap.set(p.categoryName, {
        name: p.categoryName,
        description:
          raw.length > 220 ? `${raw.slice(0, 217).trimEnd()}…` : raw || null,
        productNames: [p.name],
      });
    }
  }

  const companyName =
    payload?.address?.company?.trim() || meta.companyName || null;

  // Packaging & Add-ons slide data. Prices are shown GST-inclusive like the
  // product slides — both lines carry 18% GST in the invoice maths above.
  const packaging: DeckPackaging | null = payload?.packaging
    ? {
        name: payload.packaging.name || 'Gift Box',
        size: payload.packaging.size || null,
        price: (Number(payload.packaging.price) || 0) * 1.18,
        imageData: packagingImage,
      }
    : null;

  const trimDesc = (html: string | null | undefined) => {
    const raw = stripHtml(html || '').trim();
    if (!raw) return null;
    return raw.length > 160 ? `${raw.slice(0, 157).trimEnd()}…` : raw;
  };

  const addons: DeckAddon[] = payloadAddons.map((a, idx) => ({
    name: a.name || 'Add-on',
    price: (Number(a.price) || 0) * 1.18,
    description: trimDesc(extraById.get(a.id)?.descriptionShort),
    imageData: addonImages[idx],
  }));
  // The branded sleeve is a flat ₹60/pack flag rather than an Addon record.
  if (payload?.sleeve) {
    addons.push({
      name: 'Branded Sleeve',
      price: 60 * 1.18,
      description:
        'A custom-printed sleeve wrapped around every box for an extra branded touch.',
      imageData: null,
    });
  }

  return {
    companyName,
    quoteRef: meta.reference,
    validUntil: meta.validUntil,
    placed: meta.placed,
    packQuantity,
    products,
    categories: Array.from(categoryMap.values()),
    packaging,
    addons,
    clientLogo,
    invoice: buildDeckInvoice(payload, taxById),
    packLabel: payload?.packLabel || null,
    packTagline: payload?.packTagline || null,
  };
}

/**
 * Render the proposal deck PDF for a builder-shaped payload.
 * Throws when the payload carries no products.
 */
export async function renderProposalDeck(
  payload: any,
  meta: DeckMeta
): Promise<Buffer> {
  const props = await buildDeckProps(payload, meta);
  // A single-pack deck never labels its cover with an option name.
  return renderToBuffer(<ProposalDeckPDF {...props} packLabel={null} />);
}

/**
 * Render ONE deck covering every option in a multi-pack proposal: a comparison
 * slide up front, then the full slide set for each pack.
 * Packs whose payload has no products are skipped; throws if none survive.
 */
export async function renderMultiProposalDeck(
  packs: { label: string; tagline?: string | null; payload: any }[],
  meta: DeckMeta
): Promise<Buffer> {
  const decks: ProposalDeckPDFProps[] = [];
  const options: DeckOptionSummary[] = [];

  for (const pack of packs) {
    let props: ProposalDeckPDFProps;
    try {
      props = await buildDeckProps(pack.payload, meta);
    } catch {
      continue; // an empty option shouldn't sink the whole deck
    }
    props.packLabel = pack.label;
    props.packTagline = pack.tagline ?? null;
    decks.push(props);

    const grandTotal = Number(pack.payload?.pricing?.grandTotal) || 0;
    const packQuantity = Number(pack.payload?.packQuantity) || 1;
    options.push({
      label: pack.label,
      tagline: pack.tagline ?? null,
      productCount: props.products.length,
      packQuantity,
      perPack: packQuantity > 0 ? grandTotal / packQuantity : grandTotal,
      grandTotal,
      // Reuse the already-downloaded product art from this option's own
      // slides — the overview card shows the same contents the client sees on
      // the compare page, with no second round of image fetches.
      products: props.products.map((p) => ({
        name: p.name,
        brand: p.brand ?? null,
        imageData: p.imageData ?? null,
      })),
      packagingName: props.packaging?.name ?? null,
      addonNames: (props.addons ?? []).map((a) => a.name),
    });
  }

  if (decks.length === 0) throw new Error('NO_PRODUCTS');

  return renderToBuffer(
    <MultiProposalDeckPDF
      companyName={decks[0]!.companyName}
      quoteRef={meta.reference}
      validUntil={meta.validUntil}
      options={options}
      decks={decks}
    />
  );
}
