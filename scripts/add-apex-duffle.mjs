#!/usr/bin/env node
/**
 * Add Apex Duffle product to GiftCraft
 * Run with: node scripts/add-apex-duffle.mjs
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const imageUrls = [
  'https://cdn.swagupadmin.com/aloha/media/0edabc02-d93b-4cf4-8f61-f19675a7d15a.webp',
  'https://cdn.swagupadmin.com/aloha/media/da967c86-f903-4286-ae91-096eb3534e70.png'
];

const tempDir = path.join(__dirname, '../.temp-images');

// Create temp directory
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Download image helper
async function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const filePath = path.join(tempDir, filename);
    const file = fs.createWriteStream(filePath);

    protocol.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filePath);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    console.log('🚀 Starting Apex Duffle product creation...\n');

    // Get HSN code ID for "Leather articles"
    console.log('📋 Looking up HSN code (4205 - Leather articles)...');
    const hsn = await prisma.hsnCode.findUnique({
      where: { code: '4205' },
    });

    if (!hsn) {
      console.error('❌ HSN code 4205 not found in database');
      console.log('   Run: npm run db:seed');
      process.exit(1);
    }
    console.log(`✓ Found HSN: ${hsn.description} (ID: ${hsn.id})`);

    // Download images
    console.log('\n📥 Downloading images...');
    const imagePaths = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const ext = url.endsWith('.webp') ? 'webp' : 'png';
      const filename = `apex-duffle-${i + 1}.${ext}`;
      const filepath = await downloadImage(url, filename);
      imagePaths.push(filepath);
      console.log(`✓ Downloaded: ${filename}`);
    }

    // Prepare product data
    const productData = {
      name: 'Apex Duffle',
      slug: 'apex-duffle',
      brand: 'Arts Shala',
      sku: 'APEX-DUFFLE-01',
      descriptionShort: 'A sleek duffel bag built for versatility, ideal for travel or gym use.',
      descriptionLong: 'A sleek duffel bag built for versatility, ideal for travel or gym use. Made with recycled PU, this duffel includes a removable padded crossbody strap, trolley sleeve, and organized interior compartments. Its spacious design accommodates daily essentials, while thoughtful features like multiple pockets and sturdy handles ensure comfort and convenience on the go.',
      material: 'Recycled PU (Polyurethane)',
      weightG: 580,
      leadTimeDays: 10,
      printingTechnique: 'embroidery',
      printingPosition: 'Front Center, Back',
      status: 'active',
      isFeatured: true,
      isEcoCertified: true,
      hsnId: hsn.id,
      priceTiers: [
        { tier: 1, minQty: 25, maxQty: 49, costPrice: 150, sellPrice: 192.00 },
        { tier: 2, minQty: 50, maxQty: 99, costPrice: 142, sellPrice: 182.36 },
        { tier: 3, minQty: 100, maxQty: 149, costPrice: 138, sellPrice: 175.72 },
        { tier: 4, minQty: 150, maxQty: 249, costPrice: 137, sellPrice: 174.80 },
        { tier: 5, minQty: 250, maxQty: 499, costPrice: 133, sellPrice: 170.28 },
        { tier: 6, minQty: 500, maxQty: 999, costPrice: 124, sellPrice: 158.42 },
        { tier: 7, minQty: 1000, maxQty: 4999, costPrice: 123.5, sellPrice: 158.17 },
        { tier: 8, minQty: 5000, maxQty: null, costPrice: 123, sellPrice: 157.97 },
      ],
    };

    console.log('\n📦 Preparing API request...');
    const form = new FormData();
    form.append('data', JSON.stringify(productData));

    for (const imagePath of imagePaths) {
      form.append('images', fs.createReadStream(imagePath));
    }

    console.log('\n📤 Uploading product to API...');
    const response = await fetch('http://localhost:4000/api/admin/products', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ API Error:', error);
      throw new Error(`API request failed: ${response.status}`);
    }

    const created = await response.json();
    console.log('✅ Product created successfully!');
    console.log(`\nProduct ID: ${created.id}`);
    console.log(`Name: ${created.name}`);
    console.log(`Price Tiers: ${created.priceTiers?.length || 0}`);
    console.log(`Images: ${created.images?.length || 0}`);

    console.log('\n🎉 Apex Duffle is now available in your catalog!');
    console.log(`📸 View at: http://localhost:3000/admin/products/${created.id}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up temp files...');
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
    } catch (e) {}
    await prisma.$disconnect();
  }
}

main();
