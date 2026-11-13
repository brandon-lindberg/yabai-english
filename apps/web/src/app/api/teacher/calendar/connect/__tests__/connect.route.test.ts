import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET } from "@/app/api/teacher/calendar/connect/route";

describe("GET /api/teacher/calendar/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTH_GOOGLE_ID", "test-google-id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "test-google-secret");
    vi.stubEnv("AUTH_SECRET", "test-only-teacher-connect-secret");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
  });

  test("rejects non-teacher users", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } });
    const res = await GET(new Request("http://localhost/api/teacher/calendar/connect"));
    expect(res.status).toBe(403);
  });

  test("redirects teacher to Google OAuth", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const res = await GET(new Request("http://localhost/api/teacher/calendar/connect"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("https://accounts.google.com/o/oauth2/v2/auth");
  });

  afterEach(() => vi.unstubAllEnvs());
});
