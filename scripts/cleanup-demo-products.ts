import { prisma } from '../apps/web/lib/prisma'
import fs from 'fs'
import path from 'path'

// Load .env.local manually
const envFile = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf-8')
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      let value = valueParts.join('=').trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (key && value && !process.env[key.trim()]) {
        process.env[key.trim()] = value
      }
    }
  })
}

async function cleanupDemoProducts() {
  console.log('🗑️  Cleaning up demo products...\n')

  try {
    // Delete collections (which also cascade deletes CollectionProducts)
    console.log('📦 Deleting collections...')
    const collectionsDeleted = await prisma.collection.deleteMany({
      where: {
        slug: {
          in: [
            'professional-starter-pack',
            'womens-professional-collection',
            'complete-team-kit',
          ],
        },
      },
    })
    console.log(`   ✅ Deleted ${collectionsDeleted.count} collection(s)\n`)

    // Delete products (which cascades: PriceTiers, ProductImages, ProductHsn, etc.)
    console.log('👕 Deleting products...')
    const productsDeleted = await prisma.product.deleteMany({
      where: {
        sku: {
          in: ['PKQD2FW', 'PREFOXH', 'PASHZWT'],
        },
      },
    })
    console.log(`   ✅ Deleted ${productsDeleted.count} product(s)\n`)

    // Delete categories
    console.log('📂 Deleting categories...')
    const categoriesDeleted = await prisma.category.deleteMany({
      where: {
        slug: {
          in: ['caps-hats', 'mens-apparel', 'womens-apparel'],
        },
      },
    })
    console.log(`   ✅ Deleted ${categoriesDeleted.count} category(ies)\n`)

    // Delete HSN codes
    console.log('🏷️  Deleting HSN codes...')
    const hsnDeleted = await prisma.hsnCode.deleteMany({
      where: {
        code: {
          in: ['6505', '6204'],
        },
      },
    })
    console.log(`   ✅ Deleted ${hsnDeleted.count} HSN code(s)\n`)

    console.log('════════════════════════════════════════════════════════\n')
    console.log('✅ DEMO PRODUCTS CLEANED UP SUCCESSFULLY!\n')
    console.log('📊 Summary of deleted records:')
    console.log(`   Collections: ${collectionsDeleted.count}`)
    console.log(`   Products: ${productsDeleted.count}`)
    console.log(`   Categories: ${categoriesDeleted.count}`)
    console.log(`   HSN Codes: ${hsnDeleted.count}\n`)
  } catch (error) {
    console.error('❌ Error cleaning up products:', error)
    process.exit(1)
  }
}

cleanupDemoProducts().finally(() => prisma.$disconnect())
