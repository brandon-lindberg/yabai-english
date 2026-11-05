import "server-only";
import { randomUUID } from "node:crypto";
import { encode, getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthMode } from "@/lib/auth-mode";
import { isLoginAllowedForAccountStatus } from "@/lib/account-status";
import { getSessionMaxAgeSeconds } from "@/lib/session-timeout";
import type { Prisma } from "@/generated/prisma/client";

const DEV_SESSION_PREFIX = "dev-site:";

export function siteSessionCookie(origin: string) {
  const secure = new URL(origin).protocol === "https:";
  return {
    name: `${secure ? "__Secure-" : ""}authjs.session-token`,
    options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure },
  };
}

async function activeSession(where: Prisma.SessionWhereUniqueInput, devEmailSignIn: boolean) {
  const session = await prisma.session.findUnique({
    where,
    select: {
      id: true, sessionToken: true, expires: true,
      user: { select: { id: true, accountStatus: true } },
    },
  });
  if (!session || session.expires.getTime() <= Date.now()
    || session.sessionToken.startsWith(DEV_SESSION_PREFIX) !== devEmailSignIn
    || !isLoginAllowedForAccountStatus(session.user.accountStatus)) return null;
  return session;
}

export function activeSiteSessionById(id: string) {
  return activeSession({ id }, getAuthMode().devEmailSignIn);
}

const devAuthSecret = () => process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export async function activeSiteSessionFromCookie(request: NextRequest, origin: string) {
  const { name: cookieName } = siteSessionCookie(origin);
  const req = { headers: { cookie: request.headers.get("cookie") ?? "" } };
  if (getAuthMode().devEmailSignIn) {
    const secret = devAuthSecret();
    if (!secret) return null;
    const token = await getToken({ req, cookieName, secret });
    if (typeof token?.siteSessionId !== "string" || !token.sub) return null;
    return activeSession({ id: token.siteSessionId, userId: token.sub }, true);
  }
  const sessionToken = await getToken({ req, cookieName, raw: true });
  return sessionToken ? activeSession({ sessionToken }, false) : null;
}

export async function siteSessionCookieValue(session: NonNullable<Awaited<ReturnType<typeof activeSiteSessionById>>>, origin: string) {
  if (!getAuthMode().devEmailSignIn) return session.sessionToken;
  const secret = devAuthSecret();
  if (!secret) return null;
  return encode({
    secret, salt: siteSessionCookie(origin).name,
    maxAge: Math.ceil((session.expires.getTime() - Date.now()) / 1000),
    token: { sub: session.user.id, siteSessionId: session.id },
  });
}

// Credentials uses JWTs in development. A backing row gives both sites a shared
// revocation point. Its credential never leaves the database-backed server flow.
export async function createDevSiteSession(userId: string) {
  const { id } = await prisma.session.create({
    data: {
      userId, sessionToken: `${DEV_SESSION_PREFIX}${randomUUID()}`,
      expires: new Date(Date.now() + getSessionMaxAgeSeconds() * 1000),
    },
    select: { id: true },
  });
  return id;
}

export async function refreshDevSiteSession(id: string, userId: string) {
  const now = Date.now();
  const { count } = await prisma.session.updateMany({
    where: { id, userId, sessionToken: { startsWith: DEV_SESSION_PREFIX }, expires: { gt: new Date(now) } },
    data: { expires: new Date(now + getSessionMaxAgeSeconds() * 1000) },
  });
  return count === 1;
}

export async function revokeDevSiteSession(id: string) {
  await prisma.session.deleteMany({ where: { id, sessionToken: { startsWith: DEV_SESSION_PREFIX } } });
}

