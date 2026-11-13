import "server-only";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isLoginAllowedForAccountStatus } from "@/lib/account-status";
import type { Prisma } from "@/generated/prisma/client";
import { siteSessionCookie } from "@/lib/site-session-cookie";

const DEV_SESSION_PREFIX = "dev-site:";

async function activeSession(where: Prisma.SessionWhereUniqueInput) {
  const session = await prisma.session.findUnique({
    where,
    select: {
      id: true, sessionToken: true, expires: true,
      user: { select: { id: true, accountStatus: true } },
    },
  });
  if (!session || session.expires.getTime() <= Date.now()
    || session.sessionToken.startsWith(DEV_SESSION_PREFIX)
    || !isLoginAllowedForAccountStatus(session.user.accountStatus)) return null;
  return session;
}

export function activeSiteSessionById(id: string) {
  return activeSession({ id });
}

export async function activeSiteSessionFromCookie(request: NextRequest, origin: string) {
  const { name: cookieName } = siteSessionCookie(origin);
  const req = { headers: { cookie: request.headers.get("cookie") ?? "" } };
  const sessionToken = await getToken({ req, cookieName, raw: true });
  return sessionToken ? activeSession({ sessionToken }) : null;
}

