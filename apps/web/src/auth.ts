import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const prismaAdapter = PrismaAdapter(prisma) as Adapter;

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
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
  adapter: prismaAdapter,
  session: { strategy: "database" },
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
        create: { userId: user.id, lessonCredits: 0 },
        update: {},
      });
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const full = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, locale: true },
        });
        session.user.role = full?.role ?? Role.STUDENT;
        session.user.locale = full?.locale ?? "ja";
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
