/**
 * Clears the catalog ahead of a fresh bulk product upload.
 *
 * Keeps Packaging + Add-on products (builder gift boxes and their size
 * variants) since the builder depends on them. Deletes the test orders that
 * reference catalog products — OrderItem/PriceAuditLog/GocOption/SampleOrder
 * are Restrict relations, so products cannot be removed while they exist.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const KEEP_CATEGORY_SLUGS = ['packaging', 'add-on']

async function main() {
  const keepIds = (
    await prisma.productCategory.findMany({
      where: { category: { slug: { in: KEEP_CATEGORY_SLUGS } } },
      select: { productId: true },
    })
  ).map((r) => r.productId)

  const targets = await prisma.product.findMany({
    where: { id: { notIn: keepIds } },
    select: { id: true },
  })
  const ids = targets.map((p) => p.id)

  console.log(`Keeping ${keepIds.length} packaging/add-on products.`)
  console.log(`Deleting ${ids.length} catalog products...`)

  await prisma.$transaction(async (tx) => {
    // 1. Orders (all test data) — items/addons/recipients/timeline/mockups/
    //    slaLogs/artworkApprovals/disputes/einvoice/modifications cascade.
    await tx.vendorPO.deleteMany({})
    await tx.shipmentTracking.deleteMany({})
    const orders = await tx.order.deleteMany({})
    console.log(`  orders deleted: ${orders.count}`)

    // 2. Gift-of-choice campaigns (GocOption -> Product is Restrict).
    await tx.gocClaim.deleteMany({})
    await tx.gocOption.deleteMany({})
    await tx.gocCampaign.deleteMany({})

    // 3. Remaining Restrict relations.
    await tx.sampleOrder.deleteMany({ where: { productId: { in: ids } } })
    await tx.priceAuditLog.deleteMany({ where: { productId: { in: ids } } })

    // 4. Loose productId columns with no FK.
    await tx.inventoryMovement.deleteMany({ where: { productId: { in: ids } } })
    await tx.inventoryStock.deleteMany({ where: { productId: { in: ids } } })
    await tx.enquiry.updateMany({
      where: { productId: { in: ids } },
      data: { productId: null },
    })

    // 5. Products — images, variants, price tiers, category/occasion joins,
    //    HSN, vendor links, reviews, gift-pack items all cascade.
    const deleted = await tx.product.deleteMany({ where: { id: { in: ids } } })
    console.log(`  products deleted: ${deleted.count}`)
  })

  const remaining = await prisma.product.count()
  console.log(`\nDone. Products remaining: ${remaining}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
