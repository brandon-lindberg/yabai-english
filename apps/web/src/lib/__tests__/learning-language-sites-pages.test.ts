import { beforeEach, expect, test, vi } from "vitest";
const { site, authMock, iconCookie } = vi.hoisted(() => ({ site: vi.fn(), authMock: vi.fn(), iconCookie: vi.fn() }));
vi.mock("@/lib/learning-site-request", () => ({ getRequestLearningSite: site }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: iconCookie }) }));
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en", getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ Link: () => null, redirect: vi.fn() }));
beforeEach(() => { authMock.mockResolvedValue(null); iconCookie.mockReset(); });
test.each(["ENGLISH", "JAPANESE"])("%s domain root serves its own landing without a language chooser", async (learningLanguage) => {
  site.mockResolvedValue({ learningLanguage });
  const { default: Home } = await import("@/app/[locale]/page");
  const result = await Home();
  expect(result.props).toMatchObject({ learningLanguage });
});

test.each([
  ["JAPANESE", "Japanese Studio", undefined, "/app-icons/vermilion/icon-512.png"],
  ["ENGLISH", "English Studio Japan", undefined, "/icon-512.png"],
  ["JAPANESE", "Japanese Studio", "indigo", "/app-icons/indigo/icon-512.png"],
  ["JAPANESE", "Japanese Studio", "invalid", "/app-icons/vermilion/icon-512.png"],
])("%s manifest keeps its identity and serves the correct icon (%s, %s)", async (learningLanguage, brandName, preference, icon) => {
  site.mockResolvedValue({ learningLanguage, brandName });
  if (preference) iconCookie.mockReturnValue({ value: preference });
  const { GET } = await import("@/app/manifest.webmanifest/route");
  const response = await GET();
  expect(response.headers.get("Content-Type")).toBe("application/manifest+json");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toMatchObject({
    id: "/",
    name: brandName,
    start_url: "/",
    icons: expect.arrayContaining([expect.objectContaining({ src: icon, sizes: "512x512" })]),
  });
});
