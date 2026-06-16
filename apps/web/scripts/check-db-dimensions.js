const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, dimensionL: true, dimensionW: true, dimensionH: true },
      take: 5
    });

    console.log('\n=== PRODUCTS IN DATABASE ===\n');
    if (products.length === 0) {
      console.log('No products found!');
    } else {
      products.forEach(p => {
        console.log(`${p.name}`);
        console.log(`  L=${p.dimensionL}, W=${p.dimensionW}, H=${p.dimensionH}`);
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
