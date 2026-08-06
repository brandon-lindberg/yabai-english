import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET } from "@/app/api/integrations/google/connect/route";
import { ALL_GOOGLE_SCOPES } from "@/lib/google/integration";

describe("GET /api/integrations/google/connect", () => {
  const oldClientId = process.env.AUTH_GOOGLE_ID;
  const oldClientSecret = process.env.AUTH_GOOGLE_SECRET;
  const oldNextAuthUrl = process.env.NEXTAUTH_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_GOOGLE_ID = "test-google-id";
    process.env.AUTH_GOOGLE_SECRET = "test-google-secret";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  });

  test("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/integrations/google/connect?feature=calendar"));
    expect(res.status).toBe(401);
  });

  test("one connect request asks for every scope", async () => {
    authMock.mockResolvedValue({ user: { id: "u_1" } });
    const res = await GET(new Request("http://localhost/api/integrations/google/connect"));
    expect(res.status).toBe(307);
    const location = decodeURIComponent(res.headers.get("location") ?? "");
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

  afterAll(() => {
    process.env.AUTH_GOOGLE_ID = oldClientId;
    process.env.AUTH_GOOGLE_SECRET = oldClientSecret;
    process.env.NEXTAUTH_URL = oldNextAuthUrl;
  });
});
