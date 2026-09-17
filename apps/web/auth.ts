import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
 
  trustHost: true,
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
      const email = (token.email ?? session.user?.email) as string | undefined;
      if ((userId || email) && session.user) {
        // Look up by the id stored in the JWT, then by email. A JWT issued
        // before the User row was (re)created, or against another database,
        // carries a stale id — without the fallback the role stays unset and a
        // super_admin is treated as a plain customer until they re-login.
        const select = { id: true, role: true, companyId: true } as const;
        const dbUser =
          (userId ? await prisma.user.findUnique({ where: { id: userId }, select }) : null) ??
          (email ? await prisma.user.findUnique({ where: { email }, select }) : null);
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
