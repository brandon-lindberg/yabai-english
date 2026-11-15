import { afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/auth", () => { throw new Error("Health must not load auth"); });
vi.mock("@/lib/prisma", () => { throw new Error("Health must not load Prisma"); });
vi.mock("next-intl/middleware", () => ({ default: () => () => new Response("localized") }));
import proxy from "@/proxy";
import { GET } from "@/app/api/health/route";

afterEach(() => vi.unstubAllEnvs());
test("health responds without auth/database and is not cached", async () => {
  const response = GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers.get("cache-control")).toContain("no-store");
});
test("health bypasses domain canonicalization and only that exact path is exempt", () => {
  vi.stubEnv("LEARNING_SITES_ENABLED", "true");
  vi.stubEnv("ENGLISH_SITE_URL", "https://www.englishstudiojapan.com");
  vi.stubEnv("JAPANESE_SITE_URL", "https://japanesestudio.love");
  for (const host of ["englishstudiojapan.com", "internal-render-host.invalid"]) {
    const response = proxy(new NextRequest(`https://${host}/api/health`));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  }
  expect(proxy(new NextRequest("https://internal-render-host.invalid/api/health/private")).status).toBe(421);
});
