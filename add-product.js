#!/usr/bin/env node
/**
 * Add Apex Duffle product with images and 8 price tiers
 * Usage: node add-product.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const imageUrls = [
  'https://cdn.swagupadmin.com/aloha/media/0edabc02-d93b-4cf4-8f61-f19675a7d15a.webp',
  'https://cdn.swagupadmin.com/aloha/media/da967c86-f903-4286-ae91-096eb3534e70.png'
];

const tempDir = path.join(__dirname, '.temp-images');

// Create temp directory
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Download images
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
      fs.unlink(filePath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

async function main() {
  try {
    console.log('📥 Downloading images...');
    const imagePaths = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const ext = url.endsWith('.webp') ? 'webp' : 'png';
      const filename = `apex-duffle-${i + 1}.${ext}`;
      const filepath = await downloadImage(url, filename);
      imagePaths.push(filepath);
      console.log(`✓ Downloaded: ${filename}`);
    }

    console.log('\n📦 Product data prepared:');
    console.log('Name: Apex Duffle');
    console.log('Images:', imagePaths);
    console.log('Price Tiers: 8');

    // The product data
    const productData = {
      name: "Apex Duffle",
      slug: "apex-duffle",
      brand: "Arts Shala",
      sku: "APEX-DUFFLE-01",
      descriptionShort: "A sleek duffel bag built for versatility, ideal for travel or gym use.",
      descriptionLong: "A sleek duffel bag built for versatility, ideal for travel or gym use. Made with recycled PU, this duffel includes a removable padded crossbody strap, trolley sleeve, and organized interior compartments. Its spacious design accommodates daily essentials, while thoughtful features like multiple pockets and sturdy handles ensure comfort and convenience on the go.",
      material: "Recycled PU (Polyurethane)",
      dimensions: "24L x 13W x 14H cm",
      weightG: 580,
      leadTimeDays: 10,
      printingTechnique: "embroidery",
      printingPosition: "Front Center, Back",
      status: "active",
      isFeatured: true,
      isEcoCertified: true,
      hsnId: "4205", // Will need to get actual ID from DB
      // 8 price tiers based on the screenshot
      priceTiers: [
        { tier: 1, minQty: 25, maxQty: 49, costPrice: 150, sellPrice: 192.00 },
        { tier: 2, minQty: 50, maxQty: 99, costPrice: 142, sellPrice: 182.36 },
        { tier: 3, minQty: 100, maxQty: 149, costPrice: 138, sellPrice: 175.72 },
        { tier: 4, minQty: 150, maxQty: 249, costPrice: 137, sellPrice: 174.80 },
        { tier: 5, minQty: 250, maxQty: 499, costPrice: 133, sellPrice: 170.28 },
        { tier: 6, minQty: 500, maxQty: 999, costPrice: 124, sellPrice: 158.42 },
        { tier: 7, minQty: 1000, maxQty: 4999, costPrice: 123.50, sellPrice: 158.17 },
        { tier: 8, minQty: 5000, maxQty: null, costPrice: 123, sellPrice: 157.97 },
      ],
    };

    console.log('\n✅ Ready to create product!');
    console.log('Next: Navigate to http://localhost:3000/admin/products/new');
    console.log('Or use: curl -X POST http://localhost:4000/api/admin/products -F "data=..." -F "images=..."');

    // Clean up
    console.log('\n🧹 Cleaning up temp images...');
    imagePaths.forEach(p => {
      try {
        fs.unlinkSync(p);
      } catch (e) {}
    });

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
