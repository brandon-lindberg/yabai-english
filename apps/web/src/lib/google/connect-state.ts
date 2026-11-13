import "server-only";
import { randomBytes } from "node:crypto";
import { encode, decode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const cookieName = "google-connect-state";
const maxAge = 10 * 60;
const statePattern = /^[A-Za-z0-9_-]{43}$/;
const payloadSchema = z.object({
  state: z.string().regex(statePattern),
  userId: z.string().min(1),
  returnTo: z.string().min(1),
  exp: z.number().int().positive(),
});

function sessionSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
}

function browserCookie(req: Request) {
  const secure = process.env.NODE_ENV === "production" || new URL(req.url).protocol === "https:";
  return {
    name: secure ? `__Host-${cookieName}` : cookieName,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** The URL carries only a nonce; Auth.js protects the owner/return path in the browser cookie. */
export async function createGoogleConnectState(owner: { userId: string; returnTo: string }) {
  const secret = sessionSecret();
  if (!secret) return null;
  const state = randomBytes(32).toString("base64url");
  const cookie = await encode({ token: { ...owner, state }, secret, salt: cookieName, maxAge });
  return { state, cookie };
}

/** Validate before exchanging any authorization code or selecting a persistence owner. */
export async function readGoogleConnectState(req: Request, state: string, userId: string) {
  const secret = sessionSecret();
  const cookie = new NextRequest(req).cookies.get(browserCookie(req).name)?.value;
  if (!secret || !cookie || !statePattern.test(state)) return null;
  try {
    const decoded = await decode({ token: cookie, secret, salt: cookieName });
    const parsed = payloadSchema.safeParse(decoded);
    if (!parsed.success) return null;
    const payload = parsed.data;
    if (payload.exp * 1000 <= Date.now() || payload.state !== state || payload.userId !== userId) return null;
    return { userId, returnTo: payload.returnTo };
  } catch {
    return null;
  }
}

/** The callback clears pending state on every exit, including denial and expired login. */
export function googleConnectRedirect(req: Request, target: URL, pending?: { cookie: string }) {
  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set({
    ...browserCookie(req),
    value: pending?.cookie ?? "",
    maxAge: pending ? maxAge : 0,
  });
  return response;
}
