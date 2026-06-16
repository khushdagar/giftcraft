#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding test dimensions to products...');

    // Get all products without dimensions
    const productsNoDims = await prisma.product.findMany({
      where: {
        OR: [
          { dimensionL: null },
          { dimensionW: null },
          { dimensionH: null }
        ]
      }
    });

    console.log(`Found ${productsNoDims.length} products without dimensions`);

    // Add test dimensions to each product
    for (const product of productsNoDims) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          dimensionL: 10 + Math.random() * 10,  // 10-20 cm
          dimensionW: 8 + Math.random() * 10,   // 8-18 cm
          dimensionH: 5 + Math.random() * 15,   // 5-20 cm
        }
      });
      console.log(`✓ Updated ${product.name}`);
    }

    // Add dimensions to packaging
    console.log('\nAdding test dimensions to packaging...');

    const packagingToUpdate = [
      { slug: 'white-gift-box', l: 12, w: 12, h: 12, price: 50 },
      { slug: 'kraft-craft-box', l: 20, w: 20, h: 20, price: 75 },
      { slug: 'premium-rigid-box', l: 15, w: 15, h: 15, price: 100 },
      { slug: 'luxe-wooden-trunk', l: 30, w: 25, h: 20, price: 150 },
    ];

    for (const pkg of packagingToUpdate) {
      const existing = await prisma.packaging.findUnique({
        where: { slug: pkg.slug }
      });

      if (existing) {
        await prisma.packaging.update({
          where: { slug: pkg.slug },
          data: {
            lengthCm: pkg.l,
            widthCm: pkg.w,
            heightCm: pkg.h,
            price: existing.price && Number(existing.price) > 0 ? existing.price : pkg.price,
          }
        });
        console.log(`✓ Updated ${existing.name}`);
      }
    }

    console.log('\n✅ Done! Test dimensions added.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
