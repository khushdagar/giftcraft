#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('=== PRODUCTS WITH DIMENSIONS ===\n');
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        dimensionL: true,
        dimensionW: true,
        dimensionH: true
      },
      take: 5
    });

    products.forEach(p => {
      const vol = (p.dimensionL || 0) * (p.dimensionW || 0) * (p.dimensionH || 0);
      const volWithPadding = vol * 1.2;
      console.log(`${p.name}`);
      console.log(`  Dimensions: ${p.dimensionL} × ${p.dimensionW} × ${p.dimensionH} cm`);
      console.log(`  Volume: ${vol.toFixed(0)} cm³`);
      console.log(`  Volume (with 20% padding): ${volWithPadding.toFixed(0)} cm³\n`);
    });

    console.log('\n=== PACKAGING WITH DIMENSIONS ===\n');
    const packaging = await prisma.packaging.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        lengthCm: true,
        widthCm: true,
        heightCm: true
      }
    });

    packaging.forEach(p => {
      const vol = (p.lengthCm || 0) * (p.widthCm || 0) * (p.heightCm || 0);
      console.log(`${p.name}`);
      console.log(`  Dimensions: ${p.lengthCm} × ${p.widthCm} × ${p.heightCm} cm`);
      console.log(`  Volume: ${vol.toFixed(0)} cm³`);
      console.log(`  Price: ₹${Number(p.price)}\n`);
    });

    // Test the calculation
    console.log('\n=== TEST CALCULATION ===\n');
    const product1 = products[0];
    const product2 = products[1];
    const product3 = products[2];

    if (product1 && product2 && product3) {
      const totalVolume = (
        (product1.dimensionL * product1.dimensionW * product1.dimensionH) +
        (product2.dimensionL * product2.dimensionW * product2.dimensionH) +
        (product3.dimensionL * product3.dimensionW * product3.dimensionH)
      ) * 1.2;

      console.log(`Total volume of 3 products (with 20% padding): ${totalVolume.toFixed(0)} cm³\n`);

      console.log('Which packaging can fit this?\n');
      packaging.forEach(p => {
        const pkgVol = p.lengthCm * p.widthCm * p.heightCm;
        const fits = pkgVol >= totalVolume;
        console.log(`${fits ? '✓' : '✗'} ${p.name} (${pkgVol.toFixed(0)} cm³)`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
