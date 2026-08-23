import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import { isPlacementRetakeAllowed } from "@/lib/placement-cooldown";
import { isLoginAllowedForAccountStatus } from "@/lib/account-status";
import { getSessionMaxAgeSeconds } from "@/lib/session-timeout";
import { claimPendingMemberships } from "@/lib/claim-pending-memberships";
import { claimTeacherRosterInvites } from "@/lib/claim-teacher-roster-invites";
import { pickOidcProfilePicture, syncUserImageIfChanged } from "@/lib/oauth-profile-picture";
import { AccountStatus, Role, type OrgRole } from "@/generated/prisma/client";
import { cookies, headers } from "next/headers";

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
  const googleOptions = {
    clientId: process.env.AUTH_GOOGLE_ID ?? "missing-client-id",
    clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "missing-secret",
    allowDangerousEmailAccountLinking: true,
    // Google often omits `picture` from the ID token; Auth.js then only passes those
    // claims into `callbacks.signIn` as `profile`. Fetch userinfo so `picture` exists
    // and new/existing users get `User.image` populated and kept in sync.
    idToken: false,
  };
  // `OAuthUserConfig` is typed from a union that omits OIDC-only `idToken`; runtime supports it.
  providers.push(Google(googleOptions as Parameters<typeof Google>[0]));
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

/**
 * Auth.js funnels every error whose type is not on its 8-entry client-safe allowlist
 * into `?error=Configuration`, and its default logger only prints `cause` when that
 * cause is shaped `{ err: Error }`. `InvalidCheck` is neither: it carries the real
 * reason directly on `.cause`, so an expired PKCE cookie, a missing one, and a dead
 * database all log as the same opaque line. Unwrap the chain and attach the request
 * context so an occurrence in the Render logs identifies itself.
 */
async function logAuthError(error: Error) {
  const label = (e: Error) => (e as { type?: string }).type ?? e.name;
  const lines = [`[auth][error] ${label(error)}: ${error.message}`];

  let cause: unknown = error.cause;
  for (let depth = 0; cause instanceof Error && depth < 4; depth += 1) {
    lines.push(`[auth][cause] ${label(cause)}: ${cause.message}`);
    cause = cause.cause;
  }

  try {
    const h = await headers();
    lines.push(
      `[auth][request] host=${h.get("host") ?? "?"} ua=${h.get("user-agent") ?? "?"}`,
    );
    // Names only, never values. A missing PKCE cookie is ambiguous on its own:
    // the browser deletes it at Max-Age, so "expired" and "never set" both
    // arrive as absent. The sibling cookies settle it — csrf-token and
    // callback-url have no Max-Age, so if they are here and the verifier is
    // not, the verifier was set and then aged out.
    const names = (await cookies())
      .getAll()
      .map((c) => c.name)
      .filter((name) => name.includes("authjs"));
    lines.push(`[auth][cookies] ${names.join(" ") || "none"}`);
  } catch {
    // Outside a request scope (startup, tests) there are no headers to attach;
    // the error itself is the part that matters, so log it without them.
  }

  console.error(lines.join("\n"));
  if (error.stack) console.error(error.stack);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: hasGoogleOAuth ? prismaAdapter : undefined,
  session: {
    strategy: hasGoogleOAuth ? "database" : "jwt",
    maxAge: getSessionMaxAgeSeconds(),
    updateAge: Math.min(300, getSessionMaxAgeSeconds()),
  },
  trustHost: true,
  // Auth.js's built-in error page renders `Configuration` with a hardcoded HTTP 500.
  // The condition behind it is usually user-recoverable — a replayed OAuth callback,
  // or a PKCE cookie past its 15-minute TTL — so route it back to our own sign-in
  // page, where the retry button already lives, instead of a dead-end server error.
  pages: { error: "/auth/signin" },
  logger: {
    error(error) {
      void logAuthError(error);
    },
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
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
      if (full?.id) {
        await claimPendingMemberships(prisma, {
          userId: full.id,
          email: user.email ?? null,
        });
      }
      if (full?.id && full.role === Role.STUDENT) {
        await claimTeacherRosterInvites(prisma, {
          userId: full.id,
          email: user.email ?? null,
        });
      }
      if (full?.id && account?.provider === "google") {
        const pictureUrl = pickOidcProfilePicture(profile);
        await syncUserImageIfChanged(prisma, full.id, pictureUrl);
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

        // Fallback: if no cookie-based context resolved, default to the user's
        // first ACTIVE membership so newly-assigned members see an org in the nav
        // without having to pick one manually.
        if (!session.user.activeOrgId) {
          const memberships = await prisma.organizationMembership.findMany({
            where: { userId, status: "ACTIVE" },
            orderBy: { createdAt: "asc" },
            select: { organizationId: true, schoolId: true, orgRole: true },
          });
          const preferred =
            memberships.find((m) => m.orgRole === "OWNER") ??
            memberships.find((m) => m.orgRole === "ORG_ADMIN") ??
            memberships[0];
          if (preferred) {
            session.user.activeOrgId = preferred.organizationId;
            session.user.activeSchoolId = preferred.schoolId;
            session.user.orgRole = preferred.orgRole;
          }
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

