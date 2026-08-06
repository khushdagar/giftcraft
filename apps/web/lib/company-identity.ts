// One buyer, several email addresses.
//
// Corporate buyers routinely sign in with a personal Google account and then
// type their work address into the checkout contact block (or the reverse).
// Both are the same person, but each is a separate `User` row, so the second
// sign-in used to land on an empty dashboard: no saved logos, no company
// address, no past orders.
//
// The Company is the container that already holds all of that — brand assets,
// billing/company address, orders. So the fix is not to copy data around, it is
// to point both identities at the same Company. Everything downstream then
// resolves through `session.user.companyId` exactly as it already does.

import { prisma } from '@/lib/prisma';

/**
 * Adopt a user's company-less brand assets into a company.
 *
 * Logos are uploaded in the builder, which is usually BEFORE the company exists
 * — it gets created from the billing block on the first order. Those uploads are
 * held against the uploader alone; this moves them into the company library so
 * colleagues and the buyer's other sign-in email can reuse them.
 */
export async function adoptOrphanBrandAssets(userId: string, companyId: string): Promise<number> {
  const { count } = await prisma.brandAsset.updateMany({
    where: { uploadedBy: userId, companyId: null },
    data: { companyId },
  });
  return count;
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  ai: 'application/postscript',
  eps: 'application/postscript',
};

/**
 * Make sure the logo an order was placed with exists in the company's library.
 *
 * A guest can brand their pack before signing in, so the upload happens with no
 * session and leaves nothing but a CDN URL on the quote. Once they sign in and
 * check out, this files that URL under the company so it shows up in "Your Saved
 * Logos" on the next order. `sizeBytes` is 0 — the file is already on Spaces and
 * its size is not worth a round trip.
 */
export async function ensureLogoInLibrary(
  companyId: string,
  userId: string,
  logoUrl: string | null | undefined
): Promise<void> {
  const url = String(logoUrl ?? '').trim();
  if (!url) return;

  const existing = await prisma.brandAsset.findFirst({
    where: { url, OR: [{ companyId }, { uploadedBy: userId }] },
    select: { id: true, companyId: true },
  });
  if (existing) {
    if (!existing.companyId) {
      await prisma.brandAsset.update({ where: { id: existing.id }, data: { companyId } });
    }
    return;
  }

  const fileName =
    decodeURIComponent(url.split('/').pop() || 'logo').split('?')[0] || 'logo';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  await prisma.brandAsset.create({
    data: {
      companyId,
      name: fileName,
      url,
      mimeType: MIME_BY_EXT[ext] || 'application/octet-stream',
      sizeBytes: 0,
      uploadedBy: userId,
    },
  });
}

export type EmailLinkResult =
  | { linked: true; userId: string; created: boolean }
  | { linked: false; reason: 'same-email' | 'no-email' | 'belongs-elsewhere' };

/**
 * Attach a second email address to a company, so signing in with it later lands
 * on the same account data.
 *
 * A placeholder `User` is created when the address has never signed in. Google
 * OAuth links onto it by verified email (`allowDangerousEmailAccountLinking` in
 * auth.ts), so the buyer's first sign-in with that address adopts this row
 * rather than starting a fresh, empty one.
 *
 * We refuse to touch an address that already belongs to a DIFFERENT company.
 * Typing a colleague's — or a stranger's — address at checkout must never move
 * them out of their own company or hand over its assets.
 */
export async function linkEmailToCompany(
  companyId: string,
  rawEmail: string | null | undefined,
  opts: { sessionEmail?: string | null; name?: string | null } = {}
): Promise<EmailLinkResult> {
  const email = String(rawEmail ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) return { linked: false, reason: 'no-email' };

  const sessionEmail = String(opts.sessionEmail ?? '').trim().toLowerCase();
  if (email === sessionEmail) return { linked: false, reason: 'same-email' };

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, companyId: true, name: true },
  });

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        email,
        name: String(opts.name ?? '').trim() || null,
        companyId,
        // Placeholder identity — no password, no OAuth account yet. It becomes
        // a real login the first time this address signs in with Google.
        role: 'company_member',
      },
      select: { id: true },
    });
    return { linked: true, userId: created.id, created: true };
  }

  if (existing.companyId && existing.companyId !== companyId) {
    return { linked: false, reason: 'belongs-elsewhere' };
  }

  if (!existing.companyId) {
    await prisma.user.update({ where: { id: existing.id }, data: { companyId } });
    // Anything they uploaded as a lone user now belongs to the shared library.
    await adoptOrphanBrandAssets(existing.id, companyId);
  }

  return { linked: true, userId: existing.id, created: false };
}
