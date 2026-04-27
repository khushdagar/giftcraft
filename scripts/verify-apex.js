const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findUnique({
    where: { slug: 'apex-duffle' },
    include: {
      priceTiers: { orderBy: { tier: 'asc' } },
      images: true,
      hsn: { include: { hsn: true } },
    }
  });

  if (!product) {
    console.log('Product not found');
    process.exit(1);
  }

  console.log('\n✅ APEX DUFFLE VERIFICATION\n');
  console.log('Basic Info:');
  console.log(`  ID: ${product.id}`);
  console.log(`  Name: ${product.name}`);
  console.log(`  SKU: ${product.sku}`);
  console.log(`  Status: ${product.status}`);
  console.log(`  Featured: ${product.isFeatured}`);
  
  console.log(`\nPrice Tiers: ${product.priceTiers.length}`);
  product.priceTiers.forEach(t => {
    const qty = t.maxQty ? `${t.minQty}-${t.maxQty}` : `${t.minQty}+`;
    console.log(`  Tier ${t.tier}: ${qty.padEnd(10)} | ₹${t.costPrice} → ₹${t.sellPrice}`);
  });
  
  console.log(`\nImages: ${product.images.length}`);
  product.images.forEach((img, i) => {
    console.log(`  ${i+1}. ${img.isPrimary ? '[PRIMARY]' : ''}`);
  });
  
  console.log(`\nTax: HSN ${product.hsn?.hsn?.code} | ${product.hsn?.gstRate}% GST`);
}

main().finally(() => process.exit(0));
