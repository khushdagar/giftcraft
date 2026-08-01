import { prisma } from '../apps/web/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import fs from 'fs'
import path from 'path'

// Load the web app's env manually (single source of truth for DATABASE_URL)
const envFile = path.resolve(__dirname, '../apps/web/.env')
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf-8')
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      let value = valueParts.join('=').trim()
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (key && value && !process.env[key.trim()]) {
        process.env[key.trim()] = value
      }
    }
  })
}

const USD_TO_INR = 83 // Current exchange rate

async function seedDemoProducts() {
  console.log('🌱 Seeding demo products for GIVOO...\n')

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. CREATE CATEGORIES
    // ═══════════════════════════════════════════════════════════
    console.log('📂 Creating categories...')

    const capCategory = await prisma.category.upsert({
      where: { slug: 'caps-hats' },
      update: {},
      create: {
        name: 'Caps & Hats',
        slug: 'caps-hats',
        sortOrder: 1,
      },
    })

    const mensApparel = await prisma.category.upsert({
      where: { slug: 'mens-apparel' },
      update: {},
      create: {
        name: "Men's Apparel",
        slug: 'mens-apparel',
        sortOrder: 2,
      },
    })

    const womensApparel = await prisma.category.upsert({
      where: { slug: 'womens-apparel' },
      update: {},
      create: {
        name: "Women's Apparel",
        slug: 'womens-apparel',
        sortOrder: 3,
      },
    })

    console.log('✅ Categories created\n')

    // ═══════════════════════════════════════════════════════════
    // 2. CREATE HSN CODES
    // ═══════════════════════════════════════════════════════════
    console.log('🏷️  Creating HSN codes...')

    const hsn6505 = await prisma.hsnCode.upsert({
      where: { code: '6505' },
      update: {},
      create: {
        code: '6505',
        description: 'Hats and other headgear, knitted or crocheted, or made up from lace',
        defaultGstRate: new Decimal('18.00'),
      },
    })

    const hsn6204 = await prisma.hsnCode.upsert({
      where: { code: '6204' },
      update: {},
      create: {
        code: '6204',
        description: 'Womens or girls suits, jackets, blazers, dresses, skirts etc.',
        defaultGstRate: new Decimal('18.00'),
      },
    })

    console.log('✅ HSN codes created\n')

    // ═══════════════════════════════════════════════════════════
    // 3. CREATE PRODUCTS WITH PRICING TIERS
    // ═══════════════════════════════════════════════════════════

    // PRODUCT 1: 5-Panel Hat
    console.log('👒 Creating Product 1: 5-Panel Hat...')

    const product1Tiers = [
      { minQty: 25, maxQty: 49, priceUsd: 27.25 },
      { minQty: 50, maxQty: 99, priceUsd: 26.68 },
      { minQty: 100, maxQty: 249, priceUsd: 26.12 },
      { minQty: 250, maxQty: 499, priceUsd: 25.55 },
      { minQty: 500, maxQty: 999, priceUsd: 23.85 },
      { minQty: 1000, maxQty: null, priceUsd: 23.85 },
    ]

    const product1 = await prisma.product.upsert({
      where: { sku: 'PKQD2FW' },
      update: {},
      create: {
        name: '5-Panel Hat - Curved Brim - Unstructured - Cotton Twill',
        slug: '5-panel-hat-curved-brim-cotton-twill',
        sku: 'PKQD2FW',
        descriptionShort: 'Classic 5-panel unstructured cotton twill hat with curved brim',
        descriptionLong:
          'Premium quality 5-panel cap with curved brim in unstructured cotton twill. Available in multiple colors. Perfect for corporate gifting with embroidery or screen print options.',
        material: 'Cotton Twill',
        weightG: 150,
        leadTimeDays: 10,
        status: 'active',
        printingTechnique: 'embroidery',
        isFeatured: true,
        sortOrder: 1,
        priceTiers: {
          create: product1Tiers.map((tier, idx) => ({
            tier: idx + 1,
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            costPrice: new Decimal((tier.priceUsd * USD_TO_INR * 0.6).toFixed(2)),
            sellPrice: new Decimal((tier.priceUsd * USD_TO_INR).toFixed(2)),
          })),
        },
        images: {
          create: [
            {
              url: 'https://cdn.swagupadmin.com/aloha/media/a71c5885-3f82-485e-99d8-454bcc872c9b.PNG',
              altText: '5-Panel Hat - Navy Blue',
              isPrimary: true,
              sortOrder: 1,
            },
          ],
        },
        categories: {
          create: [{ categoryId: capCategory.id }],
        },
        hsn: {
          create: {
            hsnId: hsn6505.id,
            gstRate: new Decimal('18.00'),
          },
        },
      },
    })

    console.log('✅ Product 1 created with', product1Tiers.length, 'price tiers\n')

    // PRODUCT 2: North End Men's Rhythm Waffle Quarter-Zip
    console.log('👕 Creating Product 2: North End Quarter-Zip...')

    const product2Tiers = [
      { minQty: 25, maxQty: 49, priceUsd: 171.5 },
      { minQty: 50, maxQty: 99, priceUsd: 150.66 },
      { minQty: 100, maxQty: 149, priceUsd: 139.5 },
      { minQty: 150, maxQty: 249, priceUsd: 135.33 },
      { minQty: 250, maxQty: 499, priceUsd: 129.1 },
      { minQty: 500, maxQty: 999, priceUsd: 117.08 },
      { minQty: 1000, maxQty: null, priceUsd: 112.25 },
    ]

    const product2 = await prisma.product.upsert({
      where: { sku: 'PREFOXH' },
      update: {},
      create: {
        name: "North End Men's Rhythm Waffle Quarter-Zip",
        slug: 'north-end-mens-rhythm-waffle-quarter-zip',
        sku: 'PREFOXH',
        descriptionShort: 'Premium waffle knit quarter-zip pullover for men',
        descriptionLong:
          'High-quality waffle knit quarter-zip pullover perfect for corporate gifting. Available in multiple colors with embroidery and heat transfer decoration options.',
        material: 'Waffle Knit Polyester',
        leadTimeDays: 12,
        status: 'active',
        printingTechnique: 'embroidery',
        isFeatured: true,
        sortOrder: 2,
        priceTiers: {
          create: product2Tiers.map((tier, idx) => ({
            tier: idx + 1,
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            costPrice: new Decimal((tier.priceUsd * USD_TO_INR * 0.6).toFixed(2)),
            sellPrice: new Decimal((tier.priceUsd * USD_TO_INR).toFixed(2)),
          })),
        },
        images: {
          create: [
            {
              url: 'https://cdn.swagupadmin.com/aloha/media/13b94025-fbf7-45fd-a329-e84ac9da20c2.png',
              altText: "North End Men's Rhythm Quarter-Zip - Black",
              isPrimary: true,
              sortOrder: 1,
            },
          ],
        },
        categories: {
          create: [{ categoryId: mensApparel.id }],
        },
        hsn: {
          create: {
            hsnId: hsn6204.id,
            gstRate: new Decimal('18.00'),
          },
        },
      },
    })

    console.log('✅ Product 2 created with', product2Tiers.length, 'price tiers\n')

    // PRODUCT 3: Women's Signature Crew in White
    console.log('👚 Creating Product 3: Women\'s Signature Crew...')

    const product3Tiers = [
      { minQty: 25, maxQty: 49, priceUsd: 155.9 },
      { minQty: 50, maxQty: 99, priceUsd: 138.26 },
      { minQty: 100, maxQty: 149, priceUsd: 129.96 },
      { minQty: 150, maxQty: 249, priceUsd: 125.62 },
      { minQty: 250, maxQty: 499, priceUsd: 117.22 },
      { minQty: 500, maxQty: 999, priceUsd: 108.68 },
      { minQty: 1000, maxQty: null, priceUsd: 98.89 },
    ]

    const product3 = await prisma.product.upsert({
      where: { sku: 'PASHZWT' },
      update: {},
      create: {
        name: "Women's Signature Crew in White",
        slug: 'womens-signature-crew-white',
        sku: 'PASHZWT',
        descriptionShort: 'Premium women\'s crew neck signature t-shirt',
        descriptionLong:
          'High-quality women\'s crew neck t-shirt in white. Perfect for corporate branding with embroidery options. Available in multiple sizes and also in black and blue colors.',
        material: 'Cotton',
        leadTimeDays: 10,
        status: 'active',
        printingTechnique: 'embroidery',
        isFeatured: true,
        sortOrder: 3,
        priceTiers: {
          create: product3Tiers.map((tier, idx) => ({
            tier: idx + 1,
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            costPrice: new Decimal((tier.priceUsd * USD_TO_INR * 0.6).toFixed(2)),
            sellPrice: new Decimal((tier.priceUsd * USD_TO_INR).toFixed(2)),
          })),
        },
        images: {
          create: [
            {
              url: 'https://cdn.swagupadmin.com/aloha/media/8c806ce5-68e4-4778-873f-93d8e7df501e.jpg',
              altText: "Women's Signature Crew - White",
              isPrimary: true,
              sortOrder: 1,
            },
          ],
        },
        categories: {
          create: [{ categoryId: womensApparel.id }],
        },
        hsn: {
          create: {
            hsnId: hsn6204.id,
            gstRate: new Decimal('18.00'),
          },
        },
      },
    })

    console.log('✅ Product 3 created with', product3Tiers.length, 'price tiers\n')

    // ═══════════════════════════════════════════════════════════
    // 4. SAMPLE PACKS — removed
    // ═══════════════════════════════════════════════════════════
    // The standalone Collection model was removed. Collections are now
    // tag-driven OccasionConfig rows (isCollection=true); products join a
    // collection by carrying a matching tag rather than via a pack table.

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('════════════════════════════════════════════════════════\n')
    console.log('✅ DEMO PRODUCTS SEEDED SUCCESSFULLY!\n')
    console.log('📊 Summary:')
    console.log('   3 Products created')
    console.log('   20 Price tiers created (for bulk discounts)')
    console.log('   3 Categories created')
    console.log('   2 HSN codes created\n')
    console.log('🎯 Next steps:')
    console.log('   1. Visit /catalog to see products')
    console.log('   2. Visit /packs to see the sample packs')
    console.log('   3. Try the gift builder with these products')
    console.log('   4. Check pricing tiers in Step 4\n')
    console.log('🗑️  To remove demo data later:')
    console.log('   Run: npx ts-node scripts/cleanup-demo-products.ts\n')
  } catch (error) {
    console.error('❌ Error seeding products:', error)
    process.exit(1)
  }
}

seedDemoProducts().finally(() => prisma.$disconnect())
