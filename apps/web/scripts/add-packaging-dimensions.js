#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding test dimensions to packaging and fixing prices...\n');

    const packagingUpdates = [
      { slug: 'white-box', l: 12, w: 12, h: 12, price: 50 },
      { slug: 'kraft-box', l: 20, w: 20, h: 20, price: 25 },
      { slug: 'premium-box', l: 15, w: 15, h: 15, price: 85 },
      { slug: 'luxe-trunk', l: 30, w: 25, h: 20, price: 350 },
      { slug: 'swag-mailer-1125x875x4', l: 11.25, w: 8.75, h: 4, price: 1649 },
      { slug: 'swag-mailer-19x14x10.5', l: 19, w: 14, h: 10.5, price: 3055 },
      { slug: 'swag-mailer-16x12x6', l: 16, w: 12, h: 6, price: 2500 },
    ];

    for (const pkg of packagingUpdates) {
      const existing = await prisma.packaging.findUnique({
        where: { slug: pkg.slug }
      });

      if (existing) {
        // Only override price if current price is 0
        const finalPrice = Number(existing.price) === 0 ? new Decimal(pkg.price) : existing.price;

        await prisma.packaging.update({
          where: { slug: pkg.slug },
          data: {
            lengthCm: pkg.l,
            widthCm: pkg.w,
            heightCm: pkg.h,
            price: finalPrice,
          }
        });
        console.log(`✓ ${existing.name}`);
        console.log(`  Dimensions: ${pkg.l} × ${pkg.w} × ${pkg.h} cm`);
        console.log(`  Price: ₹${Number(finalPrice)}`);
      }
    }

    console.log('\n✅ Packaging dimensions and prices updated!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
