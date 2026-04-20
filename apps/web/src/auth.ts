import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import { isPlacementRetakeAllowed } from "@/lib/placement-cooldown";
import { isLoginAllowedForAccountStatus } from "@/lib/account-status";
import { getSessionMaxAgeSeconds } from "@/lib/session-timeout";
import { AccountStatus, Role, type OrgRole } from "@/generated/prisma/client";
import { cookies } from "next/headers";

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
        if (!user || !isLoginAllowedForAccountStatus(user.accountStatus)) {
          return null;
        }
        return user;
      },
    }),
  );
}

// Apple, LINE: add providers here when AUTH_APPLE_* / LINE OAuth env vars are ready

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: hasGoogleOAuth ? prismaAdapter : undefined,
  session: {
    strategy: hasGoogleOAuth ? "database" : "jwt",
    maxAge: getSessionMaxAgeSeconds(),
    updateAge: Math.min(300, getSessionMaxAgeSeconds()),
  },
  trustHost: true,
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user.id && !user.email) return true;
      const full =
        (user.id
          ? await prisma.user.findUnique({
              where: { id: user.id },
              select: { id: true, role: true, accountStatus: true },
            })
          : null) ??
        (user.email
          ? await prisma.user.findUnique({
              where: { email: user.email },
              select: { id: true, role: true, accountStatus: true },
            })
          : null);
      if (full && !isLoginAllowedForAccountStatus(full.accountStatus)) {
        return false;
      }
      if (
        full?.role === Role.TEACHER ||
        full?.role === Role.SUPER_ADMIN
      ) {
        return true;
      }
      if (!full?.id) {
        // Auth.js can reach signIn callback before the adapter write is visible.
        // Skip profile upsert for this pass to avoid transient FK failures.
        return true;
      }
      await prisma.studentProfile.upsert({
        where: { userId: full.id },
        create: { userId: full.id },
        update: {},
      });
      return true;
    },
    async jwt({ token, user }) {
      if (useDevCredentialsOnly && user?.id) {
        const row = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, locale: true, accountStatus: true },
        });
        if (row) {
          token.role = row.role;
          token.locale = row.locale;
          (token as { accountStatus?: AccountStatus }).accountStatus = row.accountStatus;
        }
      } else if (useDevCredentialsOnly && token.sub) {
        const row = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, locale: true, accountStatus: true },
        });
        if (row) {
          token.role = row.role;
          token.locale = row.locale;
          (token as { accountStatus?: AccountStatus }).accountStatus = row.accountStatus;
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
          select: { role: true, locale: true, accountStatus: true },
        });
        session.user.role = full?.role ?? Role.STUDENT;
        session.user.locale = full?.locale ?? "ja";
        session.user.accountStatus = full?.accountStatus ?? AccountStatus.ACTIVE;
      } else if (useDevCredentialsOnly && token?.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as Role) ?? Role.STUDENT;
        session.user.locale = (token.locale as string) ?? "ja";
        const t = token as { accountStatus?: AccountStatus };
        session.user.accountStatus = t.accountStatus ?? AccountStatus.ACTIVE;
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

      // --- Org context from cookie ---
      session.user.activeOrgId = null;
      session.user.activeSchoolId = null;
      session.user.orgRole = null;

      if (userId) {
        try {
          const cookieStore = await cookies();
          const activeOrgId = cookieStore.get("active-org-id")?.value ?? null;
          const activeSchoolId = cookieStore.get("active-school-id")?.value ?? null;
          if (activeOrgId) {
            const membership = await prisma.organizationMembership.findFirst({
              where: {
                userId,
                organizationId: activeOrgId,
                status: "ACTIVE",
                ...(activeSchoolId ? { schoolId: activeSchoolId } : { schoolId: null }),
              },
              select: { orgRole: true, schoolId: true },
            });
            if (membership) {
              session.user.activeOrgId = activeOrgId;
              session.user.activeSchoolId = activeSchoolId;
              session.user.orgRole = membership.orgRole;
            }
          }
        } catch {
          // cookies() may throw in non-request contexts (e.g. API route tests);
          // org context is optional, so silently fall back to null.
        }
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
      accountStatus: AccountStatus;
      /** Students: whether `/placement` and retake CTAs should show (false during post-test cooldown). */
      canStartPlacement: boolean;
      /** Active organization context (set via org switcher cookie). */
      activeOrgId: string | null;
      /** Active school context within the org (set via org switcher cookie). */
      activeSchoolId: string | null;
      /** User's role within the active organization. */
      orgRole: OrgRole | null;
    };
  }
}

