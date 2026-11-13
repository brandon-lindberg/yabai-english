import { beforeEach, expect, test, vi } from "vitest";
const { authMock, updateMock, profileMock, store } = vi.hoisted(() => ({
  authMock: vi.fn(), updateMock: vi.fn(), profileMock: vi.fn(),
  store: { get: vi.fn(), delete: vi.fn(), set: vi.fn() },
}));
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { update: updateMock }, studentProfile: { findUnique: profileMock } } }));
vi.mock("next/headers", () => ({ cookies: async () => store }));
import { GET } from "../route";
const nonce = "87a7e355-b05c-46bb-a0ac-5df497b29fbd";
const cookieName = `learning-signin-${nonce}`;
function intent(overrides: Record<string, unknown> = {}) {
  return { learningLanguage: "JAPANESE", locale: "en", callbackUrl: "/en/book", expiresAt: Date.now() + 60_000, ...overrides };
}
const request = () => new Request(`http://localhost/api/auth/learning-journey?intent=${nonce}&learningLanguage=ENGLISH`);
beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "student", role: "STUDENT", learningLanguage: "ENGLISH" } });
  store.get.mockImplementation((name) => name === cookieName ? { value: JSON.stringify(intent()) } : { value: "ENGLISH" });
  profileMock.mockResolvedValue({ onboardingCompletedAt: new Date() });
});

test("the nonce-bound Japanese intent wins over a different tab cookie, URL, or pre-login session", async () => {
  const response = await GET(request());
  expect(updateMock).toHaveBeenCalledWith({ where: { id: "student" }, data: { learningLanguage: "JAPANESE" } });
  expect(store.delete).toHaveBeenCalledWith(cookieName);
  expect(response.headers.get("location")).toBe("http://localhost/en/book");
});
test("first-time students reach onboarding after their selected subject is saved", async () => {
  profileMock.mockResolvedValue(null);
  expect((await GET(request())).headers.get("location")).toBe("http://localhost/en/onboarding");
  expect(updateMock).toHaveBeenCalledTimes(1);
});
test.each([null, intent({ expiresAt: Date.now() - 1000 }), { learningLanguage: "ja" }])("missing, expired, or invalid intent cannot change an account", async (value) => {
  store.get.mockReturnValue(value ? { value: JSON.stringify(value) } : undefined);
  const response = await GET(request());
  expect(response.headers.get("location")).toContain("/auth/error?error=JourneyExpired");
  expect(updateMock).not.toHaveBeenCalled();
});
test("callback validation also runs when consuming a cookie", async () => {
  store.get.mockReturnValue({ value: JSON.stringify(intent({ callbackUrl: "https://evil.test" })) });
  expect((await GET(request())).headers.get("location")).toBe("http://localhost/en/book");
});
test("a teacher signing in cannot be silently converted to a student or a new subject", async () => {
  authMock.mockResolvedValue({ user: { id: "teacher", role: "TEACHER" } });
  expect((await GET(request())).headers.get("location")).toBe("http://localhost/en/dashboard");
  expect(updateMock).not.toHaveBeenCalled();
});
