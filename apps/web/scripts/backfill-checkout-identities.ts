// Backfill: attach checkout email addresses and order logos to their companies.
//
// Identity linking and logo filing only run when an order is placed, so orders
// made before that logic existed left two gaps:
//   1. The email typed into the checkout contact block was never attached to the
//      buyer's company, so signing in with it lands on an empty dashboard.
//   2. A logo branded onto the pack lives only as a URL on the order — it never
//      reached the company's brand asset library.
//
// This walks every order that has a company and closes both, using the same
// helpers the live order route uses, so the rules (never steal an address that
// belongs to another company) are identical.
//
// Run:  npx tsx scripts/backfill-checkout-identities.ts
//       npx tsx scripts/backfill-checkout-identities.ts --dry

import { PrismaClient } from '@prisma/client';
import { ensureLogoInLibrary, linkEmailToCompany } from '../lib/company-identity';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry');

async function main() {
  const orders = await prisma.order.findMany({
    where: { companyId: { not: null } },
    select: {
      orderNumber: true,
      companyId: true,
      placedById: true,
      logoUrl: true,
      billingJson: true,
      placedBy: { select: { email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`${orders.length} orders with a company${DRY ? ' (dry run)' : ''}\n`);

  let linked = 0;
  let logos = 0;
  let skipped = 0;

  for (const order of orders) {
    const companyId = order.companyId!;
    const billing = (order.billingJson as Record<string, any>) || {};
    const billingEmail = String(billing.email ?? '').trim().toLowerCase();
    const sessionEmail = order.placedBy?.email ?? null;

    if (billingEmail && billingEmail !== sessionEmail?.toLowerCase()) {
      if (DRY) {
        console.log(`  ${order.orderNumber}: would link ${billingEmail} → company ${companyId}`);
        linked++;
      } else {
        const result = await linkEmailToCompany(companyId, billingEmail, {
          sessionEmail,
          name: billing.name,
        });
        if (result.linked) {
          console.log(
            `  ${order.orderNumber}: linked ${billingEmail} (${result.created ? 'created' : 'updated'})`
          );
          linked++;
        } else {
          console.log(`  ${order.orderNumber}: skipped ${billingEmail} — ${result.reason}`);
          skipped++;
        }
      }
    }

    if (order.logoUrl && order.placedById) {
      if (DRY) {
        console.log(`  ${order.orderNumber}: would file logo ${order.logoUrl}`);
        logos++;
      } else {
        await ensureLogoInLibrary(companyId, order.placedById, order.logoUrl);
        console.log(`  ${order.orderNumber}: logo filed`);
        logos++;
      }
    }
  }

  console.log(`\nDone. ${linked} emails linked, ${logos} logos filed, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
