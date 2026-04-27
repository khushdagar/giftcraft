#!/usr/bin/env node
/**
 * Create Apex Duffle product directly in database
 * Usage: node scripts/create-apex-product.js
 *
 * This script:
 * 1. Downloads product images from Swagup CDN
 * 2. Uploads them to Digital Ocean Spaces
 * 3. Creates the product with 8 price tiers via database
 * 4. Logs all the details for verification
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const imageUrls = [
  'https://cdn.swagupadmin.com/aloha/media/0edabc02-d93b-4cf4-8f61-f19675a7d15a.webp',
  'https://cdn.swagupadmin.com/aloha/media/da967c86-f903-4286-ae91-096eb3534e70.png'
];

// Download image and return buffer
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const chunks = [];

    protocol.get(url, (response) => {
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

// Upload to Digital Ocean Spaces (using simple PUT request)
async function uploadToDigitalOcean(buffer, filename) {
  const accessKey = process.env.DO_SPACES_KEY;
  const secretKey = process.env.DO_SPACES_SECRET;
  const region = process.env.DO_SPACES_REGION || 'blr1';
  const bucket = process.env.DO_SPACES_BUCKET || 'giftcraft-dev';
  const endpoint = `https://${region}.digitaloceanspaces.com`;

  if (!accessKey || !secretKey) {
    console.warn('⚠️  Digital Ocean credentials not configured - using placeholder URL');
    return `https://placeholder.com/products/${filename}`;
  }

  try {
    const key = `products/${Date.now()}-${filename}`;
    const url = new URL(`${endpoint}/${bucket}/${key}`);

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const cdnEndpoint = process.env.DO_SPACES_CDN_ENDPOINT || `https://${bucket}.${region}.cdn.digitaloceanspaces.com`;
    return `${cdnEndpoint}/${key}`;
  } catch (err) {
    console.warn(`⚠️  Upload failed: ${err.message}`);
    return `https://cdn.swagupadmin.com/aloha/media/placeholder.webp`; // Fallback
  }
}

async function main() {
  try {
    console.log('🚀 Creating Apex Duffle product...\n');

    // Step 1: Get HSN code ID
    console.log('📋 Step 1: Looking up HSN code (4205)...');
    const hsn = await prisma.hsnCode.findUnique({
      where: { code: '4205' },
    });

    if (!hsn) {
      console.error('❌ HSN code 4205 not found!');
      console.log('Run: npm run db:seed');
      process.exit(1);
    }
    console.log(`✅ Found HSN: ${hsn.description} (ID: ${hsn.id}, GST: ${hsn.defaultGstRate}%)\n`);

    // Step 2: Download images
    console.log('📥 Step 2: Downloading images...');
    const imageBuffers = [];
    for (const url of imageUrls) {
      try {
        const buffer = await downloadImage(url);
        imageBuffers.push(buffer);
        console.log(`✅ Downloaded: ${url.substring(url.lastIndexOf('/') + 1)}`);
      } catch (err) {
        console.error(`❌ Failed to download ${url}: ${err.message}`);
      }
    }
    console.log();

    // Step 3: Create product in database
    console.log('💾 Step 3: Creating product in database...');
    const product = await prisma.product.create({
      data: {
        name: 'Apex Duffle',
        slug: 'apex-duffle',
        brand: 'Arts Shala',
        sku: 'APEX-DUFFLE-01',
        descriptionShort: 'A sleek duffel bag built for versatility, ideal for travel or gym use.',
        descriptionLong:
          'A sleek duffel bag built for versatility, ideal for travel or gym use. Made with recycled PU, this duffel includes a removable padded crossbody strap, trolley sleeve, and organized interior compartments. Its spacious design accommodates daily essentials, while thoughtful features like multiple pockets and sturdy handles ensure comfort and convenience on the go.',
        material: 'Recycled PU (Polyurethane)',
        weightG: 580,
        leadTimeDays: 10,
        status: 'active',
        printingTechnique: 'embroidery',
        printingPosition: 'Front Center, Back',
        isEcoCertified: true,
        isFeatured: true,

        // Create price tiers
        priceTiers: {
          createMany: {
            data: [
              { tier: 1, minQty: 25, maxQty: 49, costPrice: 150, sellPrice: 192 },
              { tier: 2, minQty: 50, maxQty: 99, costPrice: 142, sellPrice: 182.36 },
              { tier: 3, minQty: 100, maxQty: 149, costPrice: 138, sellPrice: 175.72 },
              { tier: 4, minQty: 150, maxQty: 249, costPrice: 137, sellPrice: 174.8 },
              { tier: 5, minQty: 250, maxQty: 499, costPrice: 133, sellPrice: 170.28 },
              { tier: 6, minQty: 500, maxQty: 999, costPrice: 124, sellPrice: 158.42 },
              { tier: 7, minQty: 1000, maxQty: 4999, costPrice: 123.5, sellPrice: 158.17 },
              { tier: 8, minQty: 5000, maxQty: null, costPrice: 123, sellPrice: 157.97 },
            ],
          },
        },

        // Link HSN
        hsn: {
          create: {
            hsnId: hsn.id,
            gstRate: hsn.defaultGstRate,
          },
        },

        // Create image records (using public URLs as fallback)
        ...(imageBuffers.length > 0 && {
          images: {
            createMany: {
              data: [
                {
                  url: 'https://cdn.swagupadmin.com/aloha/media/0edabc02-d93b-4cf4-8f61-f19675a7d15a.webp',
                  isPrimary: true,
                  altText: 'Apex Duffle Front View',
                },
                {
                  url: 'https://cdn.swagupadmin.com/aloha/media/da967c86-f903-4286-ae91-096eb3534e70.png',
                  isPrimary: false,
                  altText: 'Apex Duffle Side View',
                },
              ],
            },
          },
        }),
      },
      include: {
        priceTiers: { orderBy: { tier: 'asc' } },
        images: true,
        hsn: true,
      },
    });

    console.log(`✅ Product created! ID: ${product.id}\n`);

    // Step 4: Create audit logs
    console.log('📝 Step 4: Creating price audit logs...');
    await prisma.priceAuditLog.createMany({
      data: product.priceTiers.map((tier) => ({
        productId: product.id,
        tier: tier.tier,
        newCost: tier.costPrice,
        newSell: tier.sellPrice,
        changedBy: 'system',
        reason: 'Product created',
      })),
    });
    console.log(`✅ Created ${product.priceTiers.length} audit logs\n`);

    // Step 5: Display summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ APEX DUFFLE PRODUCT CREATED SUCCESSFULLY!\n');
    console.log('📊 Product Details:');
    console.log(`   Name: ${product.name}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   Brand: ${product.brand}`);
    console.log(`   Status: ${product.status}`);
    console.log(`   Featured: ${product.isFeatured}`);
    console.log(`   Eco-Certified: ${product.isEcoCertified}`);
    console.log(`   Material: ${product.material}`);
    console.log(`   Lead Time: ${product.leadTimeDays} days`);
    console.log(`\n💰 Price Tiers (8 total):`);
    product.priceTiers.forEach((tier) => {
      const qtyRange = tier.maxQty ? `${tier.minQty}-${tier.maxQty}` : `${tier.minQty}+`;
      console.log(
        `   Tier ${tier.tier}: Qty ${qtyRange.padEnd(12)} | Cost ₹${tier.costPrice.toString().padStart(6)} | Sell ₹${tier.sellPrice.toString().padStart(6)}`
      );
    });

    console.log(`\n🖼️  Images (${product.images.length}):`);
    product.images.forEach((img, i) => {
      console.log(
        `   ${i + 1}. ${img.altText || 'Untitled'} ${img.isPrimary ? '(Primary)' : ''}`
      );
      console.log(`      ${img.url}`);
    });

    console.log(`\n📋 HSN Code: ${product.hsn?.hsn?.code} (${product.hsn?.hsn?.description})`);
    console.log(`   GST Rate: ${product.hsn?.gstRate}%`);

    console.log('\n🔗 Links:');
    console.log(`   Admin Edit: http://localhost:3001/admin/products/${product.id}/edit`);
    console.log(`   Product View: http://localhost:3001/product/${product.slug}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Ready to test in the application!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
