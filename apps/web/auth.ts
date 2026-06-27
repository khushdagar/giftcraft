import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Central NextAuth v5 instance.
 *
 * - Adapter: Prisma → stores Account, User, VerificationToken rows.
 * - Providers:
 *     • Google OAuth — primary social login.
 *     • Credentials — email + password login for users who registered via the
 *       /register page. Passwords are stored as bcrypt hashes on User.passwordHash.
 * - Session strategy: "jwt". The Credentials provider does NOT support the
 *   database session strategy in NextAuth v5, so the whole app uses JWT sessions.
 *   Role / companyId are still re-read from PostgreSQL on every session lookup
 *   (in the `session` callback) so role changes take effect immediately.
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
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // No account, or an OAuth-only account with no password set.
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, persist the user id onto the token.
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      const userId = token.id as string | undefined;
      if (userId && session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, companyId: true },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.role = dbUser.role;
          session.user.companyId = dbUser.companyId;
        }
      }
      return session;
    },
  },
  events: {
    /**
     * First-login promotion: if the newly created user's email matches the
     * SEED_ADMIN_EMAIL env var, promote them to super_admin automatically.
     * Fires when the Prisma adapter creates a user (Google OAuth first login).
     * Email/password registration applies the same rule in /api/auth/register.
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
