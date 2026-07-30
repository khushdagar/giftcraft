/**
 * Seed Script: Add Dummy Products to GIVOO
 * Creates 2-3 products per category with Unsplash images and price tiers
 *
 * Usage: npx tsx scripts/seed-dummy-products.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { PrismaClient, ProductStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Unsplash image URLs (free, no auth required)
const UNSPLASH_IMAGES = {
  mugs: [
    'https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=500&h=500&fit=crop', // Coffee mug
    'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500&h=500&fit=crop', // Ceramic mug
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop', // White mug
  ],
  tshirts: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop', // Folded t-shirt
    'https://images.unsplash.com/photo-1576995578007-7b18b2a20a2e?w=500&h=500&fit=crop', // Hanging t-shirt
    'https://images.unsplash.com/photo-1618354394207-67282e9b9c3e?w=500&h=500&fit=crop', // Black t-shirt
  ],
  accessories: [
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&h=500&fit=crop', // Sunglasses
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop', // Watch
    'https://images.unsplash.com/photo-1543163521-9145f931371e?w=500&h=500&fit=crop', // Baseball cap
  ],
  gifts: [
    'https://images.unsplash.com/photo-1513885535140-d64b0184cbf3?w=500&h=500&fit=crop', // Gift box
    'https://images.unsplash.com/photo-1542652694d5-5f6344631a14?w=500&h=500&fit=crop', // Wrapped gift
    'https://images.unsplash.com/photo-1577021864882-20ee86cee2c9?w=500&h=500&fit=crop', // Gift wrapping
  ],
};

// Dummy product data
const DUMMY_PRODUCTS = [
  {
    name: 'Premium Corporate Mug - White',
    slug: 'premium-corporate-mug-white',
    sku: 'MUG-001-WHITE',
    brand: 'GIVOO',
    descriptionShort: 'Perfect for corporate gifting',
    descriptionLong: 'High-quality ceramic mug with your company logo. Durable and dishwasher safe.',
    material: 'Ceramic',
    dimensions: '11oz',
    lengthCm: 8,
    widthCm: 8,
    heightCm: 10,
    weightG: 350,
    leadTimeDays: 7,
    printingTechnique: 'screen_print' as const,
    printingPosition: 'Front',
    status: 'active' as ProductStatus,
    isFeatured: true,
    isEcoCertified: false,
    categoryIds: [],
    images: UNSPLASH_IMAGES.mugs.slice(0, 1),
    priceTiers: [
      { tier: 1, minQty: 25, maxQty: 49, costPrice: 120, sellPrice: 299 },
      { tier: 2, minQty: 50, maxQty: 99, costPrice: 110, sellPrice: 275 },
      { tier: 3, minQty: 100, maxQty: 249, costPrice: 100, sellPrice: 249 },
      { tier: 4, minQty: 250, maxQty: 499, costPrice: 90, sellPrice: 225 },
      { tier: 5, minQty: 500, maxQty: 999, costPrice: 80, sellPrice: 199 },
      { tier: 6, minQty: 1000, maxQty: null, costPrice: 70, sellPrice: 179 },
    ],
  },
  {
    name: 'Stainless Steel Water Bottle',
    slug: 'stainless-steel-water-bottle',
    sku: 'BOT-001-STEEL',
    brand: 'GIVOO',
    descriptionShort: 'Keep drinks hot or cold for hours',
    descriptionLong: 'Double-wall insulated stainless steel bottle. Keeps beverages at ideal temperature.',
    material: 'Stainless Steel',
    dimensions: '500ml',
    lengthCm: 7,
    widthCm: 7,
    heightCm: 22,
    weightG: 450,
    leadTimeDays: 10,
    printingTechnique: 'laser_engraving' as const,
    printingPosition: 'Side',
    status: 'active' as ProductStatus,
    isFeatured: false,
    isEcoCertified: true,
    categoryIds: [],
    images: UNSPLASH_IMAGES.mugs.slice(1, 2),
    priceTiers: [
      { tier: 1, minQty: 25, maxQty: 49, costPrice: 250, sellPrice: 599 },
      { tier: 2, minQty: 50, maxQty: 99, costPrice: 230, sellPrice: 549 },
      { tier: 3, minQty: 100, maxQty: 249, costPrice: 210, sellPrice: 499 },
      { tier: 4, minQty: 250, maxQty: 499, costPrice: 190, sellPrice: 449 },
      { tier: 5, minQty: 500, maxQty: 999, costPrice: 170, sellPrice: 399 },
      { tier: 6, minQty: 1000, maxQty: null, costPrice: 150, sellPrice: 349 },
    ],
  },
  {
    name: 'Custom Printed T-Shirt',
    slug: 'custom-printed-tshirt',
    sku: 'TSH-001-CUSTOM',
    brand: 'GIVOO',
    descriptionShort: '100% cotton comfort wear',
    descriptionLong: 'Premium 100% cotton t-shirt with full customization. Perfect for team uniforms or branded merchandise.',
    material: 'Cotton',
    dimensions: 'M-XL sizes available',
    lengthCm: 70,
    widthCm: 50,
    heightCm: 5,
    weightG: 200,
    leadTimeDays: 14,
    printingTechnique: 'screen_print' as const,
    printingPosition: 'Front & Back',
    status: 'active' as ProductStatus,
    isFeatured: true,
    isEcoCertified: true,
    categoryIds: [],
    images: UNSPLASH_IMAGES.tshirts.slice(0, 1),
    priceTiers: [
      { tier: 1, minQty: 25, maxQty: 49, costPrice: 180, sellPrice: 399 },
      { tier: 2, minQty: 50, maxQty: 99, costPrice: 160, sellPrice: 349 },
      { tier: 3, minQty: 100, maxQty: 249, costPrice: 140, sellPrice: 299 },
      { tier: 4, minQty: 250, maxQty: 499, costPrice: 120, sellPrice: 249 },
      { tier: 5, minQty: 500, maxQty: 999, costPrice: 100, sellPrice: 199 },
      { tier: 6, minQty: 1000, maxQty: null, costPrice: 80, sellPrice: 149 },
    ],
  },
  {
    name: 'Premium Polo Shirt',
    slug: 'premium-polo-shirt',
    sku: 'POL-001-PREMIUM',
    brand: 'GIVOO',
    descriptionShort: 'Professional polo for corporate events',
    descriptionLong: 'High-quality polyester-cotton blend polo shirt. Ideal for corporate gifting and team events.',
    material: 'Polyester-Cotton Blend',
    dimensions: 'S-XXL sizes',
    lengthCm: 72,
    widthCm: 52,
    heightCm: 5,
    weightG: 220,
    leadTimeDays: 12,
    printingTechnique: 'embroidery' as const,
    printingPosition: 'Chest',
    status: 'active' as ProductStatus,
    isFeatured: false,
    isEcoCertified: false,
    categoryIds: [],
    images: UNSPLASH_IMAGES.tshirts.slice(1, 2),
    priceTiers: [
      { tier: 1, minQty: 25, maxQty: 49, costPrice: 220, sellPrice: 499 },
      { tier: 2, minQty: 50, maxQty: 99, costPrice: 200, sellPrice: 449 },
      { tier: 3, minQty: 100, maxQty: 249, costPrice: 180, sellPrice: 399 },
      { tier: 4, minQty: 250, maxQty: 499, costPrice: 160, sellPrice: 349 },
      { tier: 5, minQty: 500, maxQty: 999, costPrice: 140, sellPrice: 299 },
      { tier: 6, minQty: 1000, maxQty: null, costPrice: 120, sellPrice: 249 },
    ],
  },
  {
    name: 'Baseball Cap with Embroidery',
    slug: 'baseball-cap-embroidery',
    sku: 'CAP-001-EMB',
    brand: 'GIVOO',
    descriptionShort: 'Stylish and adjustable cap',
    descriptionLong: 'Adjustable baseball cap with embroidered logo. Made from durable cotton twill.',
    material: 'Cotton Twill',
    dimensions: 'One size fits all',
    lengthCm: 30,
    widthCm: 25,
    heightCm: 8,
    weightG: 120,
    leadTimeDays: 10,
    printingTechnique: 'embroidery' as const,
    printingPosition: 'Front',
    status: 'active' as ProductStatus,
    isFeatured: false,
    isEcoCertified: true,
    categoryIds: [],
    images: UNSPLASH_IMAGES.accessories.slice(2, 3),
    priceTiers: [
      { tier: 1, minQty: 25, maxQty: 49, costPrice: 140, sellPrice: 299 },
      { tier: 2, minQty: 50, maxQty: 99, costPrice: 130, sellPrice: 275 },
      { tier: 3, minQty: 100, maxQty: 249, costPrice: 120, sellPrice: 249 },
      { tier: 4, minQty: 250, maxQty: 499, costPrice: 110, sellPrice: 225 },
      { tier: 5, minQty: 500, maxQty: 999, costPrice: 100, sellPrice: 199 },
      { tier: 6, minQty: 1000, maxQty: null, costPrice: 90, sellPrice: 175 },
    ],
  },
  {
    name: 'Premium Branded Pen Set',
    slug: 'premium-branded-pen-set',
    sku: 'PEN-001-SET',
    brand: 'GIVOO',
    descriptionShort: 'Luxury pen set for executives',
    descriptionLong: 'High-end pen set with your company branding. Perfect for executive gifts and corporate events.',
    material: 'Metal & Plastic',
    dimensions: 'Set of 3 pens',
    lengthCm: 15,
    widthCm: 5,
    heightCm: 3,
    weightG: 150,
    leadTimeDays: 8,
    printingTechnique: 'laser_engraving' as const,
    printingPosition: 'Body',
    status: 'active' as ProductStatus,
    isFeatured: true,
    isEcoCertified: false,
    categoryIds: [],
    images: UNSPLASH_IMAGES.accessories.slice(1, 2),
    priceTiers: [
      { tier: 1, minQty: 25, maxQty: 49, costPrice: 300, sellPrice: 699 },
      { tier: 2, minQty: 50, maxQty: 99, costPrice: 280, sellPrice: 649 },
      { tier: 3, minQty: 100, maxQty: 249, costPrice: 260, sellPrice: 599 },
      { tier: 4, minQty: 250, maxQty: 499, costPrice: 240, sellPrice: 549 },
      { tier: 5, minQty: 500, maxQty: 999, costPrice: 220, sellPrice: 499 },
      { tier: 6, minQty: 1000, maxQty: null, costPrice: 200, sellPrice: 449 },
    ],
  },
  {
    name: 'Corporate Gift Box Deluxe',
    slug: 'corporate-gift-box-deluxe',
    sku: 'BOX-001-DELUXE',
    brand: 'GIVOO',
    descriptionShort: 'Premium packaging for corporate gifts',
    descriptionLong: 'Luxury gift box with custom branding. Includes tissue paper and personalization options.',
    material: 'Cardboard & Velvet',
    dimensions: 'Large (25x20x10cm)',
    lengthCm: 25,
    widthCm: 20,
    heightCm: 10,
    weightG: 300,
    leadTimeDays: 5,
    printingTechnique: 'none' as const,
    printingPosition: 'N/A',
    status: 'active' as ProductStatus,
    isFeatured: false,
    isEcoCertified: true,
    categoryIds: [],
    images: UNSPLASH_IMAGES.gifts.slice(0, 1),
    priceTiers: [
      { tier: 1, minQty: 25, maxQty: 49, costPrice: 80, sellPrice: 199 },
      { tier: 2, minQty: 50, maxQty: 99, costPrice: 70, sellPrice: 175 },
      { tier: 3, minQty: 100, maxQty: 249, costPrice: 60, sellPrice: 149 },
      { tier: 4, minQty: 250, maxQty: 499, costPrice: 50, sellPrice: 125 },
      { tier: 5, minQty: 500, maxQty: 999, costPrice: 40, sellPrice: 99 },
      { tier: 6, minQty: 1000, maxQty: null, costPrice: 30, sellPrice: 79 },
    ],
  },
];

// HSN codes (GST tax codes)
const HSN_MAPPING: Record<string, string> = {
  mugs: '6912',           // Ceramic articles
  tshirts: '6204',        // Men's/Women's clothing
  accessories: '6507',    // Headgear
  gifts: '3923',          // Articles of plastics
};

interface ProductCreateInput {
  name: string;
  slug: string;
  sku: string;
  brand?: string;
  descriptionShort?: string;
  descriptionLong?: string;
  material?: string;
  dimensions?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightG?: number;
  leadTimeDays?: number;
  printingTechnique?: string;
  printingPosition?: string;
  status: ProductStatus;
  isFeatured: boolean;
  isEcoCertified: boolean;
  hsnId: string;
  images: string[];
  priceTiers: Array<{
    tier: number;
    minQty: number;
    maxQty: number | null;
    costPrice: number;
    sellPrice: number;
  }>;
}

async function seed() {
  try {
    console.log('🌱 Starting dummy product seeding...\n');

    // Get all categories
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true },
    });

    console.log(`✅ Found ${categories.length} categories\n`);

    if (categories.length === 0) {
      console.log('❌ No categories found. Please create categories first.');
      process.exit(1);
    }

    // Get or create HSN codes
    console.log('📝 Setting up HSN codes...');
    const hsnCodes = await Promise.all(
      Object.entries(HSN_MAPPING).map(async ([category, code]) => {
        return prisma.hsnCode.upsert({
          where: { code },
          update: {},
          create: {
            code,
            description: `HSN Code for ${category}`,
            gstRate: 18,
            cess: 0,
          },
        });
      })
    );
    console.log(`✅ Created/updated ${hsnCodes.length} HSN codes\n`);

    // Map categories to products
    const categoryMap = new Map(
      categories.map((cat) => [
        cat.slug.toLowerCase(),
        { id: cat.id, name: cat.name },
      ])
    );

    // Assign products to categories
    const productsToCreate: ProductCreateInput[] = [];
    let productIndex = 0;

    for (const category of categories) {
      const categoryName = category.name.toLowerCase();
      const categoryId = category.id;

      // Get 2-3 products for this category
      const productsForCategory = DUMMY_PRODUCTS.slice(productIndex, productIndex + 2);
      productIndex += 2;

      console.log(`📦 Preparing ${productsForCategory.length} products for "${category.name}"...`);

      for (const product of productsForCategory) {
        // Determine HSN code based on category
        let hsnId = hsnCodes[0].id; // Default
        if (categoryName.includes('mug') || categoryName.includes('drink')) {
          hsnId = hsnCodes[0].id; // Ceramic
        } else if (categoryName.includes('shirt') || categoryName.includes('apparel') || categoryName.includes('clothing')) {
          hsnId = hsnCodes[1].id; // Clothing
        } else if (categoryName.includes('cap') || categoryName.includes('hat') || categoryName.includes('accessory')) {
          hsnId = hsnCodes[2].id; // Headgear
        } else {
          hsnId = hsnCodes[3].id; // Plastics/Gifts
        }

        productsToCreate.push({
          ...product,
          categoryIds: [categoryId],
          hsnId,
        });
      }
    }

    console.log(`\n📊 Total products to create: ${productsToCreate.length}\n`);

    // Create products
    for (let i = 0; i < productsToCreate.length; i++) {
      const product = productsToCreate[i];

      console.log(`\n➕ Creating product ${i + 1}/${productsToCreate.length}: "${product.name}"`);

      try {
        const createdProduct = await prisma.product.create({
          data: {
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            brand: product.brand,
            descriptionShort: product.descriptionShort,
            descriptionLong: product.descriptionLong,
            material: product.material,
            dimensions: product.dimensions,
            lengthCm: product.lengthCm,
            widthCm: product.widthCm,
            heightCm: product.heightCm,
            weightG: product.weightG,
            leadTimeDays: product.leadTimeDays,
            printingTechnique: product.printingTechnique,
            printingPosition: product.printingPosition,
            status: product.status,
            isFeatured: product.isFeatured,
            isEcoCertified: product.isEcoCertified,
            hsnId: product.hsnId,

            // Create price tiers
            priceTiers: {
              createMany: {
                data: product.priceTiers.map((tier) => ({
                  tier: tier.tier,
                  minQty: tier.minQty,
                  maxQty: tier.maxQty,
                  costPrice: new Decimal(tier.costPrice),
                  sellPrice: new Decimal(tier.sellPrice),
                })),
              },
            },

            // Create images
            images: {
              createMany: {
                data: product.images.map((url, idx) => ({
                  url,
                  isPrimary: idx === 0,
                  sortOrder: idx,
                })),
              },
            },

            // Link categories
            categories: {
              createMany: {
                data: product.categoryIds.map((catId) => ({
                  categoryId: catId,
                })),
              },
            },
          },
          include: {
            priceTiers: true,
            images: true,
            categories: true,
          },
        });

        console.log(`   ✅ Product created: ${createdProduct.id}`);
        console.log(`   📸 Images: ${createdProduct.images.length}`);
        console.log(`   💰 Price tiers: ${createdProduct.priceTiers.length}`);
        console.log(`   🏷️  Categories: ${createdProduct.categories.length}`);
      } catch (error) {
        console.error(`   ❌ Error creating product:`, error);
        throw error;
      }
    }

    console.log('\n\n✅ Seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Products created: ${productsToCreate.length}`);
    console.log(`   - Total price tiers: ${productsToCreate.length * 6}`);
    console.log(`   - Total images: ${productsToCreate.length}`);
    console.log(`\n🎯 Next steps:`);
    console.log(`   1. Go to http://localhost:3000/admin/products`);
    console.log(`   2. You should see all the newly created products`);
    console.log(`   3. Click on a product to verify images and price tiers`);
    console.log(`   4. Check that all fields are populated correctly`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
