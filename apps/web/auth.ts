import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * Central NextAuth v5 instance.
 *
 * - Adapter: Prisma → stores Account, Session, User, VerificationToken rows.
 * - Provider: Google OAuth only in Stage 1.
 * - Session strategy: "database" (default for Prisma adapter).
 * - Callback: each session lookup re-reads User.role and User.companyId from
 *   PostgreSQL so role changes take effect immediately, without requiring the
 *   user to log out and back in.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true, companyId: true },
      });
      if (dbUser) {
        session.user.id = dbUser.id;
        session.user.role = dbUser.role;
        session.user.companyId = dbUser.companyId;
      }
      return session;
    },
  },
  events: {
    /**
     * First-login promotion: if the newly created user's email matches the
     * SEED_ADMIN_EMAIL env var, promote them to super_admin automatically.
     * This means the very first Google login by the Arts Shala admin lands
     * them in /admin without any manual SQL.
     */
    async createUser({ user }) {
      const seedEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
      if (seedEmail && user.email?.toLowerCase() === seedEmail) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "super_admin" },
        });
      }
    },
  },
});
