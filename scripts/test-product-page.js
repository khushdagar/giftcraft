const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findUnique({
    where: { slug: 'apex-duffle' },
    include: {
      priceTiers: { orderBy: { tier: 'asc' } },
      images: { orderBy: { sortOrder: 'asc' } },
      hsn: { include: { hsn: true } },
      categories: { include: { category: true } },
      occasions: { include: { occasion: true } },
    },
  });

  if (!product) {
    console.log('Product not found');
    process.exit(1);
  }

  console.log('✅ Product loaded from DB\n');
  console.log('Images array length:', product.images?.length || 0);
  
  if (product.images && product.images.length > 0) {
    console.log('\n🖼️  Images found:');
    product.images.forEach((img, i) => {
      console.log(`\n  Image ${i+1}:`);
      console.log(`    ID: ${img.id}`);
      console.log(`    URL: ${img.url}`);
      console.log(`    Primary: ${img.isPrimary}`);
      console.log(`    SortOrder: ${img.sortOrder}`);
      console.log(`    AltText: ${img.altText || 'None'}`);
    });
  } else {
    console.log('\n⚠️  No images found!');
  }

  // Test serialization
  const spreadTest = {
    ...product,
    testField: 'test',
  };

  console.log('\n🧪 Serialization test:');
  console.log('Images in spread result:', spreadTest.images?.length || 0);
}

main().finally(() => process.exit(0));
