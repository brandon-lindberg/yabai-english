import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const prismaAdapter = PrismaAdapter(prisma) as Adapter;

const hasGoogleOAuth = !!(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

const providers = [];

if (hasGoogleOAuth) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// Apple, LINE: add providers here when AUTH_APPLE_* / LINE OAuth env vars are ready
// import Apple from "next-auth/providers/apple"
// providers.push(Apple({ clientId: process.env.AUTH_APPLE_ID!, clientSecret: process.env.AUTH_APPLE_SECRET! }))

if (providers.length === 0 && process.env.NODE_ENV !== "production") {
  providers.push(
    Credentials({
      name: "Email (dev only)",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        if (!email) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        return user ?? null;
      },
    }),
  );
}

if (providers.length === 0) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "missing-client-id",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "missing-secret",
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials (dev) requires JWT sessions; Google OAuth uses DB sessions + Prisma adapter.
  adapter: hasGoogleOAuth ? prismaAdapter : undefined,
  session: {
    strategy: hasGoogleOAuth ? "database" : "jwt",
  },
  trustHost: true,
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return true;
      const full = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });
      if (
        full?.role === Role.TEACHER ||
        full?.role === Role.ADMIN
      ) {
        return true;
      }
      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
      return true;
    },
    async jwt({ token, user }) {
      if (!hasGoogleOAuth && user?.id) {
        const row = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, locale: true },
        });
        if (row) {
          token.role = row.role;
          token.locale = row.locale;
        }
      }
      return token;
    },
    async session({ session, user, token }) {
      if (!session.user) return session;
      if (hasGoogleOAuth && user) {
        session.user.id = user.id;
        const full = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, locale: true },
        });
        session.user.role = full?.role ?? Role.STUDENT;
        session.user.locale = full?.locale ?? "ja";
      } else if (!hasGoogleOAuth && token?.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as Role) ?? Role.STUDENT;
        session.user.locale = (token.locale as string) ?? "ja";
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: Role;
      locale: string;
    };
  }
}
