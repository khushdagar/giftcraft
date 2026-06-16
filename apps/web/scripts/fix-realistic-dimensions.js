#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Fixing product dimensions with PACKAGING ENVELOPE sizes...\n');

    // Realistic packaging envelope dimensions (box size needed to hold product)
    const updates = [
      { name: '5-Panel Hat', l: 10, w: 10, h: 8 },           // Small hat box
      { name: 'North End Men\'s Rhythm Waffle Quarter-Zip', l: 15, w: 12, h: 3 },  // Folded shirt
      { name: 'Women\'s Signature Crew in White', l: 15, w: 12, h: 3 },             // Folded shirt
      { name: 'Stainless Steel Flask 500ml', l: 8, w: 8, h: 22 },                   // Flask tall
      { name: 'A5 Hardbound Notebook', l: 15, w: 10, h: 1 },                        // Thin book
      { name: 'Premium Roller Pen Set', l: 25, w: 8, h: 3 },                        // Pen box
      { name: '20L Commuter Backpack', l: 30, w: 20, h: 15 },                       // Backpack (larger)
      { name: 'Portable Bluetooth Speaker', l: 12, w: 12, h: 10 },                  // Speaker cube
      { name: 'Ceramic Travel Mug', l: 10, w: 10, h: 12 },                          // Mug box
      { name: 'Premium Cotton T-Shirt', l: 15, w: 12, h: 3 },                       // Folded shirt
      { name: 'Artisan Chocolate Box', l: 15, w: 10, h: 5 },                        // Chocolate box
      { name: 'Ceramic Desk Planter', l: 10, w: 10, h: 10 },                        // Planter cube
      { name: '10000mAh Power Bank', l: 12, w: 7, h: 2 },                           // Small rectangle
      { name: 'Compact Travel Umbrella', l: 25, w: 8, h: 5 },                       // Umbrella case
      { name: 'Scented Soy Candle', l: 8, w: 8, h: 12 },                            // Candle box
      { name: 'Apex Duffle', l: 40, w: 20, h: 15 },                                 // Large bag
    ];

    for (const update of updates) {
      const product = await prisma.product.findFirst({
        where: { name: update.name }
      });

      if (product) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            dimensionL: update.l,
            dimensionW: update.w,
            dimensionH: update.h,
          }
        });

        const vol = update.l * update.w * update.h;
        console.log(`✓ ${update.name}`);
        console.log(`  ${update.l}×${update.w}×${update.h} cm (${vol} cm³)\n`);
      }
    }

    console.log('✅ Realistic dimensions added!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
