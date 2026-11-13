import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, getTokenMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getTokenMock: vi.fn(),
  prismaMock: {
    googleIntegrationAccount: { findUnique: vi.fn(), upsert: vi.fn() },
    googleIntegrationSettings: { upsert: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/calendar-token", () => ({ encryptIntegrationToken: (token: string) => `encrypted:${token}` }));
vi.mock("googleapis", () => ({
  google: { auth: { OAuth2: class { getToken = getTokenMock; } } },
}));

import { GET as connect } from "@/app/api/integrations/google/connect/route";
import { GET as callback } from "@/app/api/integrations/google/callback/route";
import { GET as teacherConnect } from "@/app/api/teacher/calendar/connect/route";
import { GET as teacherCallback } from "@/app/api/teacher/calendar/callback/route";
import { ALL_GOOGLE_SCOPES } from "@/lib/google/integration";

const origin = "https://app.example.test";
const returnTo = "/en/dashboard/settings?onboardingNext=%2Fen%2Fbook";

async function startConnection() {
  const response = await connect(new Request(`${origin}/api/integrations/google/connect?${new URLSearchParams({ returnTo })}`));
  const state = new URL(response.headers.get("location")!).searchParams.get("state")!;
  const cookie = response.cookies.getAll().find(item => item.name.endsWith("google-connect-state"));
  return { response, state, cookie };
}

function callbackRequest(state: string, cookie?: { name: string; value: string }, extra = { code: "test-code" }) {
  return new Request(`${origin}/api/integrations/google/callback?${new URLSearchParams({ ...extra, state })}`, {
    headers: cookie ? { cookie: `${cookie.name}=${cookie.value}` } : {},
  });
}

function expectNoProviderOrPersistence() {
  expect(getTokenMock).not.toHaveBeenCalled();
  expect(prismaMock.googleIntegrationAccount.findUnique).not.toHaveBeenCalled();
  expect(prismaMock.googleIntegrationAccount.upsert).not.toHaveBeenCalled();
  expect(prismaMock.googleIntegrationSettings.upsert).not.toHaveBeenCalled();
}

function expectCleared(response: Awaited<ReturnType<typeof callback>>) {
  expect(response.cookies.get("__Host-google-connect-state")).toMatchObject({ value: "", maxAge: 0 });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
}

describe("shared Google connection state boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTH_GOOGLE_ID", "test-google-id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "test-google-secret");
    vi.stubEnv("AUTH_SECRET", "test-only-state-secret");
    vi.stubEnv("NEXTAUTH_URL", origin);
    authMock.mockResolvedValue({ user: { id: "owner", learningLanguage: "JAPANESE" } });
    getTokenMock.mockResolvedValue({ tokens: { access_token: "access", scope: ALL_GOOGLE_SCOPES.join(" ") } });
    prismaMock.googleIntegrationAccount.findUnique.mockResolvedValue({ refreshToken: "existing-refresh" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test.each(["ENGLISH", "JAPANESE"])("%s connects only the initiating account and consumes its browser cookie", async learningLanguage => {
    authMock.mockResolvedValue({ user: { id: "owner", learningLanguage } });
    const { state, cookie } = await startConnection();
    const response = await callback(callbackRequest(state, cookie));

    expect(response.headers.get("location")).toBe(`${origin}${returnTo}&google=connected`);
    expect(getTokenMock).toHaveBeenCalledWith("test-code");
    expect(prismaMock.googleIntegrationAccount.findUnique).toHaveBeenCalledWith({ where: { userId: "owner" } });
    expect(prismaMock.googleIntegrationAccount.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "owner" },
      create: expect.objectContaining({ userId: "owner", accessToken: "encrypted:access", refreshToken: "existing-refresh" }),
      update: expect.objectContaining({ accessToken: "encrypted:access", refreshToken: "existing-refresh" }),
    }));
    expect(prismaMock.googleIntegrationSettings.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "owner" },
      create: expect.objectContaining({ calendarConnected: true, driveConnected: true, meetConnected: true }),
    }));
    expectCleared(response);
  });

  test("uses unpredictable state and an encrypted host-only browser cookie", async () => {
    const first = await startConnection();
    const second = await startConnection();
    expect(first.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second.state).not.toBe(first.state);
    expect(first.cookie).toMatchObject({
      name: "__Host-google-connect-state", httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600,
    });
    expect(first.cookie?.domain).toBeUndefined();
    expect(first.cookie?.value).not.toContain("owner");
    expect(first.cookie?.value).not.toBe(first.state);
    expect(first.response.headers.get("cache-control")).toBe("no-store");
  });

  test("rejects a forged legacy state targeting another user before token exchange", async () => {
    const state = Buffer.from("victim:/en/dashboard/settings").toString("base64url");
    const response = await callback(callbackRequest(state));
    expect(response.headers.get("location")).toBe(`${origin}/dashboard/settings?google=invalid_state`);
    expectNoProviderOrPersistence();
    expectCleared(response);
  });

  test.each(["missing cookie", "different state", "different browser", "changed cookie", "different signed-in user", "expired state"])("rejects %s before token exchange", async scenario => {
    if (scenario === "expired state") vi.useFakeTimers({ toFake: ["Date"] });
    const pending = await startConnection();
    let state = pending.state;
    let cookie = pending.cookie;
    if (scenario === "missing cookie") cookie = undefined;
    if (scenario === "different state") state = "A".repeat(43);
    if (scenario === "different browser") cookie = (await startConnection()).cookie;
    if (scenario === "changed cookie" && cookie) cookie = { ...cookie, value: `${cookie.value.slice(0, -8)}tampered` };
    if (scenario === "different signed-in user") authMock.mockResolvedValue({ user: { id: "other-user" } });
    if (scenario === "expired state") vi.setSystemTime(Date.now() + 601_000);

    const response = await callback(callbackRequest(state, cookie));
    expect(response.headers.get("location")).toBe(`${origin}/dashboard/settings?google=invalid_state`);
    expectNoProviderOrPersistence();
    expectCleared(response);
  });

  test("a denied consent clears state without exchanging a code", async () => {
    const { state, cookie } = await startConnection();
    const response = await callback(new Request(`${origin}/api/integrations/google/callback?${new URLSearchParams({ state, error: "access_denied" })}`, {
      headers: cookie ? { cookie: `${cookie.name}=${cookie.value}` } : {},
    }));
    expect(response.headers.get("location")).toBe(`${origin}${returnTo}&google=failed`);
    expectNoProviderOrPersistence();
    expectCleared(response);
  });

  test("an expired login clears state and requires sign-in", async () => {
    const { state, cookie } = await startConnection();
    authMock.mockResolvedValue(null);
    const response = await callback(callbackRequest(state, cookie));
    expect(response.headers.get("location")).toBe(`${origin}/auth/signin`);
    expectNoProviderOrPersistence();
    expectCleared(response);
  });

  test("a provider failure clears state without writing an account", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { state, cookie } = await startConnection();
    getTokenMock.mockRejectedValueOnce(new Error("test provider failure"));
    const response = await callback(callbackRequest(state, cookie));
    expect(response.headers.get("location")).toBe(`${origin}${returnTo}&google=failed`);
    expect(prismaMock.googleIntegrationAccount.upsert).not.toHaveBeenCalled();
    expect(prismaMock.googleIntegrationSettings.upsert).not.toHaveBeenCalled();
    expectCleared(response);
  });

  test("connect fails closed when the existing session secret is absent", async () => {
    vi.stubEnv("AUTH_SECRET", undefined);
    vi.stubEnv("NEXTAUTH_SECRET", undefined);
    const response = await connect(new Request(`${origin}/api/integrations/google/connect`));
    expect(response.headers.get("location")).toBe(`${origin}/dashboard/settings?google=misconfigured`);
    expectNoProviderOrPersistence();
  });

  test("also accepts the existing legacy NEXTAUTH_SECRET configuration", async () => {
    vi.stubEnv("AUTH_SECRET", undefined);
    vi.stubEnv("NEXTAUTH_SECRET", "test-only-legacy-secret");
    const { state, cookie } = await startConnection();
    const response = await callback(callbackRequest(state, cookie));
    expect(response.headers.get("location")).toContain("google=connected");
    expectCleared(response);
  });

  test.each(["ENGLISH", "JAPANESE"])("the legacy %s teacher entry points use the same protected connection", async learningLanguage => {
    authMock.mockResolvedValue({ user: { id: "owner", role: "TEACHER", learningLanguage } });
    const pending = await teacherConnect(new Request(`${origin}/api/teacher/calendar/connect`));
    const state = new URL(pending.headers.get("location")!).searchParams.get("state")!;
    const cookie = pending.cookies.getAll().find(item => item.name.endsWith("google-connect-state"));
    const response = await teacherCallback(callbackRequest(state, cookie));
    expect(response.headers.get("location")).toBe(`${origin}/dashboard/settings?google=connected`);
    expect(prismaMock.googleIntegrationAccount.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner" } }));
    expectCleared(response);
  });

  test("the legacy teacher callback rejects forged state before token exchange", async () => {
    authMock.mockResolvedValue({ user: { id: "owner", role: "TEACHER" } });
    const response = await teacherCallback(callbackRequest(Buffer.from("victim:/dashboard/settings").toString("base64url")));
    expect(response.headers.get("location")).toBe(`${origin}/dashboard/settings?google=invalid_state`);
    expectNoProviderOrPersistence();
    expectCleared(response);
  });

  test("the legacy teacher callback preserves its role guard and clears pending state", async () => {
    const { state, cookie } = await startConnection();
    authMock.mockResolvedValue({ user: { id: "owner", role: "STUDENT" } });
    const response = await teacherCallback(callbackRequest(state, cookie));
    expect(response.headers.get("location")).toBe(`${origin}/dashboard?calendar=forbidden`);
    expectNoProviderOrPersistence();
    expectCleared(response);
  });
});
