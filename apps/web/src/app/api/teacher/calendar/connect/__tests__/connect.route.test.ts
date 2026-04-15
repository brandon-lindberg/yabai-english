import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET } from "@/app/api/teacher/calendar/connect/route";

describe("GET /api/teacher/calendar/connect", () => {
  const oldClientId = process.env.AUTH_GOOGLE_ID;
  const oldClientSecret = process.env.AUTH_GOOGLE_SECRET;
  const oldNextAuthUrl = process.env.NEXTAUTH_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_GOOGLE_ID = "test-google-id";
    process.env.AUTH_GOOGLE_SECRET = "test-google-secret";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  });

  test("rejects non-teacher users", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const res = await GET(new Request("http://localhost/api/teacher/calendar/connect"));
    expect(res.status).toBe(403);
  });

  test("redirects teacher to Google OAuth", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const res = await GET(new Request("http://localhost/api/teacher/calendar/connect"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("https://accounts.google.com/o/oauth2/v2/auth");
  });

  afterAll(() => {
    process.env.AUTH_GOOGLE_ID = oldClientId;
    process.env.AUTH_GOOGLE_SECRET = oldClientSecret;
    process.env.NEXTAUTH_URL = oldNextAuthUrl;
  });
});
