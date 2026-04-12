import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import { isPlacementRetakeAllowed } from "@/lib/placement-cooldown";
import { Role } from "@prisma/client";

const prismaAdapter = PrismaAdapter(prisma) as Adapter;

const hasGoogleOAuth = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);
const useDevCredentialsOnly =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true" &&
  !hasGoogleOAuth;

const providers = [];
if (hasGoogleOAuth) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "missing-client-id",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "missing-secret",
      allowDangerousEmailAccountLinking: true,
    }),
  );
}
if (useDevCredentialsOnly) {
  providers.push(
    Credentials({
      name: "Email (dev bypass)",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        if (!email) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        return user ?? null;
      },
    }),
  );
}

// Apple, LINE: add providers here when AUTH_APPLE_* / LINE OAuth env vars are ready

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      if (useDevCredentialsOnly && user?.id) {
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
      if (user) {
        session.user.id = user.id;
        const full = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, locale: true },
        });
        session.user.role = full?.role ?? Role.STUDENT;
        session.user.locale = full?.locale ?? "ja";
      } else if (useDevCredentialsOnly && token?.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as Role) ?? Role.STUDENT;
        session.user.locale = (token.locale as string) ?? "ja";
      }

      const userId = session.user.id;
      if (session.user.role === Role.STUDENT && userId) {
        const row = await prisma.studentProfile.findUnique({
          where: { userId },
          select: { placementCompletedAt: true },
        });
        session.user.canStartPlacement = isPlacementRetakeAllowed(row?.placementCompletedAt ?? null);
      } else {
        session.user.canStartPlacement = true;
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
      /** Students: whether `/placement` and retake CTAs should show (false during post-test cooldown). */
      canStartPlacement: boolean;
    };
  }
}
