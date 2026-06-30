/**
 * Promote a user to super_admin by email.
 *
 *   npm run make-admin -- udayveer@rankingeek.com
 *   # or, defaulting to SEED_ADMIN_EMAIL:
 *   npm run make-admin
 *
 * The auto-promotion in auth.ts only fires on a user's FIRST Google login. If a
 * user has already signed in (so the row already exists), use this to set the
 * role directly. Safe to re-run — it's idempotent.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || process.env.SEED_ADMIN_EMAIL)?.trim().toLowerCase();
  if (!email) {
    throw new Error("Usage: npm run make-admin -- <email>  (or set SEED_ADMIN_EMAIL)");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(
      `No user found with email "${email}". Ask them to sign in with Google once first, then re-run.`
    );
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: "super_admin" },
  });

  console.log(`✅ ${updated.email} is now ${updated.role}.`);
}

main()
  .catch((e) => {
    console.error("❌", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
