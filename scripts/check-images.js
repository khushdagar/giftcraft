const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findUnique({
    where: { slug: 'apex-duffle' },
    include: { images: true }
  });

  if (!product) {
    console.log('Product not found');
    process.exit(1);
  }

  console.log('Product ID:', product.id);
  console.log('Total images:', product.images.length);
  console.log('\nImages:');
  product.images.forEach((img, i) => {
    console.log(`  ${i+1}. ID: ${img.id}`);
    console.log(`     URL: ${img.url}`);
    console.log(`     Primary: ${img.isPrimary}`);
    console.log(`     Sort Order: ${img.sortOrder}`);
  });
}

main().finally(() => process.exit(0));
