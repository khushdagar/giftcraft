const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('\n=== TESTING PACKAGING CALCULATION ===\n');

    // Get products
    const products = await prisma.product.findMany({
      select: { id: true, name: true, dimensionL: true, dimensionW: true, dimensionH: true },
      take: 5
    });

    // Get packaging
    const packaging = await prisma.packaging.findMany({
      select: { name: true, lengthCm: true, widthCm: true, heightCm: true }
    });

    console.log('SELECTED PRODUCTS:');
    let totalVolume = 0;
    products.forEach(p => {
      const vol = (p.dimensionL || 0) * (p.dimensionW || 0) * (p.dimensionH || 0);
      totalVolume += vol;
      console.log(`  ${p.name}: ${p.dimensionL}×${p.dimensionW}×${p.dimensionH} = ${vol} cm³`);
    });

    const withPadding = totalVolume * 1.2;
    console.log(`\nTotal Volume: ${totalVolume} cm³`);
    console.log(`With 20% Padding: ${withPadding.toFixed(0)} cm³\n`);

    console.log('PACKAGING OPTIONS:');
    const suitable = [];
    packaging.forEach(p => {
      const vol = (p.lengthCm || 0) * (p.widthCm || 0) * (p.heightCm || 0);
      const fits = vol >= withPadding;
      const mark = fits ? '✓' : '✗';
      console.log(`  ${mark} ${p.name}: ${p.lengthCm}×${p.widthCm}×${p.heightCm} = ${vol} cm³`);
      if (fits) suitable.push({ name: p.name, vol });
    });

    if (suitable.length > 0) {
      suitable.sort((a, b) => a.vol - b.vol);
      console.log(`\n✓ RECOMMENDED: ${suitable[0].name}`);
      console.log(`   (Smallest box that fits all products)`);
    } else {
      console.log('\n✗ NO PACKAGING AVAILABLE');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
