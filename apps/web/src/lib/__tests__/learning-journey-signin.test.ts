import { beforeEach, expect, test, vi } from "vitest";
const { store } = vi.hoisted(() => ({ store: { set: vi.fn() } }));
vi.mock("next/headers", () => ({ cookies: async () => store }));
vi.mock("@/auth", () => ({ auth: async () => null }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { prepareLearningSignIn } from "../learning-journey-actions";

beforeEach(() => vi.clearAllMocks());

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
