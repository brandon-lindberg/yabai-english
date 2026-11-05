import { NextRequest, type NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const db = vi.hoisted(() => ({
  session: { findUnique: vi.fn() },
  verificationToken: { create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const english = "https://englishstudiojapan.com";
const japanese = "https://japanesestudio.love";
const endpoint = "/api/auth/site-session";
const sessionCookie = "__Secure-authjs.session-token";
const originalSession = {
  id: "source-session", sessionToken: "original-session-credential",
  expires: new Date("2030-01-01"), user: { id: "learner", accountStatus: "ACTIVE" },
};
let grant: { identifier: string; token: string; expires: Date } | undefined;

function visit(url: string, cookie?: string) {
  const headers = new Headers({ host: new URL(url).host });
  if (cookie) headers.set("cookie", cookie);
  return GET(new NextRequest(url, { headers }));
}

function location(response: NextResponse) {
  expect(response.status).toBe(303);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  return response.headers.get("location")!;
}

async function startHandoff(query = "flow=signin&locale=en&returnTo=/en/dashboard/schedule") {
  const started = await visit(`${japanese}${endpoint}?${query}`);
  expect(new URL(location(started)).origin).toBe(english);
  const [state] = started.cookies.getAll();
  expect(state).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  expect(state.name).toMatch(/^__Host-/);
  return { authorize: location(started), cookie: `${state.name}=${encodeURIComponent(state.value)}` };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("LEARNING_SITES_ENABLED", "true");
  vi.stubEnv("ENGLISH_SITE_URL", english);
  vi.stubEnv("JAPANESE_SITE_URL", japanese);
  vi.stubEnv("NEUTRAL_SITE_URL", "https://lessons.example.com");
  vi.stubEnv("DEV_AUTH_BYPASS", "false");
  grant = undefined;
  db.session.findUnique.mockImplementation(async ({ where }) =>
    where.sessionToken === originalSession.sessionToken || where.id === originalSession.id ? originalSession : null);
  db.verificationToken.create.mockImplementation(async ({ data }) => { grant = data; });
  db.verificationToken.delete.mockImplementation(async ({ where }) => {
    if (grant && where.token === grant.token && grant.expires > where.expires.gt) {
      const claimed = grant;
      grant = undefined;
      return claimed;
    }
    throw Object.assign(new Error("Missing grant"), { code: "P2025" });
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("learning-site sign-in handoff", () => {
  it("shares the existing session with a browser-bound single-use code", async () => {
    const { authorize, cookie } = await startHandoff();
    const issued = await visit(authorize, `${sessionCookie}=${originalSession.sessionToken}`);
    const complete = location(issued);
    expect(new URL(complete).origin).toBe(japanese);
    expect(complete).not.toContain(originalSession.sessionToken);
    expect(JSON.stringify(grant)).not.toContain(originalSession.sessionToken);
    expect((await visit(complete)).cookies.get(sessionCookie)).toBeUndefined();
    expect((await visit(complete.replace(japanese, english), cookie)).cookies.get(sessionCookie)).toBeUndefined();
    const results = await Promise.all([visit(complete, cookie), visit(complete, cookie)]);
    const [accepted] = results.filter(response => response.cookies.has(sessionCookie));
    expect(results.filter(response => response.cookies.has(sessionCookie))).toHaveLength(1);
    expect(location(accepted)).toBe(`${japanese}/en/dashboard/schedule`);
    expect(accepted.cookies.get(sessionCookie)).toMatchObject({
      value: originalSession.sessionToken, expires: originalSession.expires,
      path: "/", httpOnly: true, sameSite: "lax", secure: true,
    });
    expect(accepted.cookies.get(sessionCookie)?.domain).toBeUndefined();
  });

  it.each(["expired code", "revoked session", "inactive account"])("does not issue a session for a %s", async (reason) => {
    const { authorize, cookie } = await startHandoff();
    const complete = location(await visit(authorize, `${sessionCookie}=${originalSession.sessionToken}`));
    if (reason === "expired code") grant!.expires = new Date(0);
    if (reason === "revoked session") db.session.findUnique.mockResolvedValue(null);
    if (reason === "inactive account") db.session.findUnique.mockResolvedValue({ ...originalSession, user: { accountStatus: "HIDDEN" } });
    const response = await visit(complete, cookie);
    expect(response.cookies.get(sessionCookie)).toBeUndefined();
    expect(location(response)).toContain(`${japanese}/en/auth/signin?`);
    expect(new URL(location(response)).searchParams.get("siteSession")).toBe("skip");
  });

  it("falls back to normal sign-in without following an off-site return URL", async () => {
    const { authorize, cookie } = await startHandoff("flow=signin&locale=en&returnTo=//outside.example/dashboard");
    const response = await visit(location(await visit(authorize)), cookie);
    const next = new URL(location(response));
    expect(next.origin).toBe(japanese);
    expect(next.pathname).toBe("/en/auth/signin");
    expect(next.searchParams.get("callbackUrl")).toBe("/en/dashboard");
    expect(next.searchParams.get("siteSession")).toBe("skip");
    expect(db.verificationToken.create).not.toHaveBeenCalled();
  });

  it("returns to the original site after priming the second session", async () => {
    const { authorize, cookie } = await startHandoff("flow=after-signin&locale=en&returnTo=/en/onboarding");
    const response = await visit(location(await visit(authorize, `${sessionCookie}=${originalSession.sessionToken}`)), cookie);
    expect(location(response)).toBe(`${english}/en/onboarding`);
    expect(response.cookies.get(sessionCookie)?.value).toBe(originalSession.sessionToken);
  });

  it("replaces an older destination cookie for the same account after sign-in", async () => {
    const { authorize, cookie } = await startHandoff("flow=after-signin&locale=en&returnTo=/en/dashboard");
    const complete = location(await visit(authorize, `${sessionCookie}=${originalSession.sessionToken}`));
    db.session.findUnique.mockImplementationOnce(async () => ({ ...originalSession, id: "older-session" }));
    const response = await visit(complete, `${cookie}; ${sessionCookie}=older-credential`);
    expect(location(response)).toBe(`${english}/en/dashboard`);
    expect(response.cookies.get(sessionCookie)?.value).toBe(originalSession.sessionToken);
  });

  it("leaves an already signed-in destination session in place", async () => {
    const { authorize, cookie } = await startHandoff();
    const complete = location(await visit(authorize, `${sessionCookie}=${originalSession.sessionToken}`));
    db.session.findUnique.mockImplementationOnce(async () => ({
      ...originalSession, id: "different-session", user: { id: "different-user", accountStatus: "ACTIVE" },
    }));
    const response = await visit(complete, `${cookie}; ${sessionCookie}=different-user-credential`);
    expect(location(response)).toBe(`${japanese}/en/dashboard/schedule`);
    expect(response.cookies.has(sessionCookie)).toBe(false);
  });

  it("only serves the two configured learning sites", async () => {
    expect((await visit(`https://lessons.example.com${endpoint}`)).status).toBe(404);
    expect((await visit(`https://outside.example${endpoint}`)).status).toBe(404);
    vi.stubEnv("LEARNING_SITES_ENABLED", "false");
    expect((await visit(`${english}${endpoint}`)).status).toBe(404);
  });
});
