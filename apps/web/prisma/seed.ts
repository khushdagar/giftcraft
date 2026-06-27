/**
 * GiftCraft seed script.
 *
 * Seeds:
 *   · 6 ShippingZones covering all Indian state codes
 *   · 4 Packaging options
 *   · 5 Addons
 *   · 20 HsnCodes
 *   · 10 OccasionConfigs (matches the homepage Bento grid)
 *   · core PlatformSettings
 *   · 4 HomepageBanners, 4 Testimonials, 3 Collections
 *   · 12 sample products with 6 price tiers each + HSN mapping
 *
 * The SEED_ADMIN_EMAIL env var is informational — the actual promotion to
 * super_admin happens in auth.ts::events.createUser when that email first
 * signs in with Google.
 *
 *   npm run db:seed    (runs `tsx prisma/seed.ts`)
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding GiftCraft…");

  // ── Platform settings ─────────────────────────────────────
  await upsertSetting("razorpay.fee_percentage", 2.0);
  await upsertSetting("razorpay.fee_gst", 18.0);
  await upsertSetting("seller.gstin", process.env.SELLER_GSTIN ?? "07AAACA1234A1Z5");
  await upsertSetting("seller.state_code", "DL");
  await upsertSetting("moq.corporate", 25);
  await upsertSetting("moq.party", 10);
  await upsertSetting("mockup.free_revisions", 2);
  await upsertSetting("mockup.paid_revision_price", 500);

  // ── Shipping zones ─────────────────────────────────────────
  // Weight-based rates (SOW: ₹ per kg per zone). `minCharge` is the floor for a
  // shipment; `flatRate` is kept only as a legacy fallback. Free shipping is
  // disabled (`freeAt: null`) — shipping is always charged by weight. Individual
  // delivery adds a %.
  const zones: {
    name: string; states: string[];
    ratePerKg: number; minCharge: number; freeAt: number | null; indivPct: number;
    flatRate: number; etaMin: number; etaMax: number;
  }[] = [
    { name: "Delhi Local",   states: ["DL"],                              ratePerKg: 40,  minCharge: 50,  freeAt: null, indivPct: 15, flatRate: 50,  etaMin: 1, etaMax: 2 },
    { name: "NCR",           states: ["HR"],                              ratePerKg: 55,  minCharge: 80,  freeAt: null, indivPct: 15, flatRate: 100, etaMin: 2, etaMax: 3 },
    { name: "North India",   states: ["PB", "CH", "JK", "HP", "UT", "RJ", "UP"], ratePerKg: 70,  minCharge: 120, freeAt: null, indivPct: 15, flatRate: 180, etaMin: 3, etaMax: 5 },
    { name: "Metro Cities",  states: ["MH", "KA", "TN", "TG", "WB"],      ratePerKg: 80,  minCharge: 150, freeAt: null, indivPct: 15, flatRate: 220, etaMin: 3, etaMax: 5 },
    { name: "Rest of India", states: ["AP", "GJ", "MP", "OR", "KL", "BR", "JH", "CG", "AS"], ratePerKg: 95,  minCharge: 180, freeAt: null, indivPct: 20, flatRate: 280, etaMin: 5, etaMax: 7 },
    { name: "North-East / Islands", states: ["ML", "MN", "NL", "TR", "AR", "MZ", "SK", "AN", "LD"], ratePerKg: 140, minCharge: 300, freeAt: null, indivPct: 20, flatRate: 420, etaMin: 7, etaMax: 10 },
  ];
  for (const z of zones) {
    const fields = {
      name: z.name,
      states: z.states,
      ratePerKg: new Prisma.Decimal(z.ratePerKg),
      minCharge: new Prisma.Decimal(z.minCharge),
      freeShippingThreshold: z.freeAt != null ? new Prisma.Decimal(z.freeAt) : null,
      individualSurchargePct: new Prisma.Decimal(z.indivPct),
      flatRate: new Prisma.Decimal(z.flatRate),
      etaMinDays: z.etaMin,
      etaMaxDays: z.etaMax,
      isActive: true,
    };
    await prisma.shippingZone.upsert({
      where: { id: `zone-${z.name.replace(/\s/g, "-").toLowerCase()}` },
      create: { id: `zone-${z.name.replace(/\s/g, "-").toLowerCase()}`, ...fields },
      update: fields,
    });
  }

  // ── Packaging ─────────────────────────────────────────────
  const pkgs = [
    { slug: "white-box",   name: "White Gift Box",       price: 0,  description: "Included in every order", imageUrl: null },
    { slug: "kraft-box",   name: "Kraft Craft Box",      price: 25, description: "Eco recycled brown board", imageUrl: null },
    { slug: "premium-box", name: "Premium Rigid Box",    price: 85, description: "Magnetic closure, ribbon pull", imageUrl: null },
    { slug: "luxe-trunk",  name: "Luxe Wooden Trunk",    price: 350,description: "For VIP hampers", imageUrl: null },
    {
      slug: "swag-mailer-1125x875x4",
      name: "Custom Mailer Box 11.25 x 8.75 x 4",
      price: 1649,
      description: "Swagup SKU: P9NRERK | Full Color printing | US/Global Shipping",
      imageUrl: "https://swagup-static.swagup.com/platform/media/form/products/01tPH000007lcAfYAI/01tPH000007lcAfYAI-1727109886009.png"
    },
    {
      slug: "swag-mailer-19x14x10.5",
      name: "Custom Mailer Box 19 x 14 x 10.5",
      price: 3055,
      description: "Swagup SKU: PE9ES0V | Full Color printing | Global Shipping",
      imageUrl: "https://swagup-static.swagup.com/platform/media/form/068PH00000KPTZaYAP.png"
    },
    {
      slug: "swag-mailer-16x12x6",
      name: "Standard Custom Mailer Box 16 x 12 x 6",
      price: 2500,
      description: "Swagup SKU: P2UDALM | Full Color printing | Premium mailer box",
      imageUrl: "https://swagup-static.swagup.com/platform/media/form/068PH00000KPTZaYAP.png"
    },
  ];
  for (let i = 0; i < pkgs.length; i++) {
    const p = pkgs[i]!;
    await prisma.packaging.upsert({
      where: { slug: p.slug },
      create: { ...p, price: new Prisma.Decimal(p.price), sortOrder: i, isActive: true },
      update: { imageUrl: p.imageUrl },
    });
  }

  // ── Addons ─────────────────────────────────────────────────
  const addons = [
    { slug: "thankyou-card", name: "Thank-you Card",  price: 15 },
    { slug: "ribbon",        name: "Branded Ribbon",  price: 10 },
    { slug: "hang-tag",      name: "Hang Tag",        price: 8  },
    { slug: "wax-seal",      name: "Wax Seal",        price: 25 },
    { slug: "tissue",        name: "Tissue Stuffing", price: 5  },
  ];
  for (let i = 0; i < addons.length; i++) {
    const a = addons[i]!;
    await prisma.addon.upsert({
      where: { slug: a.slug },
      create: { ...a, price: new Prisma.Decimal(a.price), sortOrder: i, isActive: true },
      update: {},
    });
  }

  // ── HSN codes ─────────────────────────────────────────────
  const hsns = [
    ["3303", "Perfumes", 18], ["3926", "Plastic articles", 18], ["4205", "Leather articles", 18],
    ["4817", "Stationery items", 12], ["4820", "Registers, notebooks", 12], ["4901", "Printed books", 0],
    ["6117", "Knitted accessories", 12], ["6212", "Bras & belts", 12], ["6307", "Textile made-ups", 5],
    ["7013", "Glassware", 18], ["7117", "Imitation jewellery", 3], ["7323", "Stainless steel articles", 12],
    ["8215", "Cutlery", 18], ["8504", "Chargers / PSUs", 18], ["8517", "Telephony devices", 18],
    ["8518", "Audio speakers", 18], ["9102", "Watches", 18], ["9403", "Furniture", 18],
    ["9503", "Toys", 12], ["9617", "Vacuum flasks", 18],
  ] as const;
  for (const [code, desc, gst] of hsns) {
    await prisma.hsnCode.upsert({
      where: { code },
      create: { code, description: desc, defaultGstRate: new Prisma.Decimal(gst) },
      update: {},
    });
  }

  // ── Occasion configs ─────────────────────────────────────
  const occasions = [
    ["diwali",        "Diwali",         "🪔"],
    ["holi",          "Holi",           "🎨"],
    ["christmas",     "Christmas",      "🎄"],
    ["new-year",      "New Year",       "🎆"],
    ["womens-day",    "Women's Day",    "💝"],
    ["onboarding",    "Onboarding",     "👋"],
    ["client-gifting","Client Gifting", "💼"],
    ["birthday",      "Birthday",       "🎂"],
    ["anniversary",   "Anniversary",    "🏆"],
    ["farewell",      "Farewell",       "👋"],
  ] as const;
  for (let i = 0; i < occasions.length; i++) {
    const [slug, name, icon] = occasions[i]!;
    await prisma.occasionConfig.upsert({
      where: { slug },
      create: { slug, name, icon, sortOrder: i, isActive: true },
      update: {},
    });
  }

  // ── Sample testimonials ──────────────────────────────────
  const testimonials = [
    { quote: "GiftCraft made our Diwali gifting effortless. 200 branded hampers in 9 days.", authorName: "Priya Sharma", authorRole: "HR Lead", companyName: "TechCorp" },
    { quote: "The mockup approval flow saved us from three disasters.", authorName: "Rohan Mehta", authorRole: "Ops Manager", companyName: "FlipStart" },
    { quote: "Finally a platform that treats corporate gifting like a real product.", authorName: "Anjali Kapoor", authorRole: "Marketing", companyName: "Nykaa" },
    { quote: "Transparent pricing is rare in this space.", authorName: "Vikram Singh", authorRole: "Admin", companyName: "Razorpay" },
  ];
  for (let i = 0; i < testimonials.length; i++) {
    await prisma.testimonial.upsert({
      where: { id: `seed-testimonial-${i}` },
      create: { id: `seed-testimonial-${i}`, ...testimonials[i]!, sortOrder: i, isActive: true },
      update: {},
    });
  }

  // ── Sample collections ───────────────────────────────────
  for (const [slug, name, desc] of [
    ["budget", "Budget-Friendly Under ₹500", "Thoughtful gifts that won't break the bank."],
    ["premium", "Premium Executive Collection", "Luxury gifts for your most valued relationships."],
    ["eco", "Eco-Friendly Gifts", "Sustainable choices for conscious companies."],
  ] as const) {
    await prisma.collection.upsert({
      where: { slug },
      create: { slug, name, description: desc, isActive: true },
      update: {},
    });
  }

  // ── Sample products ──────────────────────────────────────
  const products = [
    { slug: "flask-500",     name: "Stainless Steel Flask 500ml",   brand: "Borosil",   sku: "BOR-FLK-500",  basePrice: 285,  eco: true,  featured: true,  hsn: "9617", tech: "uv_print"       },
    { slug: "notebook-a5",   name: "A5 Hardbound Notebook",         brand: "Classmate", sku: "CLS-NB-A5",    basePrice: 125,  eco: false, featured: true,  hsn: "4820", tech: "emboss"         },
    { slug: "pen-set",       name: "Premium Roller Pen Set",        brand: "Parker",    sku: "PAR-PEN-SET",  basePrice: 450,  eco: false, featured: true,  hsn: "3926", tech: "laser_engraving"},
    { slug: "backpack",      name: "20L Commuter Backpack",         brand: "Wildcraft", sku: "WC-BP-20",     basePrice: 1450, eco: false, featured: true,  hsn: "4205", tech: "embroidery"     },
    { slug: "speaker",       name: "Portable Bluetooth Speaker",    brand: "JBL",       sku: "JBL-SPK-01",   basePrice: 1890, eco: false, featured: true,  hsn: "8518", tech: "screen_print"   },
    { slug: "mug",           name: "Ceramic Travel Mug",            brand: "Starbucks", sku: "SBX-MUG-01",   basePrice: 345,  eco: false, featured: true,  hsn: "7013", tech: "screen_print"   },
    { slug: "tshirt",        name: "Premium Cotton T-Shirt",        brand: "Bewakoof",  sku: "BWK-TSH-M",    basePrice: 385,  eco: false, featured: false, hsn: "6117", tech: "embroidery"     },
    { slug: "chocolates",    name: "Artisan Chocolate Box",         brand: "Smoor",     sku: "SMR-CHB-01",   basePrice: 580,  eco: true,  featured: false, hsn: "4901", tech: "digital_print"  },
    { slug: "planter",       name: "Ceramic Desk Planter",          brand: "Ugaoo",     sku: "UGA-PLN-01",   basePrice: 245,  eco: true,  featured: false, hsn: "7013", tech: "digital_print"  },
    { slug: "powerbank",     name: "10000mAh Power Bank",           brand: "Ambrane",   sku: "AMB-PB-10K",   basePrice: 850,  eco: false, featured: false, hsn: "8504", tech: "uv_print"       },
    { slug: "umbrella",      name: "Compact Travel Umbrella",       brand: "Citizen",   sku: "CTZ-UMB-01",   basePrice: 385,  eco: false, featured: false, hsn: "6307", tech: "screen_print"   },
    { slug: "candle",        name: "Scented Soy Candle",            brand: "Ekam",      sku: "EKM-CND-01",   basePrice: 325,  eco: true,  featured: false, hsn: "4901", tech: "digital_print"  },
  ] as const;

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug, name: p.name, brand: p.brand, sku: p.sku,
        descriptionShort: `${p.brand} · ${p.name}`,
        descriptionLong: `A premium ${p.name.toLowerCase()} from ${p.brand}. Customisable with your branding.`,
        status: "active",
        isEcoCertified: p.eco, isFeatured: p.featured,
        printingTechnique: p.tech,
        leadTimeDays: 10,
      },
      update: {},
    });

    // 6 price tiers with small step-downs
    const tiers = [
      { tier: 1, min: 25,   max: 49,    mult: 1.00 },
      { tier: 2, min: 50,   max: 99,    mult: 0.95 },
      { tier: 3, min: 100,  max: 249,   mult: 0.90 },
      { tier: 4, min: 250,  max: 499,   mult: 0.85 },
      { tier: 5, min: 500,  max: 999,   mult: 0.80 },
      { tier: 6, min: 1000, max: null,  mult: 0.75 },
    ];
    for (const t of tiers) {
      const sell = Math.round(p.basePrice * t.mult);
      const cost = Math.round(sell * 0.65);
      await prisma.priceTier.upsert({
        where: { productId_tier: { productId: product.id, tier: t.tier } },
        create: {
          productId: product.id, tier: t.tier,
          minQty: t.min, maxQty: t.max,
          costPrice: new Prisma.Decimal(cost),
          sellPrice: new Prisma.Decimal(sell),
        },
        update: {},
      });
    }

    // HSN mapping
    const hsn = await prisma.hsnCode.findUnique({ where: { code: p.hsn } });
    if (hsn) {
      await prisma.productHsn.upsert({
        where: { productId: product.id },
        create: { productId: product.id, hsnId: hsn.id, gstRate: hsn.defaultGstRate },
        update: {},
      });
    }
  }

  console.log("✅ Seed complete.");
  console.log("   Sign in with the Google account matching SEED_ADMIN_EMAIL in .env");
  console.log("   to be auto-promoted to super_admin on first login.");
}

async function upsertSetting(key: string, value: unknown) {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue },
    update: { value: value as Prisma.InputJsonValue },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
