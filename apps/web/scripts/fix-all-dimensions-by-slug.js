const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Fixing ALL product dimensions based on product type...\n');

    // Update based on slug patterns for accuracy
    const updates = [
      { slugMatch: 'hat', l: 10, w: 10, h: 8 },
      { slugMatch: 'shirt', l: 15, w: 12, h: 3 },
      { slugMatch: 'flask', l: 8, w: 8, h: 22 },
      { slugMatch: 'notebook', l: 15, w: 10, h: 1 },
      { slugMatch: 'pen', l: 25, w: 8, h: 3 },
      { slugMatch: 'backpack', l: 30, w: 20, h: 15 },
      { slugMatch: 'speaker', l: 12, w: 12, h: 10 },
      { slugMatch: 'mug', l: 10, w: 10, h: 12 },
      { slugMatch: 'chocolate', l: 15, w: 10, h: 5 },
      { slugMatch: 'planter', l: 10, w: 10, h: 10 },
      { slugMatch: 'power', l: 12, w: 7, h: 2 },
      { slugMatch: 'umbrella', l: 25, w: 8, h: 5 },
      { slugMatch: 'candle', l: 8, w: 8, h: 12 },
      { slugMatch: 'duffle', l: 40, w: 20, h: 15 },
    ];

    const products = await prisma.product.findMany({
      select: { id: true, slug: true, name: true }
    });

    for (const product of products) {
      const match = updates.find(u => product.slug.includes(u.slugMatch));

      if (match) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            dimensionL: match.l,
            dimensionW: match.w,
            dimensionH: match.h,
          }
        });
        const vol = match.l * match.w * match.h;
        console.log(`✓ ${product.name} (${product.slug})`);
        console.log(`  ${match.l}×${match.w}×${match.h} cm = ${vol} cm³\n`);
      }
    }

    console.log('✅ All dimensions fixed!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
