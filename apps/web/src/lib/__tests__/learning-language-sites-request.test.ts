import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
const requestHeaders = vi.hoisted(() => ({ value: new Headers(), reads: 0 }));
vi.mock("next/headers", () => ({ headers: async () => { requestHeaders.reads++; return requestHeaders.value; } }));
vi.mock("next-intl/middleware", () => ({ default: () => () => new Response("localized") }));
import proxy from "@/proxy";
import { learningLanguageForRequest } from "../learning-site-request";
import { publicAppOrigin } from "../learning-sites";

beforeEach(() => {
  vi.stubEnv("LEARNING_SITES_ENABLED", "true");
  vi.stubEnv("ENGLISH_SITE_URL", "https://englishstudiojapan.com");
  vi.stubEnv("JAPANESE_SITE_URL", "https://japanesestudio.love");
  vi.stubEnv("NEUTRAL_SITE_URL", "https://studio.example");
  requestHeaders.value = new Headers({ host: "japanesestudio.love" }); requestHeaders.reads = 0;
});
afterEach(() => vi.unstubAllEnvs());
test("domain wins over a saved preference without changing the saved value", async () => {
  const account = { learningLanguage: "ENGLISH" };
  expect(await learningLanguageForRequest(account.learningLanguage)).toBe("JAPANESE");
  expect(account.learningLanguage).toBe("ENGLISH");
  requestHeaders.value.set("host", "englishstudiojapan.com");
  expect(await learningLanguageForRequest("JAPANESE")).toBe("ENGLISH");
  requestHeaders.value.set("host", "studio.example");
  expect(await learningLanguageForRequest("JAPANESE")).toBe("JAPANESE");
});
test("disabled mode preserves old behavior without requiring a request", async () => {
  vi.stubEnv("LEARNING_SITES_ENABLED", "false");
  expect(await learningLanguageForRequest("JAPANESE")).toBe("JAPANESE");
  expect(requestHeaders.reads).toBe(0);
});
test("provider return URLs use the allowlisted current origin instead of the old global base", () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://englishstudiojapan.com");
  expect(publicAppOrigin(new Request("https://japanesestudio.love/book"))).toBe("https://japanesestudio.love");
  expect(() => publicAppOrigin(new Request("https://attacker.example/book"))).toThrow();
});
test("proxy moves a bookmarked wrong-language page to the correct domain", () => {
  const response = proxy(new NextRequest("https://englishstudiojapan.com/en/japanese-placement?from=saved"));
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("https://japanesestudio.love/en/japanese-placement?from=saved");
});
test("proxy rejects wrong-domain API mutations and unknown hosts without redirecting a POST", () => {
  const response = proxy(new NextRequest("https://englishstudiojapan.com/api/japanese-study/queue", { method: "POST" }));
  expect(response.status).toBe(403);
  expect(response.headers.get("location")).toBeNull();
  expect(proxy(new NextRequest("https://attacker.example/en/dashboard")).status).toBe(421);
});

test("a student cannot act on an English booking through the Japanese site; shared teacher operations remain available", async () => {
  const { bookingLearningSiteResponse } = await import("../booking-learning-site");
  expect((await bookingLearningSiteResponse({ learningLanguage: "ENGLISH" }, "STUDENT"))?.status).toBe(403);
  expect(await bookingLearningSiteResponse({ learningLanguage: "JAPANESE" }, "STUDENT")).toBeNull();
  expect(await bookingLearningSiteResponse({ learningLanguage: "ENGLISH" }, "TEACHER")).toBeNull();
});

test("Next.js loopback normalization never redirects an already canonical local domain to itself", () => {
  vi.stubEnv("ENGLISH_SITE_URL", "http://englishstudiojapan.localhost:3100");
  vi.stubEnv("JAPANESE_SITE_URL", "http://japanesestudio.localhost:3100");
  vi.stubEnv("NEUTRAL_SITE_URL", "http://localhost:3100");
  const request = new NextRequest("http://localhost:3100/en", { headers: { host: "japanesestudio.localhost:3100" } });
  expect(proxy(request).headers.get("location")).toBeNull();
});

test("auth cannot be steered by a conflicting forwarded host", () => {
  expect(proxy(new NextRequest("https://japanesestudio.love/api/auth/session", { headers: { host: "japanesestudio.love", "x-forwarded-host": "evil.example" } })).status).toBe(421);
});

test("neutral hub forwards subject pages and blocks subject API mutations", () => {
  const page = proxy(new NextRequest("https://studio.example/en/japanese-placement"));
  expect(page.headers.get("location")).toBe("https://japanesestudio.love/en/japanese-placement");
  expect(proxy(new NextRequest("https://studio.example/api/japanese-placement", { method: "POST" })).status).toBe(403);
});
