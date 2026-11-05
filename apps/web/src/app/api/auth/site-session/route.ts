import { createHash, randomBytes } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { configuredLearningSites, learningSiteForHost } from "@/lib/learning-sites";
import {
  otherLearningSite, SITE_SESSION_FLOWS, siteSessionHref, siteSessionReturnPath, siteSessionSignInFallback,
} from "@/lib/site-session-path";
import { activeSiteSessionById, activeSiteSessionFromCookie } from "@/lib/site-session";
import { siteSessionCookie } from "@/lib/site-session-cookie";

const GRANT_PREFIX = "learning-site-session:";
const HANDOFF_SECONDS = 60;
const handoffHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const nonce = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const flow = z.enum(SITE_SESSION_FLOWS);
const locale = z.enum(["ja", "en"]);
const stateSchema = z.object({
  verifier: nonce,
  flow,
  locale,
  returnTo: z.string(),
  expiresAt: z.number(),
});

function redirectTo(url: URL) {
  return NextResponse.redirect(url, { status: 303, headers: handoffHeaders });
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function grantKey(code: string, challenge: string, source: string, destination: string) {
  return digest(JSON.stringify([code, challenge, source, destination]));
}

function readState(raw?: string) {
  try { return stateSchema.parse(JSON.parse(raw ?? "null")); } catch { return null; }
}

export async function GET(request: NextRequest) {
  const sites = configuredLearningSites();
  const site = sites && learningSiteForHost(request.headers.get("host") ?? "", sites);
  if (!sites || !site?.learningLanguage) return new NextResponse(null, { status: 404 });
  // A client-router fetch falls back to document navigation on a non-RSC response.
  // Let the document request carry the browser's first-party session cookies.
  const fetchDestination = request.headers.get("sec-fetch-dest");
  if (request.method !== "GET" || request.headers.has("rsc") || (fetchDestination && fetchDestination !== "document")
    || request.headers.get("sec-purpose")?.includes("prefetch") || request.headers.get("purpose") === "prefetch") {
    return new NextResponse(null, { status: 204, headers: handoffHeaders });
  }

  const other = otherLearningSite(sites, site);
  const query = request.nextUrl.searchParams;
  const step = query.get("step") ?? "start";
  const localCookie = siteSessionCookie(site.origin);
  const stateCookie = (challenge: string) => `${localCookie.options.secure ? "__Host-" : ""}learning-site-session-${challenge}`;

  if (step === "start") {
    const selectedFlow = flow.safeParse(query.get("flow"));
    if (!selectedFlow.success) return new NextResponse(null, { status: 400 });
    const language = locale.safeParse(query.get("locale"));
    const uiLocale = language.success ? language.data : "ja";
    const returnTo = siteSessionReturnPath(selectedFlow.data, uiLocale, query.get("returnTo"));
    if (selectedFlow.data !== "after-signin" && await activeSiteSessionFromCookie(request, site.origin)) {
      return redirectTo(new URL(returnTo, site.origin));
    }
    const verifier = randomBytes(32).toString("base64url");
    const challenge = digest(verifier);
    const response = redirectTo(siteSessionHref(other.origin, { step: "authorize", challenge }));
    response.cookies.set(stateCookie(challenge), JSON.stringify({
      verifier, flow: selectedFlow.data, locale: uiLocale, returnTo,
      expiresAt: Date.now() + HANDOFF_SECONDS * 1000,
    }), { ...localCookie.options, maxAge: HANDOFF_SECONDS });
    return response;
  }

  const challenge = nonce.safeParse(query.get("challenge"));
  if (!challenge.success) return new NextResponse(null, { status: 400 });

  if (step === "authorize") {
    const session = await activeSiteSessionFromCookie(request, site.origin);
    const complete = { step: "complete", challenge: challenge.data };
    if (!session) return redirectTo(siteSessionHref(other.origin, complete));
    const code = randomBytes(32).toString("base64url");
    const now = new Date();
    // Use the existing expiring, unique verification-token store. The record
    // points to a session ID, keeping the actual session credential out of it.
    await prisma.verificationToken.deleteMany({ where: { identifier: { startsWith: GRANT_PREFIX }, expires: { lte: now } } });
    await prisma.verificationToken.create({ data: {
      identifier: `${GRANT_PREFIX}${session.id}`,
      token: grantKey(code, challenge.data, site.origin, other.origin),
      expires: new Date(Math.min(session.expires.getTime(), now.getTime() + HANDOFF_SECONDS * 1000)),
    } });
    return redirectTo(siteSessionHref(other.origin, { ...complete, code }));
  }

  if (step !== "complete") return new NextResponse(null, { status: 400 });
  const stateName = stateCookie(challenge.data);
  const state = readState(request.cookies.get(stateName)?.value);
  if (!state || state.expiresAt <= Date.now() || digest(state.verifier) !== challenge.data) {
    return redirectTo(new URL(siteSessionSignInFallback("ja", "/dashboard"), site.origin));
  }

  const returnTo = siteSessionReturnPath(state.flow, state.locale, state.returnTo);
  const success = new URL(returnTo, state.flow === "after-signin" ? other.origin : site.origin);
  const fallback = state.flow === "signin" ? new URL(siteSessionSignInFallback(state.locale, returnTo), site.origin) : success;
  const finish = (url: URL) => {
    const response = redirectTo(url);
    response.cookies.set(stateName, "", { ...localCookie.options, maxAge: 0 });
    return response;
  };
  const existing = await activeSiteSessionFromCookie(request, site.origin);
  const code = nonce.safeParse(query.get("code"));
  if (!code.success) return finish(existing ? success : fallback);

  // DELETE with its expiry predicate claims the code in one database operation.
  const claimed = await prisma.verificationToken.delete({
    where: {
      token: grantKey(code.data, challenge.data, other.origin, site.origin),
      identifier: { startsWith: GRANT_PREFIX },
      expires: { gt: new Date() },
    },
    select: { identifier: true },
  }).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") return null;
    throw error;
  });
  const session = claimed && await activeSiteSessionById(claimed.identifier.slice(GRANT_PREFIX.length));
  if (!session) return finish(existing ? success : fallback);
  if (existing && (existing.id === session.id || existing.user.id !== session.user.id)) return finish(success);
  const response = finish(success);
  response.cookies.set(localCookie.name, session.sessionToken, { ...localCookie.options, expires: session.expires });
  return response;
}
