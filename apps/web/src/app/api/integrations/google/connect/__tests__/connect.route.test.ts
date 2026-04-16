import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET } from "@/app/api/integrations/google/connect/route";

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

  test("redirects to OAuth with selected feature scopes", async () => {
    authMock.mockResolvedValue({ user: { id: "u_1" } });
    const res = await GET(new Request("http://localhost/api/integrations/google/connect?feature=drive"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(decodeURIComponent(location)).toContain("https://www.googleapis.com/auth/drive.file");
  });

  afterAll(() => {
    process.env.AUTH_GOOGLE_ID = oldClientId;
    process.env.AUTH_GOOGLE_SECRET = oldClientSecret;
    process.env.NEXTAUTH_URL = oldNextAuthUrl;
  });
});
