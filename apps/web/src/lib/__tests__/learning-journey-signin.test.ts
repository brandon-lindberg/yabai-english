import { afterEach, beforeEach, expect, test, vi } from "vitest";
const { store, signIn } = vi.hoisted(() => ({ store: { set: vi.fn() }, signIn: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => store }));
vi.mock("@/auth", () => ({ auth: async () => null, signIn }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/navigation", () => ({ redirect: (destination: string) => { throw new Error(`REDIRECT:${destination}`); } }));
vi.mock("@/i18n/navigation", () => ({ redirect: vi.fn() }));
import { prepareLearningSignIn } from "../learning-sign-in";
import { startGoogleSignIn } from "../learning-journey-actions";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

test("each sign-in has its own intent cookie, independent of another tab or UI locale", async () => {
  const japanese = await prepareLearningSignIn({ learningLanguage: "JAPANESE", locale: "ja", callbackUrl: "/book" });
  const english = await prepareLearningSignIn({ learningLanguage: "ENGLISH", locale: "en", callbackUrl: "/dashboard" });
  expect(japanese).not.toBe(english);
  const intentWrites = store.set.mock.calls.filter(([name]) => name.startsWith("learning-signin-"));
  expect(intentWrites).toHaveLength(2);
  expect(JSON.parse(intentWrites[0][1])).toEqual({ learningLanguage: "JAPANESE", locale: "ja", callbackUrl: "/book", expiresAt: expect.any(Number) });
  expect(intentWrites[0][2]).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 1800 });
  expect(new URL(japanese, "http://localhost").searchParams.get("intent")).toBe(intentWrites[0][0].replace("learning-signin-", ""));
});

test("an external callback cannot travel through the OAuth bridge", async () => {
  await prepareLearningSignIn({ learningLanguage: "JAPANESE", locale: "en", callbackUrl: "https://evil.test" });
  const [, value] = store.set.mock.calls.find(([name]) => name.startsWith("learning-signin-"))!;
  expect(JSON.parse(value).callbackUrl).toBe("/en/book");
});

test("confirming the Google button stores the learning intent and starts only Google", async () => {
  vi.stubEnv("AUTH_GOOGLE_ID", "test-client");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "test-secret");
  const google = "https://accounts.google.com/o/oauth2/v2/auth?response_type=code";
  signIn.mockResolvedValue(google);
  await expect(startGoogleSignIn({ learningLanguage: "JAPANESE", locale: "en", callbackUrl: "/en/dashboard/schedule" })).rejects.toThrow(`REDIRECT:${google}`);
  const [name, value] = store.set.mock.calls.find(([cookie]) => cookie.startsWith("learning-signin-"))!;
  expect(JSON.parse(value)).toMatchObject({ learningLanguage: "JAPANESE", callbackUrl: "/en/dashboard/schedule" });
  expect(signIn).toHaveBeenCalledWith("google", { redirect: false, redirectTo: `/api/auth/learning-journey?intent=${name.replace("learning-signin-", "")}` });
});
