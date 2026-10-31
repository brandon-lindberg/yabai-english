import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET } from "@/app/api/integrations/google/connect/route";
import { ALL_GOOGLE_SCOPES } from "@/lib/google/integration";
import { readGoogleConnectState } from "@/lib/google/connect-state";

describe("GET /api/integrations/google/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTH_GOOGLE_ID", "test-google-id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "test-google-secret");
    vi.stubEnv("AUTH_SECRET", "test-only-connect-state-secret");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
  });

  test("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/integrations/google/connect?feature=calendar"));
    expect(res.status).toBe(401);
  });

  test.each(["ENGLISH", "JAPANESE"])("%s reuses the same Google connection and scopes", async learningLanguage => {
    authMock.mockResolvedValue({ user: { id: "u_1", learningLanguage } });
    const res = await GET(new Request("http://localhost/api/integrations/google/connect"));
    expect(res.status).toBe(307);
    const location = decodeURIComponent(res.headers.get("location") ?? "");
    const target = new URL(res.headers.get("location")!);
    expect(target.searchParams.get("client_id")).toBe("test-google-id");
    const cookie = res.cookies.get("google-connect-state")!;
    expect(await readGoogleConnectState(new Request("http://localhost:3000/api/integrations/google/callback", {
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    }), target.searchParams.get("state")!, "u_1")).toEqual({ userId: "u_1", returnTo: "/dashboard/settings" });
    expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    for (const scope of ALL_GOOGLE_SCOPES) {
      expect(location).toContain(scope);
    }
  });

  test("an older ?feature= link still grants everything", async () => {
    // Deep links from booking recovery prompts and lesson rows predate the
    // single connection and are still in the wild.
    authMock.mockResolvedValue({ user: { id: "u_1" } });
    const res = await GET(
      new Request("http://localhost/api/integrations/google/connect?feature=calendar"),
    );
    expect(res.status).toBe(307);
    const location = decodeURIComponent(res.headers.get("location") ?? "");
    for (const scope of ALL_GOOGLE_SCOPES) {
      expect(location).toContain(scope);
    }
  });

  afterEach(() => vi.unstubAllEnvs());
});
