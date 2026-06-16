const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const pkg = await prisma.packaging.findMany({
      select: { name: true, price: true, lengthCm: true, widthCm: true, heightCm: true }
    });

    console.log('\n=== PACKAGING DIMENSIONS IN DB ===\n');
    pkg.forEach(x => {
      console.log(`${x.name}`);
      console.log(`  Dimensions: ${x.lengthCm} × ${x.widthCm} × ${x.heightCm} cm`);
      console.log(`  Price: ₹${Number(x.price)}\n`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
