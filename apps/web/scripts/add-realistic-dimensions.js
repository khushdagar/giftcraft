#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding REALISTIC dimensions to products...\n');

    // Real dimensions based on product type
    const dimensionMap = {
      'apex-duffle': { l: 55, w: 30, h: 25 },           // Large travel bag
      '5-panel-hat': { l: 35, w: 30, h: 15 },           // Hat
      'rhythm-waffle': { l: 60, w: 40, h: 5 },          // Shirt folded
      'signature-crew': { l: 55, w: 40, h: 5 },         // T-shirt folded
      'flask-500ml': { l: 8, w: 8, h: 22 },             // Flask
      'a5-notebook': { l: 21, w: 14.8, h: 1 },          // A5 notebook
      'roller-pen-set': { l: 25, w: 8, h: 3 },          // Pen set
      'commuter-backpack': { l: 45, w: 30, h: 20 },     // Backpack
      'bluetooth-speaker': { l: 15, w: 15, h: 7 },      // Speaker
      'travel-mug': { l: 10, w: 10, h: 15 },            // Mug
      't-shirt': { l: 50, w: 40, h: 3 },                // T-shirt
      'chocolate-box': { l: 20, w: 15, h: 5 },          // Chocolate box
      'desk-planter': { l: 12, w: 12, h: 12 },          // Planter
      'power-bank': { l: 12, w: 7, h: 2 },              // Power bank
      'travel-umbrella': { l: 25, w: 8, h: 5 },         // Umbrella
      'candle': { l: 8, w: 8, h: 12 },                  // Candle
    };

    const products = await prisma.product.findMany({
      select: { id: true, name: true, slug: true }
    });

    for (const product of products) {
      const slugKey = product.slug.toLowerCase().replace(/-/g, '-');
      let dims = null;

      // Try to find matching dimensions
      for (const [key, values] of Object.entries(dimensionMap)) {
        if (slugKey.includes(key) || key.includes(slugKey.split('-')[0])) {
          dims = values;
          break;
        }
      }

      // If no match found, use medium defaults
      if (!dims) {
        dims = { l: 20, w: 15, h: 10 };
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          dimensionL: dims.l,
          dimensionW: dims.w,
          dimensionH: dims.h,
        }
      });

      console.log(`✓ ${product.name}`);
      console.log(`  ${dims.l} × ${dims.w} × ${dims.h} cm\n`);
    }

    console.log('✅ Realistic dimensions added!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
