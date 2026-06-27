/**
 * Add Dummy Products via API
 * This script uses the actual API endpoints to add products
 * Much better for testing the real add/update flow!
 *
 * Usage: npx tsx scripts/add-dummy-products-via-api.ts
 */

// Node.js 18+ has built-in fetch, no need to import

const API_BASE = 'http://localhost:3000/api';

// Mock session/auth header - in real scenario, you'd get this from login
// For testing, we'll assume the API is running without strict auth for dev
const headers = {
  'Content-Type': 'application/json',
};

interface ProductData {
  name: string;
  slug: string;
  sku: string;
  brand: string;
  descriptionShort: string;
  descriptionLong: string;
  material: string;
  dimensions: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightG: number;
  leadTimeDays: number;
  printingTechnique: string;
  printingPosition: string;
  status: string;
  isFeatured: boolean;
  isEcoCertified: boolean;
  hsnId: string;
  categoryIds: string[];
  priceTiers: Array<{
    tier: number;
    minQty: number;
    maxQty: number | null;
    costPrice: number;
    sellPrice: number;
  }>;
  images?: Array<{
    url: string;
    isPrimary: boolean;
  }>;
}

// Unsplash images
const UNSPLASH_IMAGES = {
  mugs: 'https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=500&h=500&fit=crop',
  tshirts: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop',
  polos: 'https://images.unsplash.com/photo-1576995578007-7b18b2a20a2e?w=500&h=500&fit=crop',
  caps: 'https://images.unsplash.com/photo-1543163521-9145f931371e?w=500&h=500&fit=crop',
  pens: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
  gifts: 'https://images.unsplash.com/photo-1513885535140-d64b0184cbf3?w=500&h=500&fit=crop',
  bottles: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop',
};

// Dummy products (simplified version for API)
const DUMMY_PRODUCTS: Record<string, ProductData[]> = {
  'Corporate': [
    {
      name: 'Premium Corporate Mug - White',
      slug: 'premium-corporate-mug-white',
      sku: 'MUG-001-WHITE',
      brand: 'GiftCraft',
      descriptionShort: 'Perfect for corporate gifting',
      descriptionLong: 'High-quality ceramic mug with your company logo. Durable and dishwasher safe.',
      material: 'Ceramic',
      dimensions: '11oz',
      lengthCm: 8,
      widthCm: 8,
      heightCm: 10,
      weightG: 350,
      leadTimeDays: 7,
      printingTechnique: 'screen_print',
      printingPosition: 'Front',
      status: 'active',
      isFeatured: true,
      isEcoCertified: false,
      hsnId: '', // Will be filled from API
      categoryIds: [],
      images: [{ url: UNSPLASH_IMAGES.mugs, isPrimary: true }],
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
      name: 'Custom Printed T-Shirt',
      slug: 'custom-printed-tshirt',
      sku: 'TSH-001-CUSTOM',
      brand: 'GiftCraft',
      descriptionShort: '100% cotton comfort wear',
      descriptionLong: 'Premium 100% cotton t-shirt with full customization. Perfect for team uniforms or branded merchandise.',
      material: 'Cotton',
      dimensions: 'M-XL sizes available',
      lengthCm: 70,
      widthCm: 50,
      heightCm: 5,
      weightG: 200,
      leadTimeDays: 14,
      printingTechnique: 'screen_print',
      printingPosition: 'Front & Back',
      status: 'active',
      isFeatured: true,
      isEcoCertified: true,
      hsnId: '',
      categoryIds: [],
      images: [{ url: UNSPLASH_IMAGES.tshirts, isPrimary: true }],
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
      name: 'Stainless Steel Water Bottle',
      slug: 'stainless-steel-water-bottle',
      sku: 'BOT-001-STEEL',
      brand: 'GiftCraft',
      descriptionShort: 'Keep drinks hot or cold for hours',
      descriptionLong: 'Double-wall insulated stainless steel bottle. Keeps beverages at ideal temperature for any occasion.',
      material: 'Stainless Steel',
      dimensions: '500ml',
      lengthCm: 7,
      widthCm: 7,
      heightCm: 22,
      weightG: 450,
      leadTimeDays: 10,
      printingTechnique: 'laser_engraving',
      printingPosition: 'Side',
      status: 'active',
      isFeatured: false,
      isEcoCertified: true,
      hsnId: '',
      categoryIds: [],
      images: [{ url: UNSPLASH_IMAGES.bottles, isPrimary: true }],
      priceTiers: [
        { tier: 1, minQty: 25, maxQty: 49, costPrice: 250, sellPrice: 599 },
        { tier: 2, minQty: 50, maxQty: 99, costPrice: 230, sellPrice: 549 },
        { tier: 3, minQty: 100, maxQty: 249, costPrice: 210, sellPrice: 499 },
        { tier: 4, minQty: 250, maxQty: 499, costPrice: 190, sellPrice: 449 },
        { tier: 5, minQty: 500, maxQty: 999, costPrice: 170, sellPrice: 399 },
        { tier: 6, minQty: 1000, maxQty: null, costPrice: 150, sellPrice: 349 },
      ],
    },
  ],
  'Apparel': [
    {
      name: 'Premium Polo Shirt',
      slug: 'premium-polo-shirt',
      sku: 'POL-001-PREMIUM',
      brand: 'GiftCraft',
      descriptionShort: 'Professional polo for corporate events',
      descriptionLong: 'High-quality polyester-cotton blend polo shirt. Ideal for corporate gifting and team events.',
      material: 'Polyester-Cotton Blend',
      dimensions: 'S-XXL sizes',
      lengthCm: 72,
      widthCm: 52,
      heightCm: 5,
      weightG: 220,
      leadTimeDays: 12,
      printingTechnique: 'embroidery',
      printingPosition: 'Chest',
      status: 'active',
      isFeatured: false,
      isEcoCertified: false,
      hsnId: '',
      categoryIds: [],
      images: [{ url: UNSPLASH_IMAGES.polos, isPrimary: true }],
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
      brand: 'GiftCraft',
      descriptionShort: 'Stylish and adjustable cap',
      descriptionLong: 'Adjustable baseball cap with embroidered logo. Made from durable cotton twill for lasting quality.',
      material: 'Cotton Twill',
      dimensions: 'One size fits all',
      lengthCm: 30,
      widthCm: 25,
      heightCm: 8,
      weightG: 120,
      leadTimeDays: 10,
      printingTechnique: 'embroidery',
      printingPosition: 'Front',
      status: 'active',
      isFeatured: false,
      isEcoCertified: true,
      hsnId: '',
      categoryIds: [],
      images: [{ url: UNSPLASH_IMAGES.caps, isPrimary: true }],
      priceTiers: [
        { tier: 1, minQty: 25, maxQty: 49, costPrice: 140, sellPrice: 299 },
        { tier: 2, minQty: 50, maxQty: 99, costPrice: 130, sellPrice: 275 },
        { tier: 3, minQty: 100, maxQty: 249, costPrice: 120, sellPrice: 249 },
        { tier: 4, minQty: 250, maxQty: 499, costPrice: 110, sellPrice: 225 },
        { tier: 5, minQty: 500, maxQty: 999, costPrice: 100, sellPrice: 199 },
        { tier: 6, minQty: 1000, maxQty: null, costPrice: 90, sellPrice: 175 },
      ],
    },
  ],
  'Accessories': [
    {
      name: 'Premium Branded Pen Set',
      slug: 'premium-branded-pen-set',
      sku: 'PEN-001-SET',
      brand: 'GiftCraft',
      descriptionShort: 'Luxury pen set for executives',
      descriptionLong: 'High-end pen set with your company branding. Perfect for executive gifts and corporate events.',
      material: 'Metal & Plastic',
      dimensions: 'Set of 3 pens',
      lengthCm: 15,
      widthCm: 5,
      heightCm: 3,
      weightG: 150,
      leadTimeDays: 8,
      printingTechnique: 'laser_engraving',
      printingPosition: 'Body',
      status: 'active',
      isFeatured: true,
      isEcoCertified: false,
      hsnId: '',
      categoryIds: [],
      images: [{ url: UNSPLASH_IMAGES.pens, isPrimary: true }],
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
      brand: 'GiftCraft',
      descriptionShort: 'Premium packaging for corporate gifts',
      descriptionLong: 'Luxury gift box with custom branding. Includes tissue paper and personalization options for a premium unboxing experience.',
      material: 'Cardboard & Velvet',
      dimensions: 'Large (25x20x10cm)',
      lengthCm: 25,
      widthCm: 20,
      heightCm: 10,
      weightG: 300,
      leadTimeDays: 5,
      printingTechnique: 'none',
      printingPosition: 'N/A',
      status: 'active',
      isFeatured: false,
      isEcoCertified: true,
      hsnId: '',
      categoryIds: [],
      images: [{ url: UNSPLASH_IMAGES.gifts, isPrimary: true }],
      priceTiers: [
        { tier: 1, minQty: 25, maxQty: 49, costPrice: 80, sellPrice: 199 },
        { tier: 2, minQty: 50, maxQty: 99, costPrice: 70, sellPrice: 175 },
        { tier: 3, minQty: 100, maxQty: 249, costPrice: 60, sellPrice: 149 },
        { tier: 4, minQty: 250, maxQty: 499, costPrice: 50, sellPrice: 125 },
        { tier: 5, minQty: 500, maxQty: 999, costPrice: 40, sellPrice: 99 },
        { tier: 6, minQty: 1000, maxQty: null, costPrice: 30, sellPrice: 79 },
      ],
    },
  ],
};

async function getHsnCodes() {
  console.log('📝 Fetching HSN codes...');
  try {
    const response = await fetch(`${API_BASE}/admin/taxes`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.log('⚠️  Could not fetch HSN codes, using defaults');
      return {};
    }

    const data = await response.json() as any;
    const hsnMap: Record<string, string> = {};
    if (data.hsnCodes && Array.isArray(data.hsnCodes)) {
      data.hsnCodes.forEach((hsn: any) => {
        hsnMap[hsn.code] = hsn.id;
      });
    }
    return hsnMap;
  } catch (error) {
    console.log('⚠️  Error fetching HSN codes:', error);
    return {};
  }
}

async function getCategories() {
  console.log('📂 Fetching categories...');
  try {
    const response = await fetch(`${API_BASE}/admin/categories`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.log('❌ Could not fetch categories');
      return {};
    }

    const data = await response.json() as any;
    const catMap: Record<string, string> = {};

    function traverse(categories: any[]) {
      categories.forEach((cat: any) => {
        catMap[cat.name] = cat.id;
        if (cat.children && Array.isArray(cat.children)) {
          traverse(cat.children);
        }
      });
    }

    if (Array.isArray(data.categories)) {
      traverse(data.categories);
    } else if (data.categories && data.categories.categories) {
      traverse(data.categories.categories);
    }

    console.log(`✅ Found ${Object.keys(catMap).length} categories`);
    Object.entries(catMap).forEach(([name, id]) => {
      console.log(`   - ${name}: ${id}`);
    });

    return catMap;
  } catch (error) {
    console.log('❌ Error fetching categories:', error);
    return {};
  }
}

async function addProduct(product: ProductData, categoryName: string) {
  console.log(`\n➕ Adding product: "${product.name}"`);

  // Prepare product data
  const productData = {
    ...product,
    categoryIds: product.categoryIds,
    // HSN code will be set from default
    hsnId: '9501', // Default HSN code (use first available)
  };

  try {
    const response = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ Error: ${response.status} - ${error.substring(0, 100)}`);
      return false;
    }

    const result = await response.json() as any;
    console.log(`   ✅ Created: ${result.id || 'success'}`);
    console.log(`   - SKU: ${product.sku}`);
    console.log(`   - Price: ₹${product.priceTiers[0].sellPrice} (Tier 1: ${product.priceTiers[0].minQty}-${product.priceTiers[0].maxQty} units)`);
    console.log(`   - Image: ${product.images?.[0]?.url?.substring(0, 50)}...`);
    return true;
  } catch (error) {
    console.log(`   ❌ Error adding product:`, error);
    return false;
  }
}

async function main() {
  console.log('🌱 GiftCraft Dummy Product Seeder\n');
  console.log('📌 Note: Make sure the dev server is running on http://localhost:3000\n');

  // Get categories
  const categories = await getCategories();

  if (Object.keys(categories).length === 0) {
    console.log('\n❌ No categories found. Please create categories first in the admin dashboard.');
    console.log('   Go to: http://localhost:3000/admin/categories/new');
    process.exit(1);
  }

  let totalAdded = 0;
  let totalFailed = 0;

  // Add products for each category
  for (const [categoryName, products] of Object.entries(DUMMY_PRODUCTS)) {
    console.log(`\n\n🏷️  Category: "${categoryName}"`);
    console.log('═'.repeat(60));

    // Find matching category ID
    const categoryId = categories[categoryName];
    if (!categoryId) {
      console.log(`⚠️  Category "${categoryName}" not found in database. Skipping...`);
      continue;
    }

    for (const product of products) {
      product.categoryIds = [categoryId];
      const success = await addProduct(product, categoryName);
      if (success) {
        totalAdded++;
      } else {
        totalFailed++;
      }
      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log('\n\n');
  console.log('═'.repeat(60));
  console.log('📊 SEEDING COMPLETE');
  console.log('═'.repeat(60));
  console.log(`✅ Products added: ${totalAdded}`);
  console.log(`❌ Products failed: ${totalFailed}`);
  console.log(`\n🎯 Next steps:`);
  console.log(`   1. Open browser: http://localhost:3000/admin/products`);
  console.log(`   2. Verify products appear in the list`);
  console.log(`   3. Click on a product to view details`);
  console.log(`   4. Check images, prices, and variants are correct`);
}

main().catch(console.error);
